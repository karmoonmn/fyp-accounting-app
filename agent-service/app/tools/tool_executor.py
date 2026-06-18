"""Tool Executor — runs the Gemini ↔ Tool call loop.

Provides `run_agent_with_tools()`, a reusable async function that:
1. Sends messages to a model that has tools bound via `model.bind_tools()`.
2. If the model responds with tool calls → executes them → feeds results back.
3. Repeats until the model produces a final text response or hits max iterations.

Auth credentials (token, company_id) are injected into every tool call so
the @tool definitions themselves don't need to know about auth.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from langchain_core.messages import AIMessage, ToolMessage

from app.clients import spring_boot_client
from app.utils.llm_retry import invoke_with_retry

logger = logging.getLogger(__name__)

# Maximum tool-call iterations to prevent infinite loops
MAX_TOOL_ITERATIONS = 5


def extract_text_content(content) -> str:
    """Extract plain text from model response content.

    Gemini can return content as:
    - A plain string: "Hello world"
    - A list of parts: [{'type': 'text', 'text': 'Hello', 'extras': {...}}]

    This function normalises both to a plain string.
    """
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        text_parts = []
        for part in content:
            if isinstance(part, dict):
                text_parts.append(part.get("text", ""))
            elif isinstance(part, str):
                text_parts.append(part)
        return "\n".join(p for p in text_parts if p)
    return str(content) if content else ""


# ── Tool Execution Dispatch ───────────────────────────────────────────────────

async def _execute_tool(
    tool_name: str,
    tool_args: dict[str, Any],
    token: str,
    company_id: int,
) -> str:
    """
    Execute a single tool call by dispatching to the appropriate
    spring_boot_client method. Returns a JSON string of the result.
    """
    try:
        result: Any = None

        # ── Customer tools ────────────────────────────────────
        if tool_name == "search_customers":
            query = tool_args.get("query", "").lower()
            customers = await spring_boot_client.list_customers(token, company_id)
            result = [c for c in customers if query in c.get("name", "").lower()]

        elif tool_name == "list_all_customers":
            result = await spring_boot_client.list_customers(token, company_id)

        # ── Supplier tools ────────────────────────────────────
        elif tool_name == "search_suppliers":
            query = tool_args.get("query", "").lower()
            suppliers = await spring_boot_client.list_suppliers(token, company_id)
            result = [s for s in suppliers if query in s.get("name", "").lower()]

        elif tool_name == "list_all_suppliers":
            result = await spring_boot_client.list_suppliers(token, company_id)

        # ── Invoice tools ─────────────────────────────────────
        elif tool_name == "list_all_invoices":
            result = await spring_boot_client.list_invoices(token, company_id)

        elif tool_name == "get_invoice_details":
            inv_id = tool_args.get("invoice_id")
            result = await spring_boot_client.get_invoice(int(inv_id), token, company_id)

        # ── Bill tools ────────────────────────────────────────
        elif tool_name == "list_all_bills":
            result = await spring_boot_client.list_bills(token, company_id)

        elif tool_name == "get_bill_details":
            bill_id = tool_args.get("bill_id")
            result = await spring_boot_client.get_bill(int(bill_id), token, company_id)

        # ── Account tools ─────────────────────────────────────
        elif tool_name == "get_chart_of_accounts":
            result = await spring_boot_client.get_account_tree(token, company_id)

        # ── Report tools ──────────────────────────────────────
        elif tool_name == "get_profit_and_loss":
            result = await spring_boot_client.get_profit_loss(
                tool_args.get("start_date", ""),
                tool_args.get("end_date", ""),
                token, company_id,
            )

        elif tool_name == "get_balance_sheet":
            result = await spring_boot_client.get_balance_sheet(
                tool_args.get("as_of_date", ""),
                token, company_id,
            )

        elif tool_name == "get_expense_analysis":
            result = await spring_boot_client.get_expense_analysis(
                int(tool_args.get("year", 2025)),
                token, company_id,
            )

        elif tool_name == "get_accounts_receivable_aging":
            result = await spring_boot_client.get_ar_aging(token, company_id)

        elif tool_name == "get_accounts_payable_aging":
            result = await spring_boot_client.get_ap_aging(token, company_id)

        else:
            return json.dumps({"error": f"Unknown tool: {tool_name}"})

        # Truncate very large results to avoid blowing up the context window
        text = json.dumps(result, indent=2, default=str)
        if len(text) > 8000:
            text = text[:8000] + "\n... [TRUNCATED — too many results]"
        return text

    except Exception as e:
        logger.warning("Tool %s failed: %s", tool_name, e)
        return json.dumps({"error": str(e)})


# ── Main Loop ─────────────────────────────────────────────────────────────────


async def run_agent_with_tools(
    model,
    tools: list,
    messages: list,
    token: str,
    company_id: int,
    max_iterations: int = MAX_TOOL_ITERATIONS,
    model_factory=None,
) -> tuple[str, list]:
    """
    Run the LLM ↔ tool-call loop.

    Parameters
    ----------
    model : ChatGoogleGenerativeAI
        The base model (NOT yet tool-bound; this function binds tools).
    tools : list
        List of @tool-decorated functions to make available.
    messages : list
        The initial messages to send (system + conversation history).
    token : str
        Auth token for Spring Boot API calls.
    company_id : int
        Company ID for Spring Boot API calls.
    max_iterations : int
        Safety cap on tool-call rounds.
    model_factory : callable, optional
        A function that returns a fresh model (with a new API key).
        Used for key rotation on retry. If None, retries with same model.

    Returns
    -------
    tuple[str, list]
        (final_text_response, updated_messages_list)
    """
    for iteration in range(max_iterations):
        # Use call_factory so each retry gets a fresh model + key
        if model_factory:
            response: AIMessage = await invoke_with_retry(
                call_factory=lambda: model_factory().bind_tools(tools).ainvoke(messages)
            )
        else:
            bound_model = model.bind_tools(tools)
            response: AIMessage = await invoke_with_retry(
                call_factory=lambda: bound_model.ainvoke(messages)
            )
        messages.append(response)
        logger.info("AI Raw Response content: %s", response.content)

        # If no tool calls → the model produced a final text answer
        if not response.tool_calls:
            logger.info("Tool loop finished after %d iteration(s)", iteration + 1)
            return extract_text_content(response.content), messages

        # Process each tool call
        logger.info(
            "Iteration %d: model requested %d tool call(s): %s",
            iteration + 1,
            len(response.tool_calls),
            [tc["name"] for tc in response.tool_calls],
        )

        for tc in response.tool_calls:
            tool_name = tc["name"]
            tool_args = tc.get("args", {})
            tool_id = tc.get("id", tool_name)

            # Intercept write operations so we don't actually execute them or loop back
            if tool_name in ["create_invoice_action", "create_bill_action"]:
                # Resolve the tool call so the LLM doesn't crash on the next turn with a 400 Bad Request
                messages.append(
                    ToolMessage(content="Action proposed to user for confirmation.", tool_call_id=tool_id)
                )
                action_str = "create" # map to the expected action string in invoice_agent/expense_agent
                return json.dumps({"action": action_str, "data": tool_args}), messages

            result_str = await _execute_tool(tool_name, tool_args, token, company_id)

            # Feed the tool result back to the model
            messages.append(
                ToolMessage(content=result_str, tool_call_id=tool_id)
            )

    # Safety: if we hit max iterations, return whatever we have
    logger.warning("Tool loop hit max iterations (%d)", max_iterations)
    last_content = extract_text_content(messages[-1].content) if messages else "I was unable to complete the request."
    return last_content, messages
