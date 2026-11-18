"""Unit Tests for Module 3: Retrieval-Augmented Generation (RAG) Agent & Analytics Module

Requirements Covered:
- FR-11: The system shall decompose complex queries into smaller sub-queries when necessary.
- FR-12: The system shall convert structured queries into database queries using a query builder.
- FR-13: The system shall retrieve financial data from the database based on query parameters.
- FR-14: The system shall perform aggregation and computation on retrieved data (e.g., totals, comparisons).
- FR-15: The system shall present query results along with supporting evidence (e.g., dates, amounts).
- FR-16: The system shall invoke a backend forecasting service to generate income and expense predictions based on historical financial data.
- FR-17: The system shall provide a fallback response for out-of-scope or unsupported queries.
- FR-18: The system shall redirect valid user inputs back to the input processing module after initial fallback handling.
"""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from langchain_core.messages import HumanMessage, AIMessage

from app.agents.query_decomposer import query_decomposer
from app.agents.sql_builder import sql_query_builder
from app.agents.aggregation_agent import aggregation_agent
from app.agents.rag_agent import rag_agent
from app.agents.analytics_agent import analytics_agent
from app.agents.out_of_scope import out_of_scope_agent, OUT_OF_SCOPE_RESPONSE


# ==============================================================================
# FR-11: Query Decomposition
# ==============================================================================

class TestQueryDecomposition:
    """Tests breaking down complex financial questions into atomic sub-queries (FR-11)."""

    @pytest.mark.asyncio
    @patch("app.agents.query_decomposer._get_model")
    async def test_decompose_multi_part_query(self, mock_get_model):
        """FR-11: Decompose query asking for revenue comparison and expense breakdown."""
        mock_model = MagicMock()
        mock_response = MagicMock()
        mock_payload = {
            "sub_queries": [
                "What was total revenue for Q1 2026?",
                "What was total revenue for Q1 2025?",
                "What were the top 3 expense categories for Q1 2026?"
            ],
            "synthesis_instruction": "Compare Q1 revenue YoY and evaluate top expense drivers."
        }
        mock_response.content = json.dumps(mock_payload)
        mock_model.ainvoke = AsyncMock(return_value=mock_response)
        mock_get_model.return_value = mock_model

        state = {
            "messages": [HumanMessage(content="Compare our Q1 revenue with last year and list top expenses")],
            "user_input": "Compare our Q1 revenue with last year and list top expenses",
        }
        result = await query_decomposer(state)

        assert "sub_queries" in result
        assert len(result["sub_queries"]) == 3
        assert "synthesis_instruction" in result


# ==============================================================================
# FR-12: SQL Query Builder
# ==============================================================================

class TestSqlQueryBuilder:
    """Tests converting structured requests into parameterized, safe read-only SQL (FR-12)."""

    @pytest.mark.asyncio
    @patch("app.agents.sql_builder._get_model")
    async def test_generate_safe_read_only_sql(self, mock_get_model):
        """FR-12: Convert user query into company-isolated SELECT query."""
        mock_model = MagicMock()
        mock_response = MagicMock()
        mock_response.content = json.dumps({
            "sql": "SELECT i.doc_number, i.total_amt, i.status FROM invoice i WHERE i.company_id = 1 AND i.status = 'UNPAID';",
            "explanation": "Select unpaid invoices for company 1"
        })
        mock_model.ainvoke = AsyncMock(return_value=mock_response)
        mock_get_model.return_value = mock_model

        state = {
            "company_id": 1,
            "messages": [HumanMessage(content="Find all unpaid invoices")],
            "user_input": "Find all unpaid invoices",
        }
        result = await sql_query_builder(state)

        assert "generated_sql" in result
        sql = result["generated_sql"]["sql"]
        assert sql.strip().upper().startswith("SELECT")
        assert "company_id = 1" in sql
        assert "DELETE" not in sql and "DROP" not in sql


# ==============================================================================
# FR-13: Financial Data Retrieval
# ==============================================================================

class TestFinancialDataRetrieval:
    """Tests retrieving accounting data from the backend via tool execution (FR-13)."""

    @pytest.mark.asyncio
    @patch("app.agents.rag_agent.run_agent_with_tools")
    async def test_retrieve_financial_data_via_rag_tools(self, mock_run_agent):
        """FR-13: Verify RAG agent queries report APIs based on date and parameter filters."""
        mock_run_agent.return_value = {
            "final_response": "Your total revenue from 2026-01-01 to 2026-06-30 was $84,200.00.",
            "messages": [AIMessage(content="Revenue retrieved successfully.")],
        }

        state = {
            "auth_token": "mock-token-xyz",
            "company_id": 1,
            "messages": [HumanMessage(content="What was our revenue for the first half of 2026?")],
            "user_input": "What was our revenue for the first half of 2026?",
        }
        result = await rag_agent(state)

        assert mock_run_agent.called
        assert "$84,200.00" in result["final_response"]


# ==============================================================================
# FR-14 & FR-15: Aggregation, Computation & Evidence Presentation
# ==============================================================================

class TestAggregationAndEvidencePresentation:
    """Tests computing totals, growth rates, and citing specific dates and amounts (FR-14, FR-15)."""

    @pytest.mark.asyncio
    @patch("app.agents.aggregation_agent._get_model")
    async def test_aggregate_and_present_evidence(self, mock_get_model):
        """FR-14 & FR-15: Perform aggregation on raw data and cite supporting evidence (amounts & dates)."""
        mock_model = MagicMock()
        mock_response = MagicMock()
        mock_response.content = (
            "### Financial Summary\n"
            "- **Total Revenue:** $120,500.00 (Period: 2026-01-01 to 2026-03-31)\n"
            "- **Total Operating Expenses:** $78,300.00\n"
            "- **Net Profit:** $42,200.00 (+15.2% ↑ YoY)\n\n"
            "*Evidence based on general ledger entries as of 2026-03-31.*"
        )
        mock_model.ainvoke = AsyncMock(return_value=mock_response)
        mock_get_model.return_value = mock_model

        state = {
            "user_input": "Summarize Q1 financial results",
            "query_results": [
                {"category": "Revenue", "total": 120500.00, "period": "Q1 2026"},
                {"category": "Expense", "total": 78300.00, "period": "Q1 2026"}
            ]
        }
        result = await aggregation_agent(state)

        assert "final_response" in result
        response = result["final_response"]
        # FR-14: Aggregated metrics
        assert "$120,500.00" in response
        assert "$42,200.00" in response
        # FR-15: Supporting evidence (dates and percentages)
        assert "2026-01-01" in response
        assert "15.2%" in response


# ==============================================================================
# FR-16: ML Backend Forecasting Service Invocation
# ==============================================================================

class TestMLForecastingService:
    """Tests triggering backend forecasting model for future income/expense projections (FR-16)."""

    @pytest.mark.asyncio
    @patch("app.agents.analytics_agent.ml_client.forecast_revenue")
    @patch("app.agents.analytics_agent.ml_client.forecast_expenses")
    @patch("app.agents.analytics_agent._get_model")
    async def test_invoke_ml_forecasting_service(self, mock_get_model, mock_forecast_exp, mock_forecast_rev):
        """FR-16: Invoke ML forecasting engine and synthesize prediction curves."""
        # 1. Mock ML microservice response
        mock_forecast_rev.return_value = {
            "historical": [{"ds": "2026-08", "y": 50000}],
            "forecast": [{"ds": "2026-12", "yhat": 58000, "yhat_lower": 54000, "yhat_upper": 62000}]
        }
        mock_forecast_exp.return_value = {
            "historical": [{"ds": "2026-08", "y": 30000}],
            "forecast": [{"ds": "2026-12", "yhat": 32000, "yhat_lower": 29000, "yhat_upper": 35000}]
        }

        # 2. Mock model plan
        mock_model = MagicMock()
        mock_plan_resp = MagicMock()
        mock_plan_resp.content = json.dumps({
            "forecasts": [
                {"type": "revenue", "months_ahead": 4, "category": "Total"},
                {"type": "expense", "months_ahead": 4, "category": "Total"}
            ]
        })

        mock_synth_resp = MagicMock()
        mock_synth_resp.content = "Projected revenue for December 2026 is $58,000 against expenses of $32,000."

        mock_model.ainvoke = AsyncMock(side_effect=[mock_plan_resp, mock_synth_resp])
        mock_get_model.return_value = mock_model

        state = {
            "auth_token": "test-token",
            "company_id": 1,
            "user_input": "Forecast our cashflow for the next 4 months",
            "messages": [HumanMessage(content="Forecast our cashflow for the next 4 months")],
        }

        result = await analytics_agent(state)

        assert mock_forecast_rev.called
        assert mock_forecast_exp.called
        assert "Projected revenue" in result["final_response"]


# ==============================================================================
# FR-17 & FR-18: Fallback Handling & Redirection of Valid Queries
# ==============================================================================

class TestFallbackAndRedirection:
    """Tests out-of-scope fallback response and subsequent valid query redirection (FR-17, FR-18)."""

    @pytest.mark.asyncio
    async def test_fallback_response_for_out_of_scope_query(self):
        """FR-17: Provide structured fallback response with guidance for non-accounting inputs."""
        state = {
            "user_input": "What is the capital of France?",
            "messages": [HumanMessage(content="What is the capital of France?")],
        }
        result = await out_of_scope_agent(state)

        assert "final_response" in result
        assert result["final_response"] == OUT_OF_SCOPE_RESPONSE
        assert "specialized Accounting Assistant" in result["final_response"]

    @pytest.mark.asyncio
    @patch("app.agents.classifier._get_model")
    async def test_redirect_valid_query_after_initial_fallback(self, mock_get_model):
        """FR-18: Redirect valid accounting query back to classification after previous fallback."""
        # Previous turn was fallback; user now submits valid request: "Show me invoices"
        mock_model = MagicMock()
        mock_structured = MagicMock()
        mock_result = ClassificationResult(
            intent="INVOICE_PROCESS",
            confidence=0.97,
            reasoning="Valid invoice query after previous out-of-scope greeting."
        )
        mock_structured.ainvoke = AsyncMock(return_value=mock_result)
        mock_model.with_structured_output.return_value = mock_structured
        mock_get_model.return_value = mock_model

        state = {
            "pending_intent": None,
            "messages": [
                HumanMessage(content="Tell me a joke"),
                AIMessage(content=OUT_OF_SCOPE_RESPONSE),
                HumanMessage(content="Show me my unpaid invoices")
            ],
            "user_input": "Show me my unpaid invoices",
        }

        classification_res = await classification_agent(state)

        assert classification_res["classification"] == "INVOICE_PROCESS"
        assert classification_res["classification_confidence"] >= 0.90
