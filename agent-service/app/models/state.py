"""LangGraph Agent State — shared across all nodes."""

from __future__ import annotations

from typing import Annotated, Any, Literal, Optional
from typing_extensions import TypedDict

from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    """
    The canonical state object that flows through the entire LangGraph workflow.

    Every agent/node reads from and writes to this dict.  LangGraph's
    ``add_messages`` reducer keeps the ``messages`` list append-only so
    that conversation history is never lost between nodes.
    """

    # ── Conversation ──────────────────────────────────────────
    messages: Annotated[list, add_messages]

    # ── Raw Input ─────────────────────────────────────────────
    user_input: str
    input_type: Literal["text", "image", "pdf"]
    file_bytes: Optional[bytes]           # raw upload bytes (image/pdf)
    file_name: Optional[str]

    # ── Classification ────────────────────────────────────────
    classification: Optional[
        Literal[
            "INVOICE_PROCESS",
            "EXPENSE_MGMT",
            "RAG_QUERY",
            "ANALYTICS",
            "OUT_OF_SCOPE",
        ]
    ]
    classification_confidence: Optional[float]

    # ── Document Processing ───────────────────────────────────
    extracted_data: Optional[dict[str, Any]]  # OCR / parsed document

    # ── Proposed Action (Human-in-the-Loop) ───────────────────
    proposed_action: Optional[dict[str, Any]]
    confirmation_status: Optional[
        Literal["pending", "confirmed", "cancelled", "modified"]
    ]
    modification_payload: Optional[dict[str, Any]]

    # ── RAG / Query ───────────────────────────────────────────
    sub_queries: Optional[list[str]]
    query_results: Optional[list[dict[str, Any]]]
    sql_queries: Optional[list[str]]

    # ── Final Output ──────────────────────────────────────────
    final_response: Optional[str]
    response_metadata: Optional[dict[str, Any]]  # citations, tool list, etc.

    # ── Auth / Context ────────────────────────────────────────
    company_id: int
    auth_token: str
    thread_id: str

    # ── Multi-Turn Memory ─────────────────────────────────────
    pending_intent: Optional[str]             # e.g. "INVOICE_PROCESS" when awaiting details
    pending_context: Optional[dict[str, Any]] # partially collected data from prior turns
