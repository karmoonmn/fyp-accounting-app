"""Boundary, Edge-Case & Exceptional Condition Test Suite

Covers High-Expectation Enterprise Requirements:
- BND-01: Zero-Byte & Corrupted Document Ingestion (FR-01, FR-02)
- BND-02: Division-by-Zero & Mathematical Boundary Safety in Aggregations (FR-14)
- BND-03: Empty Database Ledger & Zero-Transaction Handling (FR-13, FR-15)
- BND-04: Negative Values (Credit Notes / Refunds) and Outlier Magnitudes (FR-04, FR-05)
- BND-05: Consecutive Repeated Fallbacks & Multi-Turn Stability (FR-17, FR-18)
- BND-06: Partial / Missing Optional Key Fields in Document Extraction (FR-04, FR-05)
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from langchain_core.messages import HumanMessage, AIMessage

from app.models.classification import DocumentExtractionResult, LineItemExtraction
from app.agents.preprocess import preprocess_node, _extract_pdf_text
from app.agents.aggregation_agent import aggregation_agent
from app.agents.out_of_scope import out_of_scope_agent, OUT_OF_SCOPE_RESPONSE
from app.agents.classifier import classification_agent
from app.models.classification import ClassificationResult


# ==============================================================================
# BND-01: Corrupted & Zero-Byte Document Ingestion Tests
# ==============================================================================

class TestCorruptedDocumentIngestion:
    """Verifies the system handles corrupt, empty, and truncated files gracefully."""

    @pytest.mark.asyncio
    @patch("app.agents.preprocess._get_model")
    async def test_zero_byte_image_file_handling(self, mock_get_model):
        """BND-01: Verify 0-byte uploaded file does not crash the server and degrades safely."""
        mock_model = MagicMock()
        mock_raw = MagicMock()
        mock_raw.content = "Unreadable or empty image stream."
        mock_model.ainvoke = AsyncMock(return_value=mock_raw)
        # Mock structured model to fail on empty binary bytes
        mock_structured = MagicMock()
        mock_structured.ainvoke = AsyncMock(side_effect=Exception("Corrupt image header"))
        mock_model.with_structured_output.return_value = mock_structured
        mock_get_model.return_value = mock_model

        state = {
            "input_type": "image",
            "user_input": "Extract this image",
            "file_bytes": b"",  # 0-byte empty file
        }

        result = await preprocess_node(state)

        # Must not raise unhandled exception; must return degraded extraction
        assert "extracted_data" in result
        assert result["user_input"] is not None

    def test_corrupted_pdf_bytes_extraction(self):
        """BND-01: Verify damaged/truncated PDF returns empty string instead of crashing."""
        corrupted_bytes = b"NOT_A_REAL_PDF_DATA_STREAM_JUST_JUNK"
        extracted_text = _extract_pdf_text(corrupted_bytes)
        assert extracted_text == "", "Corrupted PDF should safely return empty string without raising exception."


# ==============================================================================
# BND-02 & BND-03: Mathematical Division by Zero & Empty Database States
# ==============================================================================

class TestFinancialMathAndEmptyDatabaseResilience:
    """Tests zero division prevention and handling of brand new accounts with 0 transactions."""

    @pytest.mark.asyncio
    async def test_empty_database_query_results_handling(self):
        """BND-03: When database returns 0 rows, system must inform user rather than hallucinate."""
        state = {
            "user_input": "What are our total expenses this year?",
            "query_results": [],  # Brand new company with 0 transactions
        }

        result = await aggregation_agent(state)

        assert "couldn't find any data" in result["final_response"].lower()
        assert "No data available" in result["messages"][0].content

    @pytest.mark.asyncio
    @patch("app.agents.aggregation_agent._get_model")
    async def test_growth_rate_with_zero_base_period_revenue(self, mock_get_model):
        """BND-02: Guard against ZeroDivisionError when previous period revenue is $0.00."""
        mock_model = MagicMock()
        mock_resp = MagicMock()
        mock_resp.content = (
            "Current revenue is $15,000.00. Previous period revenue was $0.00 "
            "(growth percentage cannot be calculated due to zero base period revenue)."
        )
        mock_model.ainvoke = AsyncMock(return_value=mock_resp)
        mock_get_model.return_value = mock_model

        state = {
            "user_input": "Calculate YoY revenue growth",
            "query_results": [
                {"period": "2025", "revenue": 0.00},
                {"period": "2026", "revenue": 15000.00}
            ]
        }

        result = await aggregation_agent(state)
        assert "ZeroDivisionError" not in result["final_response"]
        assert "$15,000.00" in result["final_response"]


# ==============================================================================
# BND-04: Negative Values & Extreme Financial Magnitudes
# ==============================================================================

class TestExtremeAndNegativeFinancialValues:
    """Verifies schema handles credit notes (negative amounts) and extreme enterprise figures."""

    def test_credit_note_negative_amount_handling(self):
        """BND-04: Ensure credit notes or refund invoices with negative totals parse successfully."""
        refund_item = LineItemExtraction(
            description="Returned Defective Monitor",
            quantity=1.0,
            unit_price=-250.00,
            amount=-250.00
        )
        credit_note = DocumentExtractionResult(
            document_type="invoice",
            doc_number="CN-2026-001",
            total_amount=-250.00,
            tax_amount=-15.00,
            line_items=[refund_item]
        )

        assert credit_note.total_amount == -250.00
        assert credit_note.line_items[0].amount == -250.00

    def test_extreme_financial_magnitude(self):
        """BND-04: Ensure enterprise multi-million figures don't cause precision overflow."""
        doc = DocumentExtractionResult(
            document_type="invoice",
            doc_number="INV-BIG-CORP",
            total_amount=999_999_999.99,
            tax_amount=59_999_999.99
        )
        assert doc.total_amount == 999999999.99


# ==============================================================================
# BND-05: Consecutive Repeated Fallback Multi-Turn Stability
# ==============================================================================

class TestConsecutiveFallbackLoopStability:
    """Verifies consecutive out-of-scope interactions don't corrupt conversation state."""

    @pytest.mark.asyncio
    @patch("app.agents.classifier._get_model")
    async def test_three_consecutive_fallbacks_then_successful_recovery(self, mock_get_model):
        """BND-05: User submits 3 non-accounting queries consecutively, then successfully creates invoice."""
        # Setup conversation history with 3 fallback turns
        history = [
            HumanMessage(content="What's the weather?"),
            AIMessage(content=OUT_OF_SCOPE_RESPONSE),
            HumanMessage(content="Play some music"),
            AIMessage(content=OUT_OF_SCOPE_RESPONSE),
            HumanMessage(content="Write a poem about dogs"),
            AIMessage(content=OUT_OF_SCOPE_RESPONSE),
            # Final legitimate query
            HumanMessage(content="Create an invoice for $400 for client Acme")
        ]

        mock_model = MagicMock()
        mock_structured = MagicMock()
        mock_res = ClassificationResult(
            intent="INVOICE_PROCESS",
            confidence=0.99,
            reasoning="Valid invoice query after 3 consecutive out-of-scope interactions."
        )
        mock_structured.ainvoke = AsyncMock(return_value=mock_res)
        mock_model.with_structured_output.return_value = mock_structured
        mock_get_model.return_value = mock_model

        state = {
            "messages": history,
            "user_input": "Create an invoice for $400 for client Acme",
            "pending_intent": None
        }

        result = await classification_agent(state)

        assert result["classification"] == "INVOICE_PROCESS"
        assert result["classification_confidence"] > 0.95


# ==============================================================================
# BND-06: Partial & Missing Optional Key Fields in Document Extraction
# ==============================================================================

class TestPartialDocumentFieldsResilience:
    """Ensures documents with unreadable or omitted fields degrade gracefully without crashing."""

    def test_missing_optional_fields_document_extraction(self):
        """BND-06: A receipt with only total amount and no vendor/due date parses validly."""
        minimal_doc = DocumentExtractionResult(
            document_type="receipt",
            total_amount=45.50
            # vendor_name, doc_number, due_date, line_items omitted
        )

        assert minimal_doc.document_type == "receipt"
        assert minimal_doc.total_amount == 45.50
        assert minimal_doc.vendor_name is None
        assert minimal_doc.doc_number is None
        assert minimal_doc.line_items == []

        # Ensure JSON conversion still works flawlessly
        json_data = minimal_doc.model_dump()
        assert json_data["total_amount"] == 45.50
