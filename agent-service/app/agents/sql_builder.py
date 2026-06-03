"""SQL Query Builder — generates read-only SQL for financial queries.

Optimized for the existing Spring Boot MySQL schema. Generates safe,
read-only SQL and validates it before execution.

NOTE: In the current architecture, we primarily use Spring Boot REST APIs
for data access. This module is reserved for advanced queries that the
existing report endpoints can't handle (e.g., custom date groupings,
cross-entity joins). It does NOT execute SQL directly — it passes the
generated SQL to the aggregation agent for review.
"""

from __future__ import annotations

import logging
from typing import Any

from langchain_core.messages import AIMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import settings
from app.models.state import AgentState

logger = logging.getLogger(__name__)

SQL_BUILDER_SYSTEM_PROMPT = """\
You are a SQL Query Builder for a financial accounting database (MySQL).

Database Schema:
─────────────────
transaction (id, company_id, doc_number, txn_date, created_at, updated_at)
invoice (id, customer_id, total_amt, balance, ship_addr, ship_date, due_date, status)
  → inherits from transaction via id
bill (id, supplier_id, total_amt, balance, due_date, status)
  → inherits from transaction via id
payment (id, deposit_to, payment_type, total_amount)
  → inherits from transaction via id
journal_entry (id, total_debit, total_credit)
  → inherits from transaction via id

line (id, line_num, description, quantity, unit_price, amount, account_id, transaction_id)
journal_line (id, line_num, description, debit, credit, account_id, journal_entry_id)

account (id, account_code, name, account_type, is_active, parent_id, company_id)
  → account_type IN ('ASSET', 'LIABILITY', 'EXPENSE', 'EQUITY', 'REVENUE')

customer (id, name, email, phone_num, addr, company_id) — extends person
supplier (id, name, email, phone_num, addr, company_id) — extends person

payment_allocation (id, payment_id, invoice_id, bill_id, amount)

Rules:
1. ONLY generate SELECT statements. Never generate INSERT, UPDATE, DELETE, DROP, ALTER.
2. Always filter by company_id = {company_id} for data isolation.
3. Use proper JOINs — transaction is the parent table for invoice, bill, payment, journal_entry.
4. Format output as JSON:
   {{"sql": "SELECT ...", "explanation": "What this query does"}}
"""


def _get_model() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.google_api_key,
        temperature=0.0,
    )


async def sql_builder(state: AgentState) -> dict[str, Any]:
    """Generate a validated SQL query from a natural language question."""
    model = _get_model()
    company_id = state["company_id"]

    system = SQL_BUILDER_SYSTEM_PROMPT.replace("{company_id}", str(company_id))

    messages = [
        SystemMessage(content=system),
        *state["messages"],
    ]

    response = await model.ainvoke(messages)
    content = response.content

    # Validate the generated SQL
    try:
        import json, re
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if match:
            parsed = json.loads(match.group())
            sql = parsed.get("sql", "")

            # Safety validation
            sql_upper = sql.upper().strip()
            forbidden = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "CREATE"]
            for word in forbidden:
                if word in sql_upper.split():
                    raise ValueError(f"Unsafe SQL detected: contains {word}")

            if not sql_upper.startswith("SELECT"):
                raise ValueError("SQL must start with SELECT")

            logger.info("Generated SQL: %s", sql[:200])
            return {
                "sql_queries": [sql],
                "response_metadata": {
                    **(state.get("response_metadata") or {}),
                    "sql_explanation": parsed.get("explanation", ""),
                },
            }
    except (ValueError, json.JSONDecodeError) as e:
        logger.warning("SQL generation/validation failed: %s", e)

    return {
        "sql_queries": [],
        "final_response": "I wasn't able to generate a safe query for that question. Let me try answering differently.",
        "messages": [AIMessage(content=content)],
    }
