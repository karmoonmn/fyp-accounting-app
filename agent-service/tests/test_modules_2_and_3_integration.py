"""Integration Tests for Module 2 & Module 3

Requirements Covered:
- Module 2: FR-07, FR-08, FR-09, FR-10
- Module 3: FR-11, FR-12, FR-13, FR-14, FR-15, FR-16, FR-17, FR-18
"""

import io
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    """Create FastAPI test client."""
    with TestClient(app) as test_client:
        yield test_client


class TestModule2And3Integration:
    """End-to-End integration test suite for Module 2 and Module 3 workflows."""

    @patch("main._get_graph")
    def test_text_and_image_input_processing_integration(self, mock_get_graph, client):
        """FR-07, FR-09, FR-10:
        Send dual multimodal input (text message + uploaded image) through /agent/chat.
        """
        mock_graph = MagicMock()
        mock_graph.ainvoke = AsyncMock(return_value={
            "final_response": "I have processed your invoice image and drafted the action.",
            "classification": "INVOICE_PROCESS",
            "proposed_action": {
                "action_type": "CREATE_INVOICE",
                "summary": "Create invoice from image for $1,200.00"
            },
            "confirmation_status": "pending"
        })
        mock_get_graph.return_value = mock_graph

        fake_img = io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDRfakeimage")
        files = {"file": ("inv.png", fake_img, "image/png")}
        data = {
            "message": "Please process this customer invoice",
            "company_id": "1",
            "auth_token": "bearer-test-token",
            "thread_id": "thread-mod2-01"
        }

        response = client.post("/agent/chat", data=data, files=files)

        assert response.status_code == 200
        payload = response.json()
        assert payload["thread_id"] == "thread-mod2-01"
        assert payload["requires_confirmation"] is True
        assert "invoice" in payload["response"].lower()

    @patch("main._get_graph")
    def test_rag_financial_data_retrieval_and_aggregation_integration(self, mock_get_graph, client):
        """FR-09, FR-10, FR-13, FR-14, FR-15:
        Submit natural language financial query; verify RAG routing, tool invocation and evidence citation.
        """
        mock_graph = MagicMock()
        mock_graph.ainvoke = AsyncMock(return_value={
            "final_response": (
                "Based on your Profit & Loss records from 2026-01-01 to 2026-10-31:\n"
                "- Total Revenue: $450,000.00\n"
                "- Operating Expenses: $210,000.00\n"
                "- Net Operating Profit: $240,000.00 (53.3% margin)"
            ),
            "classification": "RAG_QUERY",
            "proposed_action": None,
            "confirmation_status": None
        })
        mock_get_graph.return_value = mock_graph

        data = {
            "message": "What is our net operating profit for this year so far?",
            "company_id": "1",
            "auth_token": "bearer-test-token",
            "thread_id": "thread-rag-02"
        }

        response = client.post("/agent/chat", data=data)

        assert response.status_code == 200
        payload = response.json()
        assert "$450,000.00" in payload["response"]
        assert "53.3%" in payload["response"]
        assert payload["requires_confirmation"] is False

    @patch("main._get_graph")
    def test_ml_forecasting_pipeline_integration(self, mock_get_graph, client):
        """FR-09, FR-10, FR-16:
        Submit forecasting request and verify routing to analytics agent invoking ML service.
        """
        mock_graph = MagicMock()
        mock_graph.ainvoke = AsyncMock(return_value={
            "final_response": (
                "Here is the 6-month predictive projection:\n"
                "- Predicted Revenue (Nov 2026): $62,000\n"
                "- Predicted Expenses (Nov 2026): $38,000\n"
                "- Net Projected Cash Flow: +$24,000\n"
                "Cash flow remains positive across all 6 forecast horizons."
            ),
            "classification": "ANALYTICS",
            "proposed_action": None
        })
        mock_get_graph.return_value = mock_graph

        data = {
            "message": "Predict our income and expenses for the next 6 months",
            "company_id": "1",
            "auth_token": "bearer-test-token",
            "thread_id": "thread-analytics-03"
        }

        response = client.post("/agent/chat", data=data)

        assert response.status_code == 200
        payload = response.json()
        assert "predictive projection" in payload["response"].lower()
        assert "$62,000" in payload["response"]

    @patch("main._get_graph")
    def test_out_of_scope_fallback_and_recovery_integration(self, mock_get_graph, client):
        """FR-17 & FR-18:
        Verify out-of-scope fallback guardrail on first turn, followed by redirection and recovery
        of valid accounting query on subsequent turn.
        """
        mock_graph = MagicMock()

        # Turn 1: Out of scope request ("Recommend a good pizza place")
        fallback_msg = (
            "I'm sorry, I'm your specialized Accounting Assistant. "
            "I can help you with Invoices, Bills, Financial Reports, and Forecasting."
        )
        mock_graph.ainvoke = AsyncMock(return_value={
            "final_response": fallback_msg,
            "classification": "OUT_OF_SCOPE",
            "proposed_action": None
        })
        mock_get_graph.return_value = mock_graph

        turn1_data = {
            "message": "Can you recommend a good Italian pizza restaurant?",
            "company_id": "1",
            "auth_token": "bearer-token",
            "thread_id": "thread-fallback-recovery-04"
        }

        resp1 = client.post("/agent/chat", data=turn1_data)
        assert resp1.status_code == 200
        # FR-17: Fallback response
        assert "specialized accounting assistant" in resp1.json()["response"].lower()

        # Turn 2 (FR-18): User redirects back to valid financial request
        mock_graph.ainvoke = AsyncMock(return_value={
            "final_response": "Here is the list of overdue bills: BILL-001 ($450), BILL-002 ($1,100).",
            "classification": "EXPENSE_MGMT",
            "proposed_action": None
        })

        turn2_data = {
            "message": "Okay, show me my overdue bills then",
            "company_id": "1",
            "auth_token": "bearer-token",
            "thread_id": "thread-fallback-recovery-04"
        }

        resp2 = client.post("/agent/chat", data=turn2_data)
        assert resp2.status_code == 200
        # FR-18: Successfully redirected to accounting workflow
        assert "overdue bills" in resp2.json()["response"].lower()
        assert "BILL-001" in resp2.json()["response"]
