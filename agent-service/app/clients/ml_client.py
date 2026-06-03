"""HTTP client for the ML Forecasting Service (:8001)."""

from __future__ import annotations

import logging
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

_client: Optional[httpx.AsyncClient] = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            base_url=settings.ml_service_url,
            timeout=60.0,  # ML predictions can be slow
        )
    return _client


async def close_client() -> None:
    global _client
    if _client and not _client.is_closed:
        await _client.aclose()
        _client = None


async def predict(
    company_id: str,
    forecast_type: str,
    months_ahead: int,
    historical_data: list[dict],
    category: str = "Total",
) -> dict:
    """
    Call the ML service's /predict endpoint.

    Args:
        company_id: Company identifier.
        forecast_type: "revenue" or "expense".
        months_ahead: How many future months to forecast.
        historical_data: List of {"month": "2025-01", "amount": 12345.67}.
        category: Category label (e.g. "Total", "Travel Expense").

    Returns:
        ML service response with predictions and metrics.
    """
    client = _get_client()
    payload = {
        "companyId": str(company_id),
        "forecastType": forecast_type,
        "category": category,
        "monthsAhead": months_ahead,
        "historicalData": historical_data,
    }
    r = await client.post("/predict", json=payload)
    r.raise_for_status()
    return r.json()
