"""Pydantic models for proposed actions and human-in-the-loop confirmation."""

from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


# ── Proposed Action ───────────────────────────────────────────────────────────


class LineItemAction(BaseModel):
    """A single line item in a proposed invoice or bill."""

    description: str
    quantity: float = 1.0
    unit_price: float = 0.0
    amount: float = 0.0
    account_id: Optional[int] = None
    account_name: Optional[str] = None


class ProposedAction(BaseModel):
    """
    Represents a financial action the agent wants to execute.

    This is surfaced to the user for confirmation before any write
    operation hits the Spring Boot backend.
    """

    action_type: Literal[
        "CREATE_INVOICE",
        "UPDATE_INVOICE",
        "DELETE_INVOICE",
        "CREATE_BILL",
        "UPDATE_BILL",
        "DELETE_BILL",
        "CREATE_EXPENSE",
    ] = Field(description="The type of write operation.")

    summary: str = Field(
        description="Human-readable summary, e.g. 'Create invoice #INV-001 for Customer ABC totalling $1,250.00'."
    )

    # ── Invoice / Bill payload ────────────────────────────────
    doc_number: Optional[str] = None
    txn_date: Optional[str] = None          # ISO date string
    due_date: Optional[str] = None
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    supplier_id: Optional[int] = None
    supplier_name: Optional[str] = None
    memo: Optional[str] = None
    line_items: list[LineItemAction] = Field(default_factory=list)
    total_amount: Optional[float] = None

    # ── For update / delete ───────────────────────────────────
    target_id: Optional[int] = None         # existing invoice/bill ID


# ── Confirmation Signal ───────────────────────────────────────────────────────


class ConfirmationSignal(BaseModel):
    """
    Sent by the frontend (via Spring Boot bridge) to resume an
    interrupted LangGraph workflow.
    """

    action: Literal["confirm", "cancel", "modify"] = Field(
        description="The user's decision."
    )

    modification_payload: Optional[dict[str, Any]] = Field(
        default=None,
        description=(
            "If action='modify', this dict contains the fields the user "
            "changed.  Keys mirror ProposedAction fields."
        ),
    )
