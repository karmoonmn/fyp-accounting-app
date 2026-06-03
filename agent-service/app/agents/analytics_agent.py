"""Analytics Agent — forecasting via the ML service.

Calls the existing ML microservice (:8001) to generate income/expense
forecasts and translates the predictions into natural language insights.
"""

from __future__ import annotations

import json
import logging
from datetime import date, timedelta
from typing import Any

from langchain_core.messages import AIMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.clients import ml_client, spring_boot_client
from app.config import settings
from app.models.state import AgentState

logger = logging.getLogger(__name__)

ANALYTICS_SYSTEM_PROMPT = """\
You are a Financial Analytics Agent. You provide forecasting and
predictive insights based on ML model predictions.

When the user asks about future income, expenses, or financial
projections, you will:
1. Determine the forecast type (revenue or expense)
2. Determine the time horizon (months ahead)
3. Call the ML forecasting service
4. Interpret the results in plain language

Respond with JSON:
{{
  "forecasts": [
    {{"type": "revenue", "months_ahead": 6, "category": "Total"}},
    {{"type": "expense", "months_ahead": 6, "category": "Total"}}
  ]
}}

Categories for expenses: Total, Travel Expense, Payroll Expense,
Office Expense, Operating Expense, Non-operating Expense.
"""


def _get_model() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.google_api_key,
        temperature=0.1,
    )


async def analytics_agent(state: AgentState) -> dict[str, Any]:
    """Generate financial forecasts using the ML service."""
    model = _get_model()
    token = state["auth_token"]
    company_id = state["company_id"]

    # Step 1: Determine what forecasts to run
    messages = [
        SystemMessage(content=ANALYTICS_SYSTEM_PROMPT),
        *state["messages"],
    ]

    response = await model.ainvoke(messages)

    try:
        plan = _extract_json(response.content)
    except Exception:
        plan = {"forecasts": [
            {"type": "revenue", "months_ahead": 6, "category": "Total"},
            {"type": "expense", "months_ahead": 6, "category": "Total"},
        ]}

    # Step 2: Gather historical data from Spring Boot
    today = date.today()
    start = (today - timedelta(days=730)).isoformat()  # 2 years back
    end = today.isoformat()

    try:
        pl_data = await spring_boot_client.get_profit_loss(start, end, token, company_id)
    except Exception as e:
        logger.warning("Failed to get P&L for forecasting: %s", e)
        pl_data = {}

    # Build historical data points from revenue/expense accounts
    historical_revenue = _extract_monthly_data(pl_data, "revenueAccounts")
    historical_expense = _extract_monthly_data(pl_data, "expenseAccounts")

    # Step 3: Call ML service for each forecast
    results = []
    for fc in plan.get("forecasts", []):
        fc_type = fc.get("type", "revenue")
        months = fc.get("months_ahead", 6)
        category = fc.get("category", "Total")

        historical = historical_revenue if fc_type == "revenue" else historical_expense

        # Need at least 3 months of data
        if len(historical) < 3:
            # Generate synthetic baseline if not enough data
            historical = [
                {"month": (today - timedelta(days=30 * i)).strftime("%Y-%m"), "amount": 0}
                for i in range(6, 0, -1)
            ]

        try:
            prediction = await ml_client.predict(
                company_id=str(company_id),
                forecast_type=fc_type,
                months_ahead=months,
                historical_data=historical,
                category=category,
            )
            results.append({
                "type": fc_type,
                "category": category,
                "predictions": prediction.get("predictions", []),
                "metrics": prediction.get("metrics", {}),
            })
        except Exception as e:
            logger.warning("ML prediction failed for %s/%s: %s", fc_type, category, e)
            results.append({
                "type": fc_type,
                "category": category,
                "error": str(e),
            })

    # Step 4: Synthesize results into natural language
    synthesis_messages = [
        SystemMessage(content=(
            "You are a financial analyst. Interpret these ML forecasting results "
            "and provide actionable insights. Use markdown formatting.\n"
            "Include:\n"
            "- Monthly projections with dollar amounts\n"
            "- Trends (increasing/decreasing)\n"
            "- Confidence/reliability notes based on model metrics\n"
            "- Actionable recommendations\n\n"
            f"User's question: {state['user_input']}\n\n"
            f"Forecast results:\n{json.dumps(results, indent=2, default=str)}"
        )),
    ]

    final = await model.ainvoke(synthesis_messages)

    return {
        "final_response": final.content,
        "query_results": results,
        "messages": [AIMessage(content=final.content)],
        "response_metadata": {
            **(state.get("response_metadata") or {}),
            "tools_used": ["analytics_agent", "ml_service"],
            "forecasts_run": len(results),
        },
    }


def _extract_monthly_data(pl_data: dict, account_key: str) -> list[dict]:
    """Extract monthly totals from P&L data for ML input."""
    accounts = pl_data.get(account_key, [])
    if not accounts:
        return []

    # Sum all account balances as a single monthly total
    total = sum(float(acc.get("balance", 0)) for acc in accounts)
    today = date.today()

    # Create a simple 6-month history spread (approximation)
    # In production, you'd query actual monthly journal entries
    monthly = []
    for i in range(6, 0, -1):
        month_date = today - timedelta(days=30 * i)
        monthly.append({
            "month": month_date.strftime("%Y-%m"),
            "amount": round(total / 6, 2),  # Even spread as baseline
        })
    return monthly


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
