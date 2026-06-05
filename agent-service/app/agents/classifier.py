"""Classification Agent — autonomous intent router.

Uses Gemini 2.5 Flash with Structured Output to classify user intent
into one of five routing labels, then updates the state so the graph
can branch accordingly.
"""

from __future__ import annotations

import logging
from typing import Any

from langchain_core.messages import SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import settings, get_api_key
from app.models.classification import ClassificationResult
from app.models.state import AgentState
from app.utils.message_trimmer import prepare_messages_for_llm
from app.utils.llm_retry import invoke_with_retry

logger = logging.getLogger(__name__)

CLASSIFICATION_SYSTEM_PROMPT = """\
You are an intent classifier for an AI-powered accounting system.

Given the user's message (and optionally extracted document data), classify
the intent into exactly ONE of these categories:

• INVOICE_PROCESS  — The user wants to create, read, update, or delete an invoice.
                      Also applies when they upload an invoice image/PDF.
• EXPENSE_MGMT     — The user wants to create, read, update, or delete a bill
                      or expense. Also applies for receipt images or expense reports.
• RAG_QUERY        — The user is asking a question about their financial data:
                      revenue, expenses, profit, trends, comparisons, aging, etc.
• ANALYTICS        — The user wants forecasting, predictions, or future projections
                      of income/expenses.
• OUT_OF_SCOPE     — The request has nothing to do with accounting or finance.

Consider the full conversation history when classifying.
If the user uploaded a document (image/PDF), the extracted data is included
in the message — use it for classification.

Be decisive. Always pick the most specific category.
"""


def _get_model() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=get_api_key(),
        temperature=0.0,
        max_retries=0,  # Disable SDK retry — our invoke_with_retry handles it
    )


async def classification_agent(state: AgentState) -> dict[str, Any]:
    """
    Classify the user's intent using Gemini structured output.

    Updates state with:
      - classification: the routing label
      - classification_confidence: model's confidence score
    """
    messages = prepare_messages_for_llm(
        system_prompt=CLASSIFICATION_SYSTEM_PROMPT,
        state_messages=state["messages"],
        conversation_summary=state.get("conversation_summary"),
    )

    result: ClassificationResult = await invoke_with_retry(
        call_factory=lambda: _get_model().with_structured_output(ClassificationResult).ainvoke(messages)
    )

    logger.info(
        "Classification: %s (confidence=%.2f) — %s",
        result.intent,
        result.confidence,
        result.reasoning,
    )

    return {
        "classification": result.intent,
        "classification_confidence": result.confidence,
    }
