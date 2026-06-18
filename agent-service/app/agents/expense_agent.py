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
from app.config import settings
from app.utils.llm import get_resilient_model
from app.models.actions import ProposedAction, LineItemAction
from app.models.state import AgentState
from app.tools.accounting_tools import EXPENSE_TOOLS
from app.tools.tool_executor import run_agent_with_tools
from app.utils.message_trimmer import prepare_messages_for_llm

logger = logging.getLogger(__name__)

EXPENSE_SYSTEM_PROMPT = """\
You are an Expense Management Agent for an accounting system.

Your job is to help the user create, view, update, or delete bills and expenses.
YOU ARE FULLY CAPABLE OF CREATING, UPDATING, AND DELETING BILLS AND EXPENSES.
When you are ready to create a bill, you MUST use the create_bill_action tool.

You have access to tools to look up suppliers, bills, and accounts.
USE the tools to resolve supplier names to IDs and look up bill details
rather than asking the user for IDs.

CRITICAL INSTRUCTION: To create a bill, you MUST call the `create_bill_action` tool with the extracted data.

When the user wants to CREATE a bill/expense, extract:
- docNumber (bill number — accept ANY format the user provides, do NOT reject or question the format)
- txnDate (transaction date, default to today, format: YYYY-MM-DD)
- dueDate (optional, format: YYYY-MM-DD)
- supplierId (use search_suppliers tool to resolve)
- supplierName (CRITICAL: You MUST extract the raw supplier name exactly as provided by the user, e.g. 'abc')
- memo (optional)
- lines: list of {description, amount, accountId, accountName}
  - You MUST populate accountId using the ID from the AVAILABLE ACCOUNTS list injected below!
  - You MUST populate accountName using the exact name of the account you chose.

When the user wants to VIEW bills, use the list_all_bills or
get_bill_details tools to fetch the data.

When the user wants to DELETE, confirm the bill ID.

If extracted_data from a document (receipt/bill image) is available, use it.

Once you have gathered enough information to create a bill, CALL the `create_bill_action` tool.
For update or delete operations, output a JSON block like:
{
  "action": "update" | "delete",
  "data": { ... }
}

If information is still missing after using tools, ask the user for it.
"""


def _get_model():
    return get_resilient_model(temperature=0.1)


async def expense_agent(state: AgentState) -> dict[str, Any]:
    """Process expense/bill-related requests with tool calling."""
    model = _get_model()
    token = state["auth_token"]
    company_id = state["company_id"]
    extracted = state.get("extracted_data")

    try:
        accounts = await spring_boot_client.get_account_tree(token, company_id)
        from app.agents.expense_agent import _flatten_accounts
        account_map = _flatten_accounts(accounts)
        account_context = f"\n\nAVAILABLE ACCOUNTS (Name -> ID):\n{json.dumps(account_map, indent=2)}\nIMPORTANT: You MUST select the most appropriate account ID from this list for each expense line item!"
    except Exception as e:
        logger.warning(f"Failed to fetch accounts for prompt injection: {e}")
        account_context = ""

    dynamic_prompt = EXPENSE_SYSTEM_PROMPT + account_context

    messages = prepare_messages_for_llm(
        system_prompt=dynamic_prompt,
        state_messages=state["messages"],
        conversation_summary=state.get("conversation_summary"),
    )

    if extracted:
        messages.append(
            SystemMessage(content=f"Extracted document data:\n{json.dumps(extracted, indent=2)}")
        )

    original_msg_count = len(messages)

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
        new_msgs = messages[original_msg_count:]
        if not new_msgs:
            new_msgs = [AIMessage(content=content)]
        return {
            "final_response": content,
            "messages": new_msgs,
            "pending_intent": "EXPENSE_MGMT",
            "pending_context": {"awaiting": "user_details"},
        }

    action = parsed.get("action", "").lower()
    data = parsed.get("data", {})

    # ── Read operations ───────────────────────────────────────
    if action == "list":
        bills = await spring_boot_client.list_bills(token, company_id)
        summary = _format_bill_list(bills)
        new_msgs = messages[original_msg_count:] + [AIMessage(content=summary)]
        return {
            "final_response": summary,
            "messages": new_msgs,
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
        new_msgs = messages[original_msg_count:] + [AIMessage(content=summary)]
        return {"final_response": summary, "messages": new_msgs}

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
            qty = float(line.get("quantity", 1))
            price = float(line.get("unitPrice", 0))
            explicit_amt = line.get("amount")
            # If AI passed amount directly instead of unitPrice, use it
            if explicit_amt and price == 0:
                final_amt = float(explicit_amt)
            else:
                final_amt = round(qty * price, 2)
            
            acct_name = line.get("accountName", line.get("account_name", ""))
            acct_id = line.get("accountId", line.get("account_id"))
            if not acct_id:
                acct_id = _resolve_account_id(acct_name, account_map)
            
            # Fallback for missing account ID to prevent 500 error
            if not acct_id:
                acct_id = account_map.get("uncategorized expense") or account_map.get("miscellaneous expense")
            
            if not acct_id:
                msg = f"I need an expense category (account) for the '{line.get('description', 'item')}'. What kind of expense is this?"
                return {"final_response": msg, "messages": messages[original_msg_count:] + [AIMessage(content=msg)]}

            line_items.append(LineItemAction(
                description=line.get("description", ""),
                quantity=qty,
                unit_price=price,
                amount=final_amt,
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

        new_msgs = messages[original_msg_count:] + [AIMessage(content=confirmation_msg)]

        return {
            "proposed_action": proposed.model_dump(),
            "confirmation_status": "pending",
            "final_response": confirmation_msg,
            "messages": new_msgs,
            "pending_intent": None,
            "pending_context": None,
        }

    if action == "delete":
        target_id = data.get("id")
        proposed = ProposedAction(
            action_type="DELETE_BILL",
            summary=f"Delete bill #{target_id}",
            target_id=int(target_id) if target_id else None,
        )
        new_msgs = messages[original_msg_count:] + [AIMessage(content=f"Delete bill #{target_id}?")]
        return {
            "proposed_action": proposed.model_dump(),
            "confirmation_status": "pending",
            "final_response": f"Are you sure you want to delete bill #{target_id}? Click **Confirm** to proceed.",
            "messages": new_msgs,
        }

    return {"final_response": content, "messages": messages}


def _flatten_accounts(tree: list[dict]) -> dict[str, int]:
    """Flatten account tree into {lowercase_name: id} map. Only includes leaf accounts!"""
    result = {}
    for node in tree:
        if not node.get("children"):
            result[node.get("name", "").lower()] = node.get("id")
        for child in node.get("children", []):
            if not child.get("children"):
                result[child.get("name", "").lower()] = child.get("id")
            for grandchild in child.get("children", []):
                if not grandchild.get("children"):
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
