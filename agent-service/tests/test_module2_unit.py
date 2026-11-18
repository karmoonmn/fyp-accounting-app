"""Unit Tests for Module 2: Input Processing & Classification Module

Requirements Covered:
- FR-07: The system shall accept user inputs in the form of both text and uploaded document images.
- FR-08: The system shall preprocess incoming user inputs by incorporating current conversation context and historical chat memory.
- FR-09: The system shall interpret natural language user queries using an intent classification agent.
- FR-10: The system shall route user requests to appropriate agents such as invoice, expense, or RAG agents.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from langchain_core.messages import HumanMessage, AIMessage

from app.models.classification import ClassificationResult
from app.agents.preprocess import preprocess_node
from app.agents.context_router import context_router
from app.agents.classifier import classification_agent
from app.graph.workflow import route_classification, route_after_context_router


# ==============================================================================
# FR-07: Dual Input Acceptance (Text & Image)
# ==============================================================================

class TestDualInputAcceptance:
    """Tests accepting both text-only and multimodal document image inputs (FR-07)."""

    @pytest.mark.asyncio
    async def test_accept_text_only_input(self):
        """FR-07: Verify text-only input is correctly processed."""
        state = {
            "input_type": "text",
            "user_input": "Show me unpaid customer invoices",
            "file_bytes": None,
        }
        result = await preprocess_node(state)

        assert result["user_input"] == "Show me unpaid customer invoices"
        assert result["extracted_data"] is None
        assert len(result["messages"]) == 1
        assert isinstance(result["messages"][0], HumanMessage)

    @pytest.mark.asyncio
    @patch("app.agents.preprocess._process_image")
    async def test_accept_image_multimodal_input(self, mock_process_image):
        """FR-07: Verify image input with file_bytes is processed multimodally."""
        mock_process_image.return_value = {
            "document_type": "invoice",
            "total_amount": 750.00,
            "vendor_name": "Digital Cloud Inc"
        }

        fake_image = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
        state = {
            "input_type": "image",
            "user_input": "Please process this invoice receipt",
            "file_bytes": fake_image,
        }
        result = await preprocess_node(state)

        assert mock_process_image.called
        assert result["extracted_data"] is not None
        assert result["extracted_data"]["document_type"] == "invoice"
        assert "[Extracted from image:" in result["user_input"]


# ==============================================================================
# FR-08: Context Preprocessing & Historical Memory Integration
# ==============================================================================

class TestContextAndMemoryPreprocessing:
    """Tests preprocessing with conversation context and multi-turn pending state (FR-08)."""

    @pytest.mark.asyncio
    async def test_no_pending_intent_proceeds_to_classifier(self):
        """FR-08: If there is no pending multi-turn task, context router defaults to classifier."""
        state = {
            "pending_intent": None,
            "pending_context": None,
            "messages": [HumanMessage(content="Hello accounting bot")]
        }
        result = await context_router(state)
        # Empty dict means classifier will run normally
        assert result == {}
        assert route_after_context_router(result) == "classifier"

    @pytest.mark.asyncio
    @patch("app.agents.context_router._get_model")
    async def test_multi_turn_continuation_reuses_pending_intent(self, mock_get_model):
        """FR-08: Historical memory continuation preserves pending_intent (e.g. creating invoice)."""
        mock_model = MagicMock()
        mock_response = MagicMock()
        mock_response.content = "CONTINUE"
        mock_model.ainvoke = AsyncMock(return_value=mock_response)
        mock_get_model.return_value = mock_model

        state = {
            "pending_intent": "INVOICE_PROCESS",
            "pending_context": {"doc_number": "INV-1001"},
            "messages": [
                HumanMessage(content="Create an invoice"),
                AIMessage(content="Who is the customer?"),
                HumanMessage(content="Acme Corporation")
            ],
            "user_input": "Acme Corporation"
        }
        result = await context_router(state)

        assert result.get("classification") == "INVOICE_PROCESS"
        assert route_after_context_router(result) == "route_to_agent"


# ==============================================================================
# FR-09: Intent Classification Agent
# ==============================================================================

class TestIntentClassificationAgent:
    """Tests natural language intent interpretation using Gemini structured output (FR-09)."""

    @pytest.mark.asyncio
    @patch("app.agents.classifier._get_model")
    async def test_classify_invoice_process_intent(self, mock_get_model):
        """FR-09: Classify user query for invoice management."""
        mock_model = MagicMock()
        mock_structured = MagicMock()
        mock_result = ClassificationResult(
            intent="INVOICE_PROCESS",
            confidence=0.98,
            reasoning="User explicitly requested creating a customer invoice."
        )
        mock_structured.ainvoke = AsyncMock(return_value=mock_result)
        mock_model.with_structured_output.return_value = mock_structured
        mock_get_model.return_value = mock_model

        state = {
            "messages": [HumanMessage(content="Create an invoice for client TechCorp of $500")],
            "conversation_summary": None
        }
        result = await classification_agent(state)

        assert result["classification"] == "INVOICE_PROCESS"
        assert result["classification_confidence"] == 0.98

    @pytest.mark.asyncio
    @patch("app.agents.classifier._get_model")
    async def test_classify_financial_rag_query_intent(self, mock_get_model):
        """FR-09: Classify natural language question about financial records."""
        mock_model = MagicMock()
        mock_structured = MagicMock()
        mock_result = ClassificationResult(
            intent="RAG_QUERY",
            confidence=0.95,
            reasoning="User is querying revenue and profit figures."
        )
        mock_structured.ainvoke = AsyncMock(return_value=mock_result)
        mock_model.with_structured_output.return_value = mock_structured
        mock_get_model.return_value = mock_model

        state = {
            "messages": [HumanMessage(content="What was our total net profit for Q3 2026?")],
            "conversation_summary": None
        }
        result = await classification_agent(state)

        assert result["classification"] == "RAG_QUERY"
        assert result["classification_confidence"] >= 0.90


# ==============================================================================
# FR-10: Request Routing to Specialized Agents
# ==============================================================================

class TestAgentRouting:
    """Tests routing decisions based on classification results (FR-10)."""

    def test_route_to_invoice_agent(self):
        """FR-10: Route INVOICE_PROCESS to invoice_agent."""
        state = {"classification": "INVOICE_PROCESS"}
        destination = route_classification(state)
        assert destination == "invoice_agent"

    def test_route_to_expense_agent(self):
        """FR-10: Route EXPENSE_MGMT to expense_agent."""
        state = {"classification": "EXPENSE_MGMT"}
        destination = route_classification(state)
        assert destination == "expense_agent"

    def test_route_to_rag_agent(self):
        """FR-10: Route RAG_QUERY to rag_agent."""
        state = {"classification": "RAG_QUERY"}
        destination = route_classification(state)
        assert destination == "rag_agent"

    def test_route_to_analytics_agent(self):
        """FR-10: Route ANALYTICS to analytics_agent."""
        state = {"classification": "ANALYTICS"}
        destination = route_classification(state)
        assert destination == "analytics_agent"

    def test_route_to_out_of_scope_agent(self):
        """FR-10: Route OUT_OF_SCOPE to out_of_scope."""
        state = {"classification": "OUT_OF_SCOPE"}
        destination = route_classification(state)
        assert destination == "out_of_scope"
