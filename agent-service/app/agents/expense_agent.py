"""Expense Management Agent — CRUD bills/expenses via Spring Boot.

Mirror of invoice_agent but for the bill/expense pathway.
Handles expense categorization by mapping to COA account types.

Enhanced with Tool Calling: the agent can autonomously look up suppliers,
accounts, and bills via bound tools.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from langchain_core.messages import AIMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.clients import spring_boot_client
from app.config import settings, get_api_key
from app.models.actions import ProposedAction, LineItemAction
from app.models.state import AgentState
from app.tools.accounting_tools import EXPENSE_TOOLS
from app.tools.tool_executor import run_agent_with_tools
from app.utils.message_trimmer import prepare_messages_for_llm

logger = logging.getLogger(__name__)

EXPENSE_SYSTEM_PROMPT = """\
You are an Expense Management Agent for an accounting system.

Your job is to help the user create, view, update, or delete bills and expenses.

You have access to tools to look up suppliers, accounts, and bills.
USE the tools to resolve supplier names to IDs and find the correct
expense account IDs rather than asking the user for IDs.

When the user wants to CREATE a bill/expense, extract:
- docNumber (bill number — accept ANY format the user provides, do NOT reject or question the format)
- txnDate (transaction date, default to today, format: YYYY-MM-DD)
- dueDate (optional, format: YYYY-MM-DD)
- supplierId or supplierName (use search_suppliers tool to resolve)
- memo (optional)
- lines: list of {description, amount, accountName}
  - Use the get_chart_of_accounts tool to find the correct account ID
    for each expense category.

When the user wants to VIEW bills, use the list_all_bills or
get_bill_details tools to fetch the data.

When the user wants to DELETE, confirm the bill ID.

If extracted_data from a document (receipt/bill image) is available, use it.

Once you have gathered enough information, respond as a JSON object with:
{
  "action": "create" | "list" | "get" | "update" | "delete",
  "data": { ... extracted fields ... }
}

If information is still missing after using tools, ask the user for it.
"""


def _get_model() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=get_api_key(),
        temperature=0.1,
        max_retries=0,
    )


async def expense_agent(state: AgentState) -> dict[str, Any]:
    """Process expense/bill-related requests with tool calling."""
    model = _get_model()
    token = state["auth_token"]
    company_id = state["company_id"]
    extracted = state.get("extracted_data")

    messages = prepare_messages_for_llm(
        system_prompt=EXPENSE_SYSTEM_PROMPT,
        state_messages=state["messages"],
        conversation_summary=state.get("conversation_summary"),
    )

    if extracted:
        messages.append(
            SystemMessage(content=f"Extracted document data:\n{json.dumps(extracted, indent=2)}")
        )

    # Run the tool-calling loop
    content, messages = await run_agent_with_tools(
        model=model,
        tools=EXPENSE_TOOLS,
        messages=messages,
        token=token,
        company_id=company_id,
        model_factory=_get_model,
    )

    try:
        parsed = _extract_json(content)
    except Exception:
        return {
            "final_response": content,
            "messages": [AIMessage(content=content)],
            "pending_intent": "EXPENSE_MGMT",
            "pending_context": {"awaiting": "user_details"},
        }

    action = parsed.get("action", "").lower()
    data = parsed.get("data", {})

    # ── Read operations ───────────────────────────────────────
    if action == "list":
        bills = await spring_boot_client.list_bills(token, company_id)
        summary = _format_bill_list(bills)
        return {
            "final_response": summary,
            "messages": [AIMessage(content=summary)],
            "pending_intent": None,
            "pending_context": None,
        }

    if action == "get":
        bill_id = data.get("id")
        if not bill_id:
            msg = "Which bill would you like to view? Please provide the bill ID or number."
            return {"final_response": msg, "messages": [AIMessage(content=msg)]}
        bill = await spring_boot_client.get_bill(int(bill_id), token, company_id)
        summary = f"**Bill #{bill.get('docNumber', bill_id)}**\n" + json.dumps(bill, indent=2, default=str)
        return {"final_response": summary, "messages": [AIMessage(content=summary)]}

    # ── Write operations — build ProposedAction ───────────────
    if action == "create":
        # Resolve account IDs from names (fallback if tools didn't resolve)
        try:
            accounts = await spring_boot_client.get_account_tree(token, company_id)
            account_map = _flatten_accounts(accounts)
        except Exception:
            account_map = {}

        line_items = []
        for line in data.get("lines", []):
            amount = float(line.get("amount", 0))
            acct_name = line.get("accountName", line.get("account_name", ""))
            acct_id = line.get("accountId", line.get("account_id"))
            if not acct_id:
                acct_id = _resolve_account_id(acct_name, account_map)

            line_items.append(LineItemAction(
                description=line.get("description", ""),
                quantity=1.0,
                unit_price=amount,
                amount=amount,
                account_id=acct_id,
                account_name=acct_name or "Uncategorized",
            ))

        total = sum(li.amount for li in line_items)

        # Resolve supplier (fallback if tools didn't resolve)
        supplier_name = data.get("supplierName", data.get("supplier_name", ""))
        supplier_id = data.get("supplierId", data.get("supplier_id"))

        if supplier_name and not supplier_id:
            try:
                suppliers = await spring_boot_client.list_suppliers(token, company_id)
                for s in suppliers:
                    if s.get("name", "").lower() == supplier_name.lower():
                        supplier_id = s["id"]
                        break
            except Exception:
                pass

        proposed = ProposedAction(
            action_type="CREATE_BILL",
            summary=f"Create bill {data.get('docNumber', 'NEW')} from {supplier_name or 'unknown supplier'} — ${total:,.2f}",
            doc_number=data.get("docNumber", data.get("doc_number")),
            txn_date=data.get("txnDate", data.get("txn_date")),
            due_date=data.get("dueDate", data.get("due_date")),
            supplier_id=int(supplier_id) if supplier_id else None,
            supplier_name=supplier_name,
            memo=data.get("memo"),
            line_items=line_items,
            total_amount=total,
        )

        confirmation_msg = (
            f"I've prepared this expense for you:\n\n"
            f"**{proposed.summary}**\n\n"
            f"Line items:\n"
            + "\n".join(
                f"  • {li.description} ({li.account_name}) — ${li.amount:,.2f}"
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
            "pending_intent": None,
            "pending_context": None,
        }

    if action == "delete":
        bill_id = data.get("id")
        proposed = ProposedAction(
            action_type="DELETE_BILL",
            summary=f"Delete bill #{bill_id}",
            target_id=int(bill_id) if bill_id else None,
        )
        return {
            "proposed_action": proposed.model_dump(),
            "confirmation_status": "pending",
            "final_response": f"Are you sure you want to delete bill #{bill_id}? Click **Confirm** to proceed.",
            "messages": [AIMessage(content=f"Delete bill #{bill_id}?")],
        }

    return {"final_response": content, "messages": [AIMessage(content=content)]}


def _flatten_accounts(tree: list[dict]) -> dict[str, int]:
    """Flatten account tree into {lowercase_name: id} map."""
    result = {}
    for node in tree:
        result[node.get("name", "").lower()] = node.get("id")
        for child in node.get("children", []):
            result[child.get("name", "").lower()] = child.get("id")
            for grandchild in child.get("children", []):
                result[grandchild.get("name", "").lower()] = grandchild.get("id")
    return result


def _resolve_account_id(name: str, account_map: dict[str, int]) -> int | None:
    if not name:
        return None
    lower = name.lower()
    if lower in account_map:
        return account_map[lower]
    # Fuzzy match — find closest
    for key, val in account_map.items():
        if lower in key or key in lower:
            return val
    return None


def _format_bill_list(bills: list[dict]) -> str:
    if not bills:
        return "No bills found."
    lines = ["**Your Bills:**\n"]
    for b in bills[:20]:
        status = b.get("status", "UNKNOWN")
        total = b.get("totalAmt", 0)
        lines.append(
            f"• **#{b.get('docNumber', b['id'])}** — "
            f"${float(total):,.2f} — {status} — {b.get('txnDate', 'N/A')}"
        )
    if len(bills) > 20:
        lines.append(f"\n...and {len(bills) - 20} more.")
    return "\n".join(lines)


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
