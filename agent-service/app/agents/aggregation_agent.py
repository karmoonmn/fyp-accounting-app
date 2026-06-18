"""Aggregation & Computation Agent — processes query results.

Takes raw data from the Spring Boot APIs, performs calculations
(sums, averages, period-over-period comparisons), and formats
results into a human-readable explanation with citations.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from langchain_core.messages import AIMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import settings
from app.utils.llm import get_resilient_model
from app.models.state import AgentState

logger = logging.getLogger(__name__)

AGGREGATION_SYSTEM_PROMPT = """\
You are a Financial Aggregation & Computation Agent.

Given raw financial data, your job is to:
1. Perform calculations: sums, averages, percentages, growth rates
2. Compare across periods (month-over-month, year-over-year)
3. Identify trends and anomalies
4. Format results clearly with:
   - Specific dollar amounts (formatted with commas)
   - Percentage changes (with direction arrows ↑↓)
   - Date ranges
   - Data source citations

Always explain HOW you arrived at each number. Show your work.
Use markdown formatting for readability.
"""


def _get_model():
    return get_resilient_model(temperature=0.1)


async def aggregation_agent(state: AgentState) -> dict[str, Any]:
    """Aggregate and compute results from raw query data."""
    model = _get_model()
    query_results = state.get("query_results", [])

    if not query_results:
        return {
            "final_response": "I couldn't find any data to analyze. Please try rephrasing your question.",
            "messages": [AIMessage(content="No data available for analysis.")],
        }

    messages = [
        SystemMessage(content=AGGREGATION_SYSTEM_PROMPT),
        SystemMessage(content=(
            f"User's original question: {state['user_input']}\n\n"
            f"Raw data:\n{json.dumps(query_results, indent=2, default=str)}"
        )),
        *state["messages"],
    ]

    response = await model.ainvoke(messages)

    return {
        "final_response": response.content,
        "messages": [AIMessage(content=response.content)],
        "response_metadata": {
            **(state.get("response_metadata") or {}),
            "tools_used": ["aggregation_agent"],
            "data_sources_count": len(query_results),
        },
    }
