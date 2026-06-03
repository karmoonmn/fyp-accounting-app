"""Query Decomposing Agent — breaks complex queries into parallel sub-tasks.

Used when the RAG agent detects a multi-part question that requires
querying multiple data sources and synthesizing results.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from langchain_core.messages import AIMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import settings
from app.models.state import AgentState

logger = logging.getLogger(__name__)

DECOMPOSE_SYSTEM_PROMPT = """\
You are a Query Decomposition Agent. Your job is to break a complex financial
question into 2-5 simpler sub-questions that can be answered independently
and then combined.

Rules:
- Each sub-question should map to a single data source query
- Sub-questions should be self-contained
- Include the time period in each sub-question if relevant
- Order them logically (dependencies first)

Respond with JSON:
{
  "sub_queries": [
    "What was total revenue for Q1 2025?",
    "What was total revenue for Q1 2024?",
    "What were the top 3 expense categories in Q1 2025?"
  ],
  "synthesis_instruction": "Compare the Q1 revenue year-over-year and identify expense trends."
}
"""


def _get_model() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.google_api_key,
        temperature=0.1,
    )


async def query_decomposer(state: AgentState) -> dict[str, Any]:
    """Decompose a complex question into sub-queries."""
    model = _get_model()

    messages = [
        SystemMessage(content=DECOMPOSE_SYSTEM_PROMPT),
        *state["messages"],
    ]

    response = await model.ainvoke(messages)

    try:
        parsed = _extract_json(response.content)
        sub_queries = parsed.get("sub_queries", [])
        logger.info("Decomposed into %d sub-queries.", len(sub_queries))
        return {
            "sub_queries": sub_queries,
            "response_metadata": {
                **(state.get("response_metadata") or {}),
                "synthesis_instruction": parsed.get("synthesis_instruction", ""),
            },
        }
    except Exception:
        logger.warning("Decomposition failed, returning original question.")
        return {"sub_queries": [state["user_input"]]}


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
