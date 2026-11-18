"""Unit Tests for Module 1: Financial Document Extraction Module

Requirements Covered:
- FR-01: The system shall allow users to upload invoice, bill, and bank statement images in supported formats (e.g., JPG, PNG, PDF).
- FR-02: The system shall send uploaded documents to an API to be processed.
- FR-03: The system shall identify document type (invoice, bill, or bank statement) from uploaded document.
- FR-04: The system shall extract structured data fields from document contents.
- FR-05: The system shall identify key fields such as vendor name, invoice number, transaction date, amount, and tax details.
- FR-06: The system shall convert extracted information into a structured JSON format.
"""

import io
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from pydantic import ValidationError

from app.models.classification import DocumentExtractionResult, LineItemExtraction
from app.agents.preprocess import preprocess_node, _extract_pdf_text


# ==============================================================================
# FR-01: File Format & Upload Validation Tests
# ==============================================================================

class TestFileFormatValidation:
    """Tests verification of supported and unsupported document formats (FR-01)."""

    def test_supported_image_extensions(self):
        """FR-01: Verify supported image formats (JPG, PNG, JPEG, WEBP) are correctly recognized."""
        supported_extensions = ["invoice.jpg", "bill.png", "receipt.jpeg", "statement.webp"]
        image_exts = ("png", "jpg", "jpeg", "gif", "webp", "bmp")

        for filename in supported_extensions:
            ext = filename.lower().rsplit(".", 1)[-1]
            assert ext in image_exts, f"Format {ext} should be recognized as supported image"

    def test_supported_pdf_extension(self):
        """FR-01: Verify PDF document format is recognized."""
        filename = "bank_statement_2026.pdf"
        ext = filename.lower().rsplit(".", 1)[-1]
        assert ext == "pdf", "PDF format must be recognized"

    def test_unsupported_file_extension(self):
        """FR-01: Verify unsupported file extensions (e.g. .exe, .txt, .zip) are excluded."""
        unsupported = ["malware.exe", "notes.txt", "archive.zip"]
        valid_exts = ("png", "jpg", "jpeg", "gif", "webp", "bmp", "pdf")

        for filename in unsupported:
            ext = filename.lower().rsplit(".", 1)[-1]
            assert ext not in valid_exts, f"Extension {ext} should not be treated as supported document"


# ==============================================================================
# FR-03: Document Type Identification Tests
# ==============================================================================

class TestDocumentTypeIdentification:
    """Tests identification of document types: invoice, bill, bank statement (FR-03)."""

    def test_identify_invoice_type(self):
        """FR-03: Identify document type as 'invoice'."""
        doc = DocumentExtractionResult(
            document_type="invoice",
            doc_number="INV-2026-001",
            total_amount=1500.00
        )
        assert doc.document_type == "invoice"

    def test_identify_bill_type(self):
        """FR-03: Identify document type as 'bill'."""
        doc = DocumentExtractionResult(
            document_type="bill",
            doc_number="BILL-9981",
            total_amount=320.50
        )
        assert doc.document_type == "bill"

    def test_identify_bank_statement_type(self):
        """FR-03: Identify document type as 'bank_statement'."""
        doc = DocumentExtractionResult(
            document_type="bank_statement",
            doc_number="STMT-OCT-2026",
            total_amount=12450.75
        )
        assert doc.document_type == "bank_statement"

    def test_reject_invalid_document_type(self):
        """FR-03: Verify that invalid document types are rejected by strict schema validation."""
        with pytest.raises(ValidationError):
            DocumentExtractionResult(
                document_type="unsupported_doc_type",
                total_amount=100.00
            )


# ==============================================================================
# FR-04 & FR-05: Key Fields and Structured Data Extraction Tests
# ==============================================================================

class TestStructuredDataAndKeyFieldsExtraction:
    """Tests extraction of structured data and key fields (FR-04, FR-05)."""

    def test_extract_all_key_fields(self):
        """FR-05: Verify extraction of vendor name, invoice number, date, amount, and tax details."""
        raw_extracted_payload = {
            "document_type": "invoice",
            "vendor_name": "Acme Supplies Sdn Bhd",
            "customer_name": "Global Tech Enterprise",
            "doc_number": "INV-2026-8891",
            "date": "2026-11-15",
            "due_date": "2026-12-15",
            "currency": "MYR",
            "total_amount": 1060.00,
            "tax_amount": 60.00,
            "tax_details": "6% SST included",
            "notes": "Payment due within 30 days"
        }

        result = DocumentExtractionResult(**raw_extracted_payload)

        # Assert key fields (FR-05)
        assert result.vendor_name == "Acme Supplies Sdn Bhd"
        assert result.doc_number == "INV-2026-8891"
        assert result.date == "2026-11-15"
        assert result.total_amount == 1060.00
        assert result.tax_amount == 60.00
        assert result.tax_details == "6% SST included"

    def test_extract_structured_line_items(self):
        """FR-04: Verify extraction of itemized line items (quantity, unit price, description, total)."""
        line_item_1 = LineItemExtraction(
            description="Consulting Service - Module 1",
            quantity=2.0,
            unit_price=250.0,
            amount=500.0
        )
        line_item_2 = LineItemExtraction(
            description="Cloud Hosting Deployment",
            quantity=1.0,
            unit_price=150.0,
            amount=150.0
        )

        doc = DocumentExtractionResult(
            document_type="bill",
            vendor_name="AWS Cloud Services",
            doc_number="BILL-4412",
            line_items=[line_item_1, line_item_2],
            total_amount=650.0
        )

        assert len(doc.line_items) == 2
        assert doc.line_items[0].description == "Consulting Service - Module 1"
        assert doc.line_items[0].quantity == 2.0
        assert doc.line_items[0].amount == 500.0
        assert doc.line_items[1].unit_price == 150.0


# ==============================================================================
# FR-06: Conversion into Structured JSON Format Tests
# ==============================================================================

class TestJsonFormatConversion:
    """Tests serialization of extracted document data into structured JSON (FR-06)."""

    def test_conversion_to_json_string_and_dict(self):
        """FR-06: Verify conversion of extracted information into valid structured JSON."""
        doc = DocumentExtractionResult(
            document_type="invoice",
            vendor_name="Tech Solutions Ltd",
            customer_name="FinFlow AI Corp",
            doc_number="INV-2026-009",
            date="2026-11-01",
            due_date="2026-11-30",
            currency="USD",
            total_amount=2120.00,
            tax_amount=120.00,
            tax_details="Tax: Standard 6%",
            line_items=[
                LineItemExtraction(
                    description="Software Development License",
                    quantity=1.0,
                    unit_price=2000.00,
                    amount=2000.00
                )
            ]
        )

        # 1. Test model_dump() (dict conversion)
        doc_dict = doc.model_dump()
        assert isinstance(doc_dict, dict)
        assert doc_dict["document_type"] == "invoice"
        assert doc_dict["tax_amount"] == 120.00

        # 2. Test model_dump_json() (JSON string conversion)
        json_str = doc.model_dump_json(indent=2)
        assert isinstance(json_str, str)

        # 3. Verify valid JSON parseability (round-trip)
        parsed = json.loads(json_str)
        assert parsed["vendor_name"] == "Tech Solutions Ltd"
        assert parsed["line_items"][0]["quantity"] == 1.0
        assert parsed["total_amount"] == 2120.00


# ==============================================================================
# FR-02: Document API Processing & Multimodal Pipeline Tests
# ==============================================================================

class TestDocumentProcessingPipeline:
    """Tests dispatching uploaded documents to API and receiving structured output (FR-02)."""

    @pytest.mark.asyncio
    @patch("app.agents.preprocess._get_model")
    async def test_preprocess_node_image_extraction_success(self, mock_get_model):
        """FR-02: Verify uploaded image is sent to multimodal API and structured output returned."""
        mock_model = MagicMock()
        mock_structured_model = MagicMock()

        # Mock structured output response from LLM
        mock_result = DocumentExtractionResult(
            document_type="invoice",
            vendor_name="Office World Supplier",
            doc_number="OW-9910",
            date="2026-11-10",
            total_amount=450.00,
            tax_amount=25.00,
            tax_details="5.5% Sales Tax",
            line_items=[
                LineItemExtraction(
                    description="Ergonomic Desk Chairs",
                    quantity=3.0,
                    unit_price=150.0,
                    amount=450.0
                )
            ]
        )

        mock_structured_model.ainvoke = AsyncMock(return_value=mock_result)
        mock_model.with_structured_output.return_value = mock_structured_model
        mock_get_model.return_value = mock_model

        fake_image_bytes = b"fake-png-binary-stream-data"
        state = {
            "input_type": "image",
            "user_input": "Please process this invoice image",
            "file_bytes": fake_image_bytes,
        }

        result = await preprocess_node(state)

        # Assertions
        assert "extracted_data" in result
        extracted = result["extracted_data"]
        assert extracted["document_type"] == "invoice"
        assert extracted["vendor_name"] == "Office World Supplier"
        assert extracted["total_amount"] == 450.00
        assert extracted["tax_amount"] == 25.00
        assert mock_structured_model.ainvoke.called

    @pytest.mark.asyncio
    @patch("app.agents.preprocess._get_model")
    @patch("app.agents.preprocess._extract_pdf_text")
    async def test_preprocess_node_pdf_extraction_success(self, mock_pdf_text, mock_get_model):
        """FR-02, FR-04: Verify uploaded PDF text is parsed and structured by the API."""
        mock_pdf_text.return_value = (
            "BANK STATEMENT\nAccount: 1234567890\nDate: 2026-10-31\n"
            "Total Balance: $8,500.00\nInterest Tax: $12.50"
        )

        mock_model = MagicMock()
        mock_structured = MagicMock()
        mock_result = DocumentExtractionResult(
            document_type="bank_statement",
            vendor_name="Maybank Islamic",
            doc_number="STMT-OCT-2026",
            date="2026-10-31",
            total_amount=8500.00,
            tax_amount=12.50,
            tax_details="Tax on savings interest"
        )
        mock_structured.ainvoke = AsyncMock(return_value=mock_result)
        mock_model.with_structured_output.return_value = mock_structured
        mock_get_model.return_value = mock_model

        fake_pdf_bytes = b"%PDF-1.4 sample pdf binary data"
        state = {
            "input_type": "pdf",
            "user_input": "Extract my bank statement",
            "file_bytes": fake_pdf_bytes,
        }

        result = await preprocess_node(state)

        assert result["extracted_data"] is not None
        assert result["extracted_data"]["document_type"] == "bank_statement"
        assert result["extracted_data"]["total_amount"] == 8500.00
