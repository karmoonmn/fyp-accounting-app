"""Supabase repository for conversation_state table.

Persists pending_intent and pending_context per conversation so that
multi-turn context survives across server restarts and is isolated per
chat thread.

Table expected (already created in Supabase):

    CREATE TABLE conversation_state (
        conversation_id UUID PRIMARY KEY,
        pending_intent  TEXT,
        pending_context JSONB,
        summary         TEXT,
        updated_at      TIMESTAMPTZ DEFAULT NOW()
    );
"""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

import asyncpg

logger = logging.getLogger(__name__)


class ConversationStateRepo:
    """Thin async wrapper around the conversation_state table."""

    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    # ── Read ──────────────────────────────────────────────────────────────────

    async def load(self, conversation_id: str) -> dict[str, Any]:
        """
        Load pending_intent, pending_context, and summary for a conversation.

        Returns a dict with those three keys (None if not found).
        """
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT pending_intent, pending_context, summary
                FROM   conversation_state
                WHERE  conversation_id = $1::uuid
                """,
                conversation_id,
            )

        if row is None:
            return {"pending_intent": None, "pending_context": None, "summary": None}

        pending_context = row["pending_context"]
        if isinstance(pending_context, str):
            try:
                pending_context = json.loads(pending_context)
            except (json.JSONDecodeError, TypeError):
                pending_context = None

        return {
            "pending_intent": row["pending_intent"],
            "pending_context": pending_context,
            "summary": row["summary"],
        }

    # ── Write ─────────────────────────────────────────────────────────────────

    async def save(
        self,
        conversation_id: str,
        pending_intent: Optional[str],
        pending_context: Optional[dict],
        summary: Optional[str] = None,
    ) -> None:
        """
        Upsert pending_intent / pending_context / summary for a conversation.

        Uses INSERT … ON CONFLICT so it works whether or not the row exists.
        """
        context_json = (
            json.dumps(pending_context) if pending_context is not None else None
        )

        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO conversation_state
                    (conversation_id, pending_intent, pending_context, summary, updated_at)
                VALUES
                    ($1::uuid, $2, $3::jsonb, $4, NOW())
                ON CONFLICT (conversation_id) DO UPDATE SET
                    pending_intent  = EXCLUDED.pending_intent,
                    pending_context = EXCLUDED.pending_context,
                    summary         = COALESCE(EXCLUDED.summary, conversation_state.summary),
                    updated_at      = NOW()
                """,
                conversation_id,
                pending_intent,
                context_json,
                summary,
            )

        logger.debug(
            "Saved state for conversation %s — intent=%s",
            conversation_id,
            pending_intent,
        )

    async def clear(self, conversation_id: str) -> None:
        """Clear pending state (intent + context) for a conversation."""
        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE conversation_state
                SET    pending_intent  = NULL,
                       pending_context = NULL,
                       updated_at      = NOW()
                WHERE  conversation_id = $1::uuid
                """,
                conversation_id,
            )
