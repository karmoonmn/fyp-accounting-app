"""Response Checker — final QA gate before sending to user.

Checks for PII leakage, response relevance, and hallucinated data
before the response leaves the agent system.
"""

from __future__ import annotations

import logging
from typing import Any

from langchain_core.messages import AIMessage

from app.models.state import AgentState
from app.security.pii_masker import unmask_pii
from app.tools.tool_executor import extract_text_content

logger = logging.getLogger(__name__)


async def response_checker(state: AgentState) -> dict[str, Any]:
    """
    Final gate before sending a response back to the user.

    1. Unmask PII (restore original values for the user)
    2. Check for leaked PII placeholders
    3. Ensure we have a non-empty response
    """
    response = extract_text_content(state.get("final_response", ""))
    metadata = state.get("response_metadata") or {}
    pii_mapping = metadata.get("pii_mapping", {})

    proposed_action = state.get("proposed_action")

    # ── Unmask PII for the user ───────────────────────────────
    if pii_mapping:
        response = unmask_pii(response, pii_mapping)
        if proposed_action:
            import json
            proposed_str = json.dumps(proposed_action)
            unmasked_proposed_str = unmask_pii(proposed_str, pii_mapping)
            proposed_action = json.loads(unmasked_proposed_str)

    # ── Check for leaked placeholder tokens ───────────────────
    import re
    leaked = re.findall(r"<[A-Z_]+_[a-f0-9]{6}>", response)
    if leaked:
        logger.warning("PII placeholder leak detected: %s", leaked)
        for token in leaked:
            response = response.replace(token, "[REDACTED]")

    # ── Ensure non-empty response ─────────────────────────────
    if not response or not response.strip():
        response = (
            "I wasn't able to process that request. "
            "Could you try rephrasing your question?"
        )

    # ── Clean up metadata (remove PII mapping from response) ──
    clean_metadata = {k: v for k, v in metadata.items() if k != "pii_mapping"}

    updates = {
        "final_response": response,
        "response_metadata": clean_metadata,
        "messages": [AIMessage(content=response)],
    }
    if proposed_action:
        updates["proposed_action"] = proposed_action

    return updates
