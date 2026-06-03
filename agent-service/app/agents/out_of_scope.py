"""Out-of-Scope Agent — polite guardrail for non-accounting queries."""

from __future__ import annotations

from typing import Any

from langchain_core.messages import AIMessage

from app.models.state import AgentState

OUT_OF_SCOPE_RESPONSE = (
    "I'm sorry, I'm your **specialized Accounting Assistant**. "
    "I can help you with:\n\n"
    "• 📄 **Invoices** — Create, view, update, or delete invoices\n"
    "• 💰 **Expenses & Bills** — Track and manage your expenses\n"
    "• 📊 **Financial Reports** — Revenue, profit/loss, balance sheet, aging reports\n"
    "• 🔮 **Forecasting** — Predict future income and expenses\n"
    "• 📷 **Document Processing** — Upload invoice/receipt images or PDFs\n\n"
    "Please ask me something related to your accounting, and I'll be happy to help!"
)


async def out_of_scope_agent(state: AgentState) -> dict[str, Any]:
    """Return a polite rejection for non-accounting queries."""
    return {
        "final_response": OUT_OF_SCOPE_RESPONSE,
        "messages": [AIMessage(content=OUT_OF_SCOPE_RESPONSE)],
    }
