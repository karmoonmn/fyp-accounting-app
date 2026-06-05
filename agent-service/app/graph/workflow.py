"""LangGraph Workflow — the full multi-agent financial graph.

Assembles all agents into a StateGraph with conditional routing
based on classification results and human-in-the-loop interrupts.
"""

from __future__ import annotations

import logging

from langchain_core.messages import SystemMessage

from langgraph.graph import StateGraph, START, END
from langgraph.types import interrupt, Command

from app.models.state import AgentState
from app.agents.preprocess import preprocess_node
from app.agents.classifier import classification_agent
from app.agents.context_router import context_router
from app.agents.invoice_agent import invoice_agent
from app.agents.expense_agent import expense_agent
from app.agents.rag_agent import rag_agent
from app.agents.analytics_agent import analytics_agent
from app.agents.validation_agent import validation_agent
from app.agents.out_of_scope import out_of_scope_agent
from app.agents.response_checker import response_checker
from app.clients import spring_boot_client
from app.utils.message_trimmer import trim_messages_for_llm

logger = logging.getLogger(__name__)


# ── Commit Node — executes confirmed actions via Spring Boot ──────────────────


async def commit_action(state: AgentState) -> dict:
    """Execute a confirmed proposed action against Spring Boot."""
    proposed = state.get("proposed_action")
    token = state["auth_token"]
    company_id = state["company_id"]

    if not proposed:
        return {"final_response": "No action to commit."}

    action_type = proposed.get("action_type", "")

    try:
        if action_type == "CREATE_INVOICE":
            payload = _build_invoice_payload(proposed)
            result = await spring_boot_client.create_invoice(payload, token, company_id)
            msg = f"✅ Invoice **#{result.get('docNumber', 'NEW')}** created successfully! (ID: {result.get('id')})"

        elif action_type == "DELETE_INVOICE":
            target_id = proposed.get("target_id")
            await spring_boot_client.delete_invoice(target_id, token, company_id)
            msg = f"✅ Invoice #{target_id} deleted successfully."

        elif action_type == "CREATE_BILL":
            payload = _build_bill_payload(proposed)
            result = await spring_boot_client.create_bill(payload, token, company_id)
            msg = f"✅ Bill **#{result.get('docNumber', 'NEW')}** created successfully! (ID: {result.get('id')})"

        elif action_type == "DELETE_BILL":
            target_id = proposed.get("target_id")
            await spring_boot_client.delete_bill(target_id, token, company_id)
            msg = f"✅ Bill #{target_id} deleted successfully."

        else:
            msg = f"⚠️ Unknown action type: {action_type}"

    except Exception as e:
        logger.exception("Commit failed for %s", action_type)
        msg = f"❌ Failed to execute action: {e}"

    return {
        "final_response": msg,
        "proposed_action": None,
        "confirmation_status": None,
    }


def _build_invoice_payload(proposed: dict) -> dict:
    """Convert ProposedAction → Spring Boot InvoiceReq JSON."""
    lines = []
    for item in proposed.get("line_items", []):
        lines.append({
            "description": item.get("description", ""),
            "quantity": item.get("quantity", 1),
            "unitPrice": item.get("unit_price", 0),
        })
    return {
        "docNumber": proposed.get("doc_number"),
        "txnDate": proposed.get("txn_date"),
        "dueDate": proposed.get("due_date"),
        "customerId": proposed.get("customer_id"),
        "lines": lines,
    }


def _build_bill_payload(proposed: dict) -> dict:
    """Convert ProposedAction → Spring Boot BillReq JSON."""
    lines = []
    for item in proposed.get("line_items", []):
        lines.append({
            "accountId": item.get("account_id"),
            "description": item.get("description", ""),
            "amount": item.get("amount", 0),
        })
    return {
        "docNumber": proposed.get("doc_number"),
        "txnDate": proposed.get("txn_date"),
        "dueDate": proposed.get("due_date"),
        "supplierId": proposed.get("supplier_id"),
        "memo": proposed.get("memo"),
        "lines": lines,
    }


# ── Trim History Node — compress old messages to keep LLM context small ───────


async def trim_history_node(state: AgentState) -> dict:
    """
    Compute a conversation summary if the message history is getting long.

    NOTE: We do NOT mutate state["messages"] here because it uses the
    ``add_messages`` reducer (append-only). Instead, we compute a
    ``conversation_summary`` that agents can inject into their local
    message lists via ``prepare_messages_for_llm()``.
    """
    messages = state.get("messages", [])
    existing_summary = state.get("conversation_summary")

    # Only summarize if we have more than MAX_RECENT messages
    from app.utils.message_trimmer import MAX_RECENT_MESSAGES
    convo_msgs = [m for m in messages if not isinstance(m, SystemMessage)]

    if len(convo_msgs) <= MAX_RECENT_MESSAGES:
        return {}

    # We need to summarize the older messages
    from app.utils.message_trimmer import _find_safe_split_point, _summarize_messages
    split_at = _find_safe_split_point(convo_msgs, len(convo_msgs) - MAX_RECENT_MESSAGES)
    old_msgs = convo_msgs[:split_at]

    if not old_msgs:
        return {}

    if existing_summary:
        old_msgs_with_context = [
            SystemMessage(content=f"Previous summary: {existing_summary}")
        ] + old_msgs
        new_summary = await _summarize_messages(old_msgs_with_context)
    else:
        new_summary = await _summarize_messages(old_msgs)

    logger.info("Generated conversation summary (%d chars)", len(new_summary))

    return {"conversation_summary": new_summary}


# ── Human-in-the-Loop Node ───────────────────────────────────────────────────


async def human_confirmation_node(state: AgentState) -> dict:
    """
    LangGraph interrupt — pauses execution and waits for user confirmation.

    The graph will be resumed via the /agent/confirm/{thread_id} endpoint.
    """
    proposed = state.get("proposed_action")
    if not proposed:
        return {}

    # This call suspends the graph until resumed externally
    user_decision = interrupt({
        "type": "confirmation_required",
        "proposed_action": proposed,
        "message": state.get("final_response", "Please confirm the action."),
    })

    # When resumed, user_decision contains the ConfirmationSignal
    action = user_decision.get("action", "cancel")

    if action == "confirm":
        return {"confirmation_status": "confirmed"}
    elif action == "modify":
        modification = user_decision.get("modification_payload", {})
        # Merge modifications into the proposed action
        updated = {**proposed, **modification}
        return {
            "proposed_action": updated,
            "confirmation_status": "confirmed",  # Auto-confirm modifications
        }
    else:
        return {
            "confirmation_status": "cancelled",
            "final_response": "❌ Action cancelled.",
            "proposed_action": None,
        }


# ── Routing Functions ─────────────────────────────────────────────────────────


def route_after_context_router(state: AgentState) -> str:
    """After context_router: skip classifier if classification is already set."""
    if state.get("classification"):
        # context_router decided CONTINUE and injected the classification
        return "route_to_agent"
    # No pending task, or NEW_INTENT — run the classifier
    return "classifier"


def route_classification(state: AgentState) -> str:
    """Route based on classification result."""
    classification = state.get("classification", "OUT_OF_SCOPE")
    route_map = {
        "INVOICE_PROCESS": "invoice_agent",
        "EXPENSE_MGMT": "expense_agent",
        "RAG_QUERY": "rag_agent",
        "ANALYTICS": "analytics_agent",
        "OUT_OF_SCOPE": "out_of_scope",
    }
    return route_map.get(classification, "out_of_scope")


def route_after_validation(state: AgentState) -> str:
    """Route after validation — to confirmation if action exists, else to response checker."""
    if state.get("proposed_action") and state.get("confirmation_status") == "pending":
        return "human_confirmation"
    return "response_checker"


def route_after_confirmation(state: AgentState) -> str:
    """Route after human decision — commit or go to response checker."""
    status = state.get("confirmation_status")
    if status == "confirmed":
        return "commit_action"
    return "response_checker"


# ── Graph Assembly ────────────────────────────────────────────────────────────


def build_graph() -> StateGraph:
    """
    Assemble the full multi-agent workflow.

    Flow:
      START → preprocess → classifier → [route] →
        INVOICE/EXPENSE → validation → [route] →
          has_action → human_confirmation → [route] →
            confirmed → commit_action → response_checker → END
            cancelled → response_checker → END
          no_action → response_checker → END
        RAG → response_checker → END
        ANALYTICS → response_checker → END
        OUT_OF_SCOPE → response_checker → END
    """
    graph = StateGraph(AgentState)

    # ── Add nodes ─────────────────────────────────────────────
    graph.add_node("preprocess", preprocess_node)
    graph.add_node("trim_history", trim_history_node)
    graph.add_node("context_router", context_router)
    graph.add_node("classifier", classification_agent)
    graph.add_node("invoice_agent", invoice_agent)
    graph.add_node("expense_agent", expense_agent)
    graph.add_node("rag_agent", rag_agent)
    graph.add_node("analytics_agent", analytics_agent)
    graph.add_node("out_of_scope", out_of_scope_agent)
    graph.add_node("validation", validation_agent)
    graph.add_node("human_confirmation", human_confirmation_node)
    graph.add_node("commit_action", commit_action)
    graph.add_node("response_checker", response_checker)

    # ── Edges ─────────────────────────────────────────────────
    graph.add_edge(START, "preprocess")
    graph.add_edge("preprocess", "trim_history")
    graph.add_edge("trim_history", "context_router")

    # Context router decides: skip classifier (CONTINUE) or run it (NEW_INTENT)
    graph.add_conditional_edges(
        "context_router",
        route_after_context_router,
        {
            "classifier": "classifier",
            "route_to_agent": "route_to_agent",
        },
    )

    # Dummy pass-through node for routing from context_router CONTINUE path
    graph.add_node("route_to_agent", lambda state: {})
    graph.add_conditional_edges(
        "route_to_agent",
        route_classification,
        {
            "invoice_agent": "invoice_agent",
            "expense_agent": "expense_agent",
            "rag_agent": "rag_agent",
            "analytics_agent": "analytics_agent",
            "out_of_scope": "out_of_scope",
        },
    )

    # Classification routing (normal path)
    graph.add_conditional_edges(
        "classifier",
        route_classification,
        {
            "invoice_agent": "invoice_agent",
            "expense_agent": "expense_agent",
            "rag_agent": "rag_agent",
            "analytics_agent": "analytics_agent",
            "out_of_scope": "out_of_scope",
        },
    )

    # After invoice/expense → validation
    graph.add_edge("invoice_agent", "validation")
    graph.add_edge("expense_agent", "validation")

    # After validation → confirmation or response checker
    graph.add_conditional_edges(
        "validation",
        route_after_validation,
        {
            "human_confirmation": "human_confirmation",
            "response_checker": "response_checker",
        },
    )

    # After confirmation → commit or response checker
    graph.add_conditional_edges(
        "human_confirmation",
        route_after_confirmation,
        {
            "commit_action": "commit_action",
            "response_checker": "response_checker",
        },
    )

    # Terminal edges
    graph.add_edge("commit_action", "response_checker")
    graph.add_edge("rag_agent", "response_checker")
    graph.add_edge("analytics_agent", "response_checker")
    graph.add_edge("out_of_scope", "response_checker")
    graph.add_edge("response_checker", END)

    return graph


def compile_graph(checkpointer=None):
    """Compile the graph with optional checkpointer for persistence."""
    graph = build_graph()
    return graph.compile(checkpointer=checkpointer)
