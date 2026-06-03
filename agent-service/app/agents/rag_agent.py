"""RAG Agent — Financial question answering via existing Spring Boot report APIs.

Orchestrates three tool categories:
  1. Income Query Tool — revenue, by customer, by time, comparison, outstanding
  2. Expense Query Tool — expenses, by supplier, by time, comparison, overdue
  3. Financial Insight Tool — profitability, growth rate, risk, trends

For complex multi-part questions, routes to the query_decomposer.
"""

from __future__ import annotations

import json
import logging
from datetime import date, timedelta
from typing import Any

from langchain_core.messages import AIMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.clients import spring_boot_client
from app.config import settings
from app.models.state import AgentState

logger = logging.getLogger(__name__)

RAG_SYSTEM_PROMPT = """\
You are a Financial RAG Agent for an accounting system. You answer questions
about the user's financial data by querying existing reports.

You have access to these data sources (via the Spring Boot backend):
  1. Profit & Loss report — revenue accounts, expense accounts, net profit
  2. Balance Sheet — assets, liabilities, equity as of a date
  3. Expense Analysis — expense breakdown by account for a given year
  4. AR Aging — accounts receivable aging (outstanding invoices)
  5. AP Aging — accounts payable aging (outstanding bills)
  6. Invoice list — all invoices with status and amounts
  7. Bill list — all bills with status and amounts

Based on the user's question, decide which data source(s) to query.

Respond with a JSON object:
{
  "queries": [
    {"source": "profit_loss", "params": {"start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"}},
    {"source": "balance_sheet", "params": {"as_of_date": "YYYY-MM-DD"}},
    {"source": "expense_analysis", "params": {"year": 2025}},
    {"source": "ar_aging", "params": {}},
    {"source": "ap_aging", "params": {}},
    {"source": "invoices", "params": {}},
    {"source": "bills", "params": {}}
  ],
  "is_complex": false
}

Set is_complex=true if the question needs multi-step reasoning or comparisons
across multiple time periods. Today's date is {today}.
"""


def _get_model() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.google_api_key,
        temperature=0.1,
    )


async def rag_agent(state: AgentState) -> dict[str, Any]:
    """
    Answer financial questions using existing Spring Boot report endpoints.
    """
    model = _get_model()
    token = state["auth_token"]
    company_id = state["company_id"]

    today = date.today().isoformat()
    system_prompt = RAG_SYSTEM_PROMPT.replace("{today}", today)

    messages = [
        SystemMessage(content=system_prompt),
        *state["messages"],
    ]

    # Step 1: Determine which queries to run
    response = await model.ainvoke(messages)
    content = response.content

    try:
        plan = _extract_json(content)
    except Exception:
        # Model couldn't plan — just give a direct answer
        return {
            "final_response": content,
            "messages": [AIMessage(content=content)],
        }

    # Step 2: Execute queries in parallel-ish fashion
    queries = plan.get("queries", [])
    results = {}

    for q in queries:
        source = q.get("source", "")
        params = q.get("params", {})

        try:
            data = await _execute_query(source, params, token, company_id)
            results[source] = data
        except Exception as e:
            logger.warning("Query %s failed: %s", source, e)
            results[source] = {"error": str(e)}

    # Step 3: Synthesize results into a natural language answer
    synthesis_prompt = (
        f"Based on the user's question and the following data, provide a clear, "
        f"well-formatted financial answer. Include specific numbers, dates, and "
        f"explain how you arrived at your conclusions.\n\n"
        f"User question: {state['user_input']}\n\n"
        f"Data retrieved:\n{json.dumps(results, indent=2, default=str)}"
    )

    synthesis_messages = [
        SystemMessage(content=(
            "You are a financial analyst. Synthesize the data into a clear, "
            "actionable answer. Use markdown formatting. Include specific dollar "
            "amounts and percentages. If you performed calculations, show them."
        )),
        *state["messages"],
        SystemMessage(content=synthesis_prompt),
    ]

    final_response = await model.ainvoke(synthesis_messages)

    return {
        "final_response": final_response.content,
        "query_results": [results],
        "sql_queries": [json.dumps(q) for q in queries],
        "messages": [AIMessage(content=final_response.content)],
        "response_metadata": {
            **(state.get("response_metadata") or {}),
            "data_sources": list(results.keys()),
            "queries_executed": len(queries),
        },
    }


async def _execute_query(
    source: str, params: dict, token: str, company_id: int
) -> Any:
    """Route to the appropriate Spring Boot endpoint."""
    today = date.today()

    if source == "profit_loss":
        start = params.get("start_date", (today - timedelta(days=365)).isoformat())
        end = params.get("end_date", today.isoformat())
        return await spring_boot_client.get_profit_loss(start, end, token, company_id)

    if source == "balance_sheet":
        as_of = params.get("as_of_date", today.isoformat())
        return await spring_boot_client.get_balance_sheet(as_of, token, company_id)

    if source == "expense_analysis":
        year = params.get("year", today.year)
        return await spring_boot_client.get_expense_analysis(int(year), token, company_id)

    if source == "ar_aging":
        return await spring_boot_client.get_ar_aging(token, company_id)

    if source == "ap_aging":
        return await spring_boot_client.get_ap_aging(token, company_id)

    if source == "invoices":
        return await spring_boot_client.list_invoices(token, company_id)

    if source == "bills":
        return await spring_boot_client.list_bills(token, company_id)

    raise ValueError(f"Unknown data source: {source}")


def _extract_json(text: str) -> dict:
    import re
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    start = text.find("{")
    end = text.rfind("}") + 1
    if start >= 0 and end > start:
        return json.loads(text[start:end])
    raise ValueError("No JSON found")
