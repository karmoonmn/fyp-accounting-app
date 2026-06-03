"""HTTP client for the Spring Boot accounting backend (:8080)."""

from __future__ import annotations

import logging
from typing import Any, Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# Reusable async client (connection pooling)
_client: Optional[httpx.AsyncClient] = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            base_url=settings.spring_boot_base_url,
            timeout=30.0,
        )
    return _client


async def close_client() -> None:
    global _client
    if _client and not _client.is_closed:
        await _client.aclose()
        _client = None


def _headers(token: str, company_id: int) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "X-Company-Id": str(company_id),
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


# ── Invoice Operations ────────────────────────────────────────────────────────


async def list_invoices(token: str, company_id: int) -> list[dict]:
    client = _get_client()
    r = await client.get("/invoice", headers=_headers(token, company_id))
    r.raise_for_status()
    return r.json()


async def get_invoice(invoice_id: int, token: str, company_id: int) -> dict:
    client = _get_client()
    r = await client.get(f"/invoice/{invoice_id}", headers=_headers(token, company_id))
    r.raise_for_status()
    return r.json()


async def create_invoice(payload: dict, token: str, company_id: int) -> dict:
    client = _get_client()
    r = await client.post("/invoice", json=payload, headers=_headers(token, company_id))
    r.raise_for_status()
    return r.json()


async def update_invoice(invoice_id: int, payload: dict, token: str, company_id: int) -> dict:
    client = _get_client()
    r = await client.put(f"/invoice/{invoice_id}", json=payload, headers=_headers(token, company_id))
    r.raise_for_status()
    return r.json()


async def delete_invoice(invoice_id: int, token: str, company_id: int) -> None:
    client = _get_client()
    r = await client.delete(f"/invoice/{invoice_id}", headers=_headers(token, company_id))
    r.raise_for_status()


# ── Bill Operations ───────────────────────────────────────────────────────────


async def list_bills(token: str, company_id: int) -> list[dict]:
    client = _get_client()
    r = await client.get("/bill", headers=_headers(token, company_id))
    r.raise_for_status()
    return r.json()


async def get_bill(bill_id: int, token: str, company_id: int) -> dict:
    client = _get_client()
    r = await client.get(f"/bill/{bill_id}", headers=_headers(token, company_id))
    r.raise_for_status()
    return r.json()


async def create_bill(payload: dict, token: str, company_id: int) -> dict:
    client = _get_client()
    r = await client.post("/bill", json=payload, headers=_headers(token, company_id))
    r.raise_for_status()
    return r.json()


async def update_bill(bill_id: int, payload: dict, token: str, company_id: int) -> dict:
    client = _get_client()
    r = await client.put(f"/bill/{bill_id}", json=payload, headers=_headers(token, company_id))
    r.raise_for_status()
    return r.json()


async def delete_bill(bill_id: int, token: str, company_id: int) -> None:
    client = _get_client()
    r = await client.delete(f"/bill/{bill_id}", headers=_headers(token, company_id))
    r.raise_for_status()


# ── Account / COA Operations ─────────────────────────────────────────────────


async def get_account_tree(token: str, company_id: int) -> list[dict]:
    client = _get_client()
    r = await client.get("/account/tree", headers=_headers(token, company_id))
    r.raise_for_status()
    return r.json()


async def list_accounts(token: str, company_id: int) -> dict:
    client = _get_client()
    r = await client.get("/account?page=0&size=200", headers=_headers(token, company_id))
    r.raise_for_status()
    return r.json()


# ── Customer Operations ──────────────────────────────────────────────────────


async def list_customers(token: str, company_id: int) -> list[dict]:
    client = _get_client()
    r = await client.get("/customer", headers=_headers(token, company_id))
    r.raise_for_status()
    return r.json()


# ── Supplier Operations ──────────────────────────────────────────────────────


async def list_suppliers(token: str, company_id: int) -> list[dict]:
    client = _get_client()
    r = await client.get("/supplier", headers=_headers(token, company_id))
    r.raise_for_status()
    return r.json()


# ── Report Operations ─────────────────────────────────────────────────────────


async def get_profit_loss(start_date: str, end_date: str, token: str, company_id: int) -> dict:
    client = _get_client()
    r = await client.get(
        "/api/reports/profit-loss",
        params={"startDate": start_date, "endDate": end_date},
        headers=_headers(token, company_id),
    )
    r.raise_for_status()
    return r.json()


async def get_balance_sheet(as_of_date: str, token: str, company_id: int) -> dict:
    client = _get_client()
    r = await client.get(
        "/api/reports/balance-sheet",
        params={"asOfDate": as_of_date},
        headers=_headers(token, company_id),
    )
    r.raise_for_status()
    return r.json()


async def get_expense_analysis(year: int, token: str, company_id: int) -> dict:
    client = _get_client()
    r = await client.get(
        "/api/reports/expense-analysis",
        params={"year": year},
        headers=_headers(token, company_id),
    )
    r.raise_for_status()
    return r.json()


async def get_ar_aging(token: str, company_id: int) -> dict:
    client = _get_client()
    r = await client.get("/api/reports/ar-aging", headers=_headers(token, company_id))
    r.raise_for_status()
    return r.json()


async def get_ap_aging(token: str, company_id: int) -> dict:
    client = _get_client()
    r = await client.get("/api/reports/ap-aging", headers=_headers(token, company_id))
    r.raise_for_status()
    return r.json()
