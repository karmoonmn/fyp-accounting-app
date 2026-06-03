"""Invoice Management Agent — CRUD invoices via Spring Boot.

Parses the user's intent (create / read / update / delete), extracts
required fields using Gemini, and builds a ProposedAction for
human-in-the-loop confirmation before committing.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from langchain_core.messages import AIMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.clients import spring_boot_client
from app.config import settings
from app.models.actions import ProposedAction, LineItemAction
from app.models.state import AgentState

logger = logging.getLogger(__name__)

INVOICE_SYSTEM_PROMPT = """\
You are an Invoice Management Agent for an accounting system.

Your job is to help the user create, view, update, or delete invoices.

When the user wants to CREATE an invoice, extract:
- docNumber (invoice number)
- txnDate (transaction date, default to today if not specified, format: YYYY-MM-DD)
- dueDate (optional, format: YYYY-MM-DD)
- customerId or customerName
- shipAddr (optional)
- lines: list of {description, quantity, unitPrice}

When the user wants to VIEW invoices, list or fetch specific ones.
When the user wants to DELETE, confirm the invoice ID.

If extracted_data from a document upload is available, use it directly.

Respond as a JSON object with:
{
  "action": "create" | "list" | "get" | "update" | "delete",
  "data": { ... extracted fields ... }
}

If information is missing, ask the user for it.
"""


def _get_model() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.google_api_key,
        temperature=0.1,
    )


async def invoice_agent(state: AgentState) -> dict[str, Any]:
    """
    Process invoice-related requests.

    For read operations → responds immediately.
    For write operations → builds a ProposedAction for confirmation.
    """
    model = _get_model()
    token = state["auth_token"]
    company_id = state["company_id"]
    extracted = state.get("extracted_data")

    messages = [
        SystemMessage(content=INVOICE_SYSTEM_PROMPT),
        *state["messages"],
    ]

    # If we have extracted document data, inject it
    if extracted:
        messages.append(
            SystemMessage(content=f"Extracted document data:\n{json.dumps(extracted, indent=2)}")
        )

    response = await model.ainvoke(messages)
    content = response.content

    # Try to parse structured response
    try:
        parsed = _extract_json(content)
    except Exception:
        # Model responded in natural language (probably asking for more info)
        return {
            "final_response": content,
            "messages": [AIMessage(content=content)],
        }

    action = parsed.get("action", "").lower()
    data = parsed.get("data", {})

    # ── Read operations — respond immediately ─────────────────
    if action == "list":
        invoices = await spring_boot_client.list_invoices(token, company_id)
        summary = _format_invoice_list(invoices)
        return {
            "final_response": summary,
            "messages": [AIMessage(content=summary)],
        }

    if action == "get":
        inv_id = data.get("id")
        if not inv_id:
            msg = "Which invoice would you like to view? Please provide the invoice ID or number."
            return {"final_response": msg, "messages": [AIMessage(content=msg)]}
        invoice = await spring_boot_client.get_invoice(int(inv_id), token, company_id)
        summary = f"**Invoice #{invoice.get('docNumber', inv_id)}**\n" + json.dumps(invoice, indent=2, default=str)
        return {
            "final_response": summary,
            "messages": [AIMessage(content=summary)],
        }

    # ── Write operations — build ProposedAction ───────────────
    if action == "create":
        line_items = []
        for line in data.get("lines", []):
            qty = float(line.get("quantity", 1))
            price = float(line.get("unitPrice", line.get("unit_price", 0)))
            line_items.append(LineItemAction(
                description=line.get("description", ""),
                quantity=qty,
                unit_price=price,
                amount=round(qty * price, 2),
            ))

        total = sum(li.amount for li in line_items)

        # Try to resolve customer
        customer_name = data.get("customerName", data.get("customer_name", ""))
        customer_id = data.get("customerId", data.get("customer_id"))

        if customer_name and not customer_id:
            customers = await spring_boot_client.list_customers(token, company_id)
            for c in customers:
                if c.get("name", "").lower() == customer_name.lower():
                    customer_id = c["id"]
                    break

        proposed = ProposedAction(
            action_type="CREATE_INVOICE",
            summary=f"Create invoice {data.get('docNumber', 'NEW')} for {customer_name or 'unknown customer'} — ${total:,.2f}",
            doc_number=data.get("docNumber", data.get("doc_number")),
            txn_date=data.get("txnDate", data.get("txn_date")),
            due_date=data.get("dueDate", data.get("due_date")),
            customer_id=int(customer_id) if customer_id else None,
            customer_name=customer_name,
            line_items=line_items,
            total_amount=total,
        )

        confirmation_msg = (
            f"I've prepared this invoice for you:\n\n"
            f"**{proposed.summary}**\n\n"
            f"Line items:\n"
            + "\n".join(
                f"  • {li.description} — {li.quantity} × ${li.unit_price:,.2f} = ${li.amount:,.2f}"
                for li in line_items
            )
            + f"\n\n**Total: ${total:,.2f}**\n\n"
            f"Please click **Confirm** to post it to your books."
        )

        return {
            "proposed_action": proposed.model_dump(),
            "confirmation_status": "pending",
            "final_response": confirmation_msg,
            "messages": [AIMessage(content=confirmation_msg)],
        }

    if action == "delete":
        inv_id = data.get("id")
        proposed = ProposedAction(
            action_type="DELETE_INVOICE",
            summary=f"Delete invoice #{inv_id}",
            target_id=int(inv_id) if inv_id else None,
        )
        return {
            "proposed_action": proposed.model_dump(),
            "confirmation_status": "pending",
            "final_response": f"Are you sure you want to delete invoice #{inv_id}? Click **Confirm** to proceed.",
            "messages": [AIMessage(content=f"Delete invoice #{inv_id}?")],
        }

    # Fallback
    return {
        "final_response": content,
        "messages": [AIMessage(content=content)],
    }


def _format_invoice_list(invoices: list[dict]) -> str:
    if not invoices:
        return "No invoices found."
    lines = ["**Your Invoices:**\n"]
    for inv in invoices[:20]:
        status = inv.get("status", "UNKNOWN")
        total = inv.get("totalAmt", 0)
        lines.append(
            f"• **#{inv.get('docNumber', inv['id'])}** — "
            f"${float(total):,.2f} — {status} — {inv.get('txnDate', 'N/A')}"
        )
    if len(invoices) > 20:
        lines.append(f"\n...and {len(invoices) - 20} more.")
    return "\n".join(lines)


def _extract_json(text: str) -> dict:
    """Best-effort JSON extraction from model output."""
    import re
    # Try to find JSON block in markdown code fences
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    # Try raw JSON
    start = text.find("{")
    end = text.rfind("}") + 1
    if start >= 0 and end > start:
        return json.loads(text[start:end])
    raise ValueError("No JSON found in response")
