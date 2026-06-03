"""RAG Agent — Financial question answering via Tool Calling.

Uses Gemini Function Calling to autonomously decide which Spring Boot
report APIs to query.  The model chooses tools like get_profit_and_loss,
get_balance_sheet, etc. based on the user's question, then synthesizes
the results into a natural language answer.

This replaces the previous hardcoded query-planning approach with a
fully autonomous tool-calling loop.
"""

from __future__ import annotations

import logging
from typing import Any

from langchain_core.messages import AIMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import settings
from app.models.state import AgentState
from app.tools.accounting_tools import RAG_TOOLS
from app.tools.tool_executor import run_agent_with_tools

logger = logging.getLogger(__name__)

RAG_SYSTEM_PROMPT = """\
You are a Financial RAG Agent for an accounting system. You answer
questions about the user's financial data by querying existing reports.

You have access to many tools. USE THEM to gather the data you need
before answering. Do NOT guess or make up numbers.

Available tools include:
- get_profit_and_loss(start_date, end_date) — revenue, expenses, net profit
- get_balance_sheet(as_of_date) — assets, liabilities, equity
- get_expense_analysis(year) — expense breakdown by account
- get_accounts_receivable_aging() — outstanding invoices by age
- get_accounts_payable_aging() — outstanding bills by age
- list_all_invoices() — all invoices with status and amounts
- list_all_bills() — all bills with status and amounts
- list_all_customers() — all customers
- list_all_suppliers() — all suppliers
- get_chart_of_accounts() — the full COA tree

Strategy:
1. Read the user's question carefully.
2. Decide which tool(s) to call to get the required data.
3. Call the tools.
4. Analyse the returned data.
5. Provide a clear, well-formatted answer with specific dollar amounts,
   percentages, and trends. Use markdown formatting.

If the question requires comparing multiple time periods, call the same
tool with different date ranges.

Today's date is {today}. Use this for default date calculations.
"""


def _get_model() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.google_api_key,
        temperature=0.1,
    )


async def rag_agent(state: AgentState) -> dict[str, Any]:
    """
    Answer financial questions using autonomous tool calling.

    The model decides which tools to call, executes them, and
    synthesises the results into a clear natural language answer.
    """
    model = _get_model()
    token = state["auth_token"]
    company_id = state["company_id"]

    from datetime import date
    today = date.today().isoformat()
    system_prompt = RAG_SYSTEM_PROMPT.replace("{today}", today)

    messages = [
        SystemMessage(content=system_prompt),
        *state["messages"],
    ]

    # Run the tool-calling loop — the model autonomously decides
    # which reports to query and synthesises the final answer
    final_response, updated_messages = await run_agent_with_tools(
        model=model,
        tools=RAG_TOOLS,
        messages=messages,
        token=token,
        company_id=company_id,
    )

    # Count how many tools were called for metadata
    tool_calls_made = sum(
        1 for m in updated_messages
        if hasattr(m, "tool_calls") and m.tool_calls
    )

    return {
        "final_response": final_response,
        "messages": [AIMessage(content=final_response)],
        "response_metadata": {
            **(state.get("response_metadata") or {}),
            "tools_used": ["rag_agent"],
            "tool_calls_made": tool_calls_made,
        },
    }
