"""Context Router — smart multi-turn intent resolver.

Sits between preprocess and classifier.  When a ``pending_intent``
exists in state (meaning the previous turn was mid-task), this node
uses a lightweight LLM call to decide whether the user's new message
is a **continuation** of that task or a **brand-new intent**.

Decision outcomes:
  CONTINUE  → skip the classifier, route directly to the pending agent
  NEW_INTENT → clear pending state, let the classifier handle routing
"""

from __future__ import annotations

import logging
from typing import Any

from langchain_core.messages import SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import settings, get_api_key
from app.models.state import AgentState
from app.utils.message_trimmer import prepare_messages_for_llm
from app.utils.llm_retry import invoke_with_retry

logger = logging.getLogger(__name__)

CONTEXT_ROUTER_PROMPT = """\
You are a conversation-context analyser for an accounting AI assistant.

The user was previously in the middle of a task: **{pending_intent}**.
Partial context collected so far: {pending_context}

The user's latest message is shown in the conversation history below.

Decide:
• **CONTINUE** — the new message is providing more details, corrections,
  or follow-up information for the pending task (e.g. giving a customer
  name after being asked, providing line-item details, confirming amounts).
• **NEW_INTENT** — the new message is a completely new, unrelated request
  (e.g. asking about revenue while an invoice was being created, or
  saying "never mind").

Respond with EXACTLY one word: CONTINUE or NEW_INTENT
"""


def _get_model() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=get_api_key(),
        temperature=0.0,
        max_retries=0,
    )


async def context_router(state: AgentState) -> dict[str, Any]:
    """
    Decide whether to continue a pending multi-turn task or start fresh.

    Returns
    -------
    dict
        - If no pending_intent → no-op (let classifier decide).
        - If CONTINUE → sets ``classification`` to the pending intent so
          the classifier is effectively skipped.
        - If NEW_INTENT → clears ``pending_intent`` / ``pending_context``
          so the classifier runs normally.
    """
    pending = state.get("pending_intent")

    logger.info(
        "Context router check — pending_intent=%s, pending_context=%s",
        pending, state.get("pending_context"),
    )

    # No pending task → nothing to decide, let classifier handle it
    if not pending:
        return {}

    model = _get_model()
    pending_ctx = state.get("pending_context") or {}

    prompt = CONTEXT_ROUTER_PROMPT.format(
        pending_intent=pending,
        pending_context=pending_ctx or "None",
    )

    messages = prepare_messages_for_llm(
        system_prompt=prompt,
        state_messages=state["messages"],
        conversation_summary=state.get("conversation_summary"),
    )

    response = await invoke_with_retry(
        call_factory=lambda: _get_model().ainvoke(messages)
    )
    decision = response.content.strip().upper()

    # Normalise — accept slight variations like "CONTINUE." or "New Intent"
    if "CONTINUE" in decision:
        decision = "CONTINUE"
    else:
        decision = "NEW_INTENT"

    logger.info(
        "Context router decision: %s (pending_intent=%s)",
        decision,
        pending,
    )

    if decision == "CONTINUE":
        # Short-circuit: inject the pending intent as the classification
        # so the graph skips the classifier and routes directly to the agent
        return {
            "classification": pending,
            "classification_confidence": 1.0,
        }
    else:
        # New topic — clear the pending state
        return {
            "pending_intent": None,
            "pending_context": None,
        }
