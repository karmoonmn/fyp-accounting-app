"""SQLite-based LangGraph checkpoint saver for development."""

from __future__ import annotations

import logging

from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

from app.config import settings

logger = logging.getLogger(__name__)

_checkpointer: AsyncSqliteSaver | None = None


async def get_checkpointer() -> AsyncSqliteSaver:
    """
    Returns a singleton AsyncSqliteSaver.

    For production, swap to ``langgraph-checkpoint-postgres`` pointed at
    Supabase by changing CHECKPOINT_BACKEND in .env.
    """
    global _checkpointer
    if _checkpointer is None:
        _checkpointer = AsyncSqliteSaver.from_conn_string(settings.sqlite_db_path)
        await _checkpointer.setup()
        logger.info("Checkpoint saver initialised (SQLite: %s)", settings.sqlite_db_path)
    return _checkpointer
