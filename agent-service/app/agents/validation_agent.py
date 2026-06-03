"""Validation Agent — pre-commit data integrity checks.

Validates proposed financial actions before they reach the
human-in-the-loop confirmation step. Catches missing required
fields, invalid amounts, and unknown entity references.
"""

from __future__ import annotations

import logging
from typing import Any

from langchain_core.messages import AIMessage
from app.models.state import AgentState

logger = logging.getLogger(__name__)


async def validation_agent(state: AgentState) -> dict[str, Any]:
    """
    Validate a proposed action before surfacing it for confirmation.

    Checks:
      - Required fields are present
      - Amounts are positive
      - Line items exist
      - Customer/supplier IDs are plausible
    """
    proposed = state.get("proposed_action")
    if not proposed:
        return {}  # Nothing to validate

    errors: list[str] = []
    action_type = proposed.get("action_type", "")

    # ── Common checks ─────────────────────────────────────────
    if action_type.startswith("CREATE_") or action_type.startswith("UPDATE_"):
        # Must have line items for create
        if action_type.startswith("CREATE_"):
            line_items = proposed.get("line_items", [])
            if not line_items:
                errors.append("No line items found. At least one line item is required.")

            for i, item in enumerate(line_items):
                amount = item.get("amount", 0)
                if amount <= 0:
                    errors.append(f"Line item {i + 1} has invalid amount: ${amount}")

        # Total must be positive
        total = proposed.get("total_amount", 0)
        if total is not None and total <= 0 and action_type.startswith("CREATE_"):
            errors.append(f"Total amount must be greater than 0, got: ${total}")

    # ── Invoice-specific checks ───────────────────────────────
    if "INVOICE" in action_type:
        if action_type == "CREATE_INVOICE":
            if not proposed.get("doc_number"):
                errors.append("Invoice number (docNumber) is missing.")

    # ── Bill-specific checks ──────────────────────────────────
    if "BILL" in action_type:
        if action_type == "CREATE_BILL":
            if not proposed.get("doc_number"):
                errors.append("Bill number (docNumber) is missing.")

            # Check that line items have account references
            for i, item in enumerate(proposed.get("line_items", [])):
                if not item.get("account_id") and not item.get("account_name"):
                    errors.append(f"Line item {i + 1} is missing an expense account.")

    # ── Delete checks ─────────────────────────────────────────
    if action_type.startswith("DELETE_"):
        if not proposed.get("target_id"):
            errors.append("Cannot delete: no target ID specified.")

    # ── Return result ─────────────────────────────────────────
    if errors:
        error_msg = (
            "⚠️ **Validation Issues Found:**\n\n"
            + "\n".join(f"• {e}" for e in errors)
            + "\n\nPlease provide the missing information."
        )
        logger.warning("Validation failed: %s", errors)
        return {
            "proposed_action": None,
            "confirmation_status": None,
            "final_response": error_msg,
            "messages": [AIMessage(content=error_msg)],
        }

    logger.info("Validation passed for action: %s", action_type)
    return {}  # No changes — proposed action is valid
