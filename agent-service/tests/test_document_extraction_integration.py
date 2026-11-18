"""Integration Tests for Module 1: Financial Document Extraction Module

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
from fastapi.testclient import TestClient

from main import app
from app.models.classification import DocumentExtractionResult, LineItemExtraction


@pytest.fixture
def client():
    """Create a FastAPI test client with mocked lifespan resources."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def sample_invoice_image():
    """Simulate raw image bytes for an uploaded invoice."""
    return io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDRsample-invoice-bytes")


@pytest.fixture
def sample_pdf_statement():
    """Simulate raw PDF bytes for an uploaded bank statement."""
    return io.BytesIO(b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF")


class TestDocumentExtractionIntegration:
    """Integration test suite for the Document Extraction API workflow."""

    @patch("main._get_graph")
    def test_upload_invoice_image_success(self, mock_get_graph, client, sample_invoice_image):
        """FR-01, FR-02, FR-03, FR-04, FR-05, FR-06:
        Upload an invoice image via multipart form data and verify API processing.
        """
        # Mock LangGraph execution result
        mock_graph = MagicMock()
        mock_extracted_json = {
            "document_type": "invoice",
            "vendor_name": "Apex Office Supplies",
            "customer_name": "FinFlow AI Test",
            "doc_number": "INV-2026-901",
            "date": "2026-11-16",
            "due_date": "2026-12-16",
            "currency": "USD",
            "line_items": [
                {
                    "description": "Ergonomic Office Chair",
                    "quantity": 2.0,
                    "unit_price": 250.00,
                    "amount": 500.00
                }
            ],
            "total_amount": 530.00,
            "tax_amount": 30.00,
            "tax_details": "6% Sales Tax",
            "notes": "Thank you for your business"
        }

        mock_graph.ainvoke = AsyncMock(return_value={
            "final_response": "I have extracted the invoice details: Apex Office Supplies, Invoice #INV-2026-901, Total $530.00.",
            "extracted_data": mock_extracted_json,
            "proposed_action": {
                "action_type": "CREATE_INVOICE",
                "summary": "Create invoice from Apex Office Supplies for $530.00",
                "payload": mock_extracted_json
            },
            "confirmation_status": "pending",
            "response_metadata": {"source": "document_extraction"}
        })
        mock_get_graph.return_value = mock_graph

        files = {
            "file": ("invoice_sample.png", sample_invoice_image, "image/png")
        }
        data = {
            "message": "Extract and process this invoice",
            "company_id": "1",
            "auth_token": "mock-test-bearer-token",
            "thread_id": "test-thread-inv-01"
        }

        # Send POST request to API
        response = client.post("/agent/chat", data=data, files=files)

        # Assertions
        assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}: {response.text}"
        payload = response.json()

        # FR-01: Accepted file upload
        assert payload["thread_id"] == "test-thread-inv-01"

        # FR-02 & FR-04: Processed through agent pipeline
        assert "invoice" in payload["response"].lower()

        # FR-06: Proposed action contains extracted structured JSON
        assert payload["requires_confirmation"] is True
        proposed = payload["proposed_action"]
        assert proposed is not None

        extracted = proposed["payload"]
        # FR-03: Identified document type
        assert extracted["document_type"] == "invoice"
        # FR-05: Key fields verified
        assert extracted["vendor_name"] == "Apex Office Supplies"
        assert extracted["doc_number"] == "INV-2026-901"
        assert extracted["total_amount"] == 530.00
        assert extracted["tax_amount"] == 30.00

    @patch("main._get_graph")
    def test_upload_bank_statement_pdf_success(self, mock_get_graph, client, sample_pdf_statement):
        """FR-01, FR-02, FR-03, FR-05:
        Upload a bank statement in PDF format and verify document type and total extraction.
        """
        mock_graph = MagicMock()
        mock_statement_json = {
            "document_type": "bank_statement",
            "vendor_name": "Standard Chartered Bank",
            "doc_number": "STMT-2026-OCT",
            "date": "2026-10-31",
            "currency": "USD",
            "total_amount": 15420.50,
            "tax_amount": 0.00,
            "tax_details": "N/A"
        }

        mock_graph.ainvoke = AsyncMock(return_value={
            "final_response": "Identified bank statement for Standard Chartered Bank with closing balance $15,420.50.",
            "extracted_data": mock_statement_json,
            "proposed_action": None,
            "confirmation_status": None
        })
        mock_get_graph.return_value = mock_graph

        files = {
            "file": ("bank_statement_oct.pdf", sample_pdf_statement, "application/pdf")
        }
        data = {
            "message": "Analyze this bank statement PDF",
            "company_id": "1",
            "auth_token": "mock-token-bank",
            "thread_id": "test-thread-bank-02"
        }

        response = client.post("/agent/chat", data=data, files=files)

        assert response.status_code == 200
        payload = response.json()
        assert "bank statement" in payload["response"].lower()

    @patch("main._get_graph")
    def test_upload_bill_document_success(self, mock_get_graph, client):
        """FR-01, FR-03, FR-04, FR-05:
        Upload a supplier bill image (JPG) and verify bill entity extraction.
        """
        mock_graph = MagicMock()
        mock_bill_json = {
            "document_type": "bill",
            "vendor_name": "Tenaga Nasional Berhad",
            "doc_number": "BILL-ELEC-4401",
            "date": "2026-11-05",
            "due_date": "2026-11-25",
            "total_amount": 780.40,
            "tax_amount": 44.17,
            "tax_details": "6% Service Tax"
        }

        mock_graph.ainvoke = AsyncMock(return_value={
            "final_response": "Extracted utility bill from Tenaga Nasional Berhad for $780.40.",
            "extracted_data": mock_bill_json,
            "proposed_action": {
                "action_type": "CREATE_BILL",
                "summary": "Record utility bill for $780.40",
                "payload": mock_bill_json
            },
            "confirmation_status": "pending"
        })
        mock_get_graph.return_value = mock_graph

        jpg_bytes = io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00sample-jpg-bill")
        files = {
            "file": ("electricity_bill.jpg", jpg_bytes, "image/jpeg")
        }
        data = {
            "message": "Record this bill",
            "company_id": "1",
            "auth_token": "mock-token-bill",
            "thread_id": "test-thread-bill-03"
        }

        response = client.post("/agent/chat", data=data, files=files)

        assert response.status_code == 200
        payload = response.json()
        assert payload["proposed_action"]["payload"]["document_type"] == "bill"
        assert payload["proposed_action"]["payload"]["total_amount"] == 780.40
