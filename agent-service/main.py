"""Agent Service — FastAPI entrypoint.

Multi-agent financial AI system powered by LangGraph + Gemini 2.5 Flash.

Endpoints:
  POST /agent/chat              — Send a message (text/image/PDF)
  POST /agent/confirm/{tid}     — Confirm/cancel/modify a proposed action
  GET  /agent/history/{tid}     — Get conversation history
  GET  /agent/health            — Health check

Memory Model
------------
Each chat thread corresponds to a *conversation_id* (UUID).  The caller
(Spring Boot bridge) passes this as ``thread_id``.  The LangGraph
SQLite checkpointer uses it as the checkpoint key so that every
conversation has fully isolated in-process state.

Additionally, after every turn we sync ``pending_intent`` and
``pending_context`` to the Supabase ``conversation_state`` table so
that state survives server restarts and is visible to other services.
"""

from __future__ import annotations

import logging
import uuid
from contextlib import asynccontextmanager
from typing import Optional

import asyncpg
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage
from langgraph.types import Command

from app.config import settings
from app.graph.workflow import compile_graph
from app.models.api_schemas import (
    ChatResponse,
    ConfirmRequest,
    HistoryResponse,
)
from app.persistence.conversation_state_repo import ConversationStateRepo
from app.clients import spring_boot_client, ml_client

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")

from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

# ── Singletons ────────────────────────────────────────────────────────────────
_compiled_graph = None
_state_repo: Optional[ConversationStateRepo] = None
_db_pool: Optional[asyncpg.Pool] = None


async def _get_graph():
    global _compiled_graph
    return _compiled_graph


def _get_state_repo() -> Optional[ConversationStateRepo]:
    return _state_repo


# ── Lifespan ──────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _compiled_graph, _state_repo, _db_pool

    logger.info("Starting Agent Service on port %s", settings.agent_port)

    # ── Postgres pool for conversation_state (optional) ───────────────────────
    if settings.database_url:
        try:
            _db_pool = await asyncpg.create_pool(settings.database_url, min_size=1, max_size=5)
            _state_repo = ConversationStateRepo(_db_pool)
            logger.info("Connected to Supabase — conversation_state persistence enabled.")
        except Exception as exc:
            logger.warning("Could not connect to Supabase (%s) — state will use SQLite only.", exc)
            _state_repo = None
    else:
        logger.info("No DATABASE_URL set — conversation_state persistence disabled.")

    # ── LangGraph SQLite checkpointer ─────────────────────────────────────────
    async with AsyncSqliteSaver.from_conn_string(settings.sqlite_db_path) as checkpointer:
        await checkpointer.setup()
        _compiled_graph = compile_graph(checkpointer=checkpointer)
        logger.info("LangGraph workflow compiled successfully.")
        yield

    # ── Shutdown ──────────────────────────────────────────────────────────────
    if _db_pool:
        await _db_pool.close()
    await spring_boot_client.close_client()
    await ml_client.close_client()
    logger.info("Agent Service shut down.")


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Financial Agent Service",
    description="Multi-agent AI system for accounting",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helpers ───────────────────────────────────────────────────────────────────


async def _load_persisted_state(conversation_id: str) -> dict:
    """
    Load pending_intent / pending_context / summary from Supabase.

    Returns empty-safe defaults if the repo is unavailable.
    """
    repo = _get_state_repo()
    if repo is None:
        return {"pending_intent": None, "pending_context": None, "summary": None}
    try:
        return await repo.load(conversation_id)
    except Exception as exc:
        logger.warning("Failed to load state for %s: %s", conversation_id, exc)
        return {"pending_intent": None, "pending_context": None, "summary": None}


async def _save_persisted_state(conversation_id: str, result: dict) -> None:
    """
    Persist pending_intent / pending_context / summary back to Supabase
    after a graph run.
    """
    repo = _get_state_repo()
    if repo is None:
        return
    try:
        await repo.save(
            conversation_id=conversation_id,
            pending_intent=result.get("pending_intent"),
            pending_context=result.get("pending_context"),
            summary=result.get("conversation_summary"),
        )
    except Exception as exc:
        logger.warning("Failed to save state for %s: %s", conversation_id, exc)


# ── POST /agent/chat ──────────────────────────────────────────────────────────


@app.post("/agent/chat", response_model=ChatResponse)
async def chat(
    message: str = Form(...),
    company_id: int = Form(...),
    auth_token: str = Form(...),
    thread_id: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
):
    """Send a message to the agent (text, image, or PDF).

    ``thread_id`` should be the conversation_id UUID from the frontend.
    If omitted, a new UUID is generated — meaning a new isolated conversation.
    """
    graph = await _get_graph()

    # conversation_id == thread_id: one UUID per chat thread
    conversation_id = thread_id or str(uuid.uuid4())

    # Detect input type
    input_type = "text"
    file_bytes = None
    file_name = None

    if file and file.filename:
        file_bytes = await file.read()
        file_name = file.filename
        ext = file.filename.lower().rsplit(".", 1)[-1] if "." in file.filename else ""
        if ext in ("png", "jpg", "jpeg", "gif", "webp", "bmp"):
            input_type = "image"
        elif ext == "pdf":
            input_type = "pdf"

    # ── Load persisted state from Supabase ────────────────────────────────────
    # The SQLite checkpointer already carries messages + pending state across
    # turns in-process.  We also load from Supabase so that after a server
    # restart (SQLite wiped) we can seed the initial state correctly.
    persisted = await _load_persisted_state(conversation_id)

    # Build initial state.
    # Transient per-turn fields are reset; persistent fields that the
    # checkpointer might not have (e.g. after restart) are seeded from
    # Supabase.  If the checkpointer already has them, LangGraph will use
    # the checkpointed value because we only set them when non-None.
    initial_state: dict = {
        "user_input": message,
        "input_type": input_type,
        "file_bytes": file_bytes,
        "file_name": file_name,
        "company_id": company_id,
        "auth_token": auth_token,
        "thread_id": conversation_id,
        # Reset per-turn transient fields
        "classification": None,
        "classification_confidence": None,
        "extracted_data": None,
        "proposed_action": None,
        "confirmation_status": None,
        "final_response": None,
        # NOTE: pending_intent, pending_context, conversation_summary are
        # intentionally OMITTED when already tracked by the checkpointer.
        # We only inject from Supabase when the value is non-None (restart recovery).
    }

    # Seed from Supabase only when the value exists — avoids overwriting
    # live checkpointed state with a stale None.
    if persisted["pending_intent"] is not None:
        initial_state["pending_intent"] = persisted["pending_intent"]
    if persisted["pending_context"] is not None:
        initial_state["pending_context"] = persisted["pending_context"]
    if persisted["summary"] is not None:
        initial_state["conversation_summary"] = persisted["summary"]

    config = {"configurable": {"thread_id": conversation_id}}

    logger.info(
        "chat — conversation_id=%s pending_intent=%s",
        conversation_id,
        persisted.get("pending_intent"),
    )

    try:
        result = await graph.ainvoke(initial_state, config=config)

        # ── Persist updated state to Supabase ─────────────────────────────────
        await _save_persisted_state(conversation_id, result)

        final_response = result.get("final_response", "I processed your request.")
        proposed = result.get("proposed_action")
        requires_confirmation = (
            proposed is not None and result.get("confirmation_status") == "pending"
        )

        return ChatResponse(
            thread_id=conversation_id,
            response=final_response,
            requires_confirmation=requires_confirmation,
            proposed_action=proposed,
            response_metadata=result.get("response_metadata"),
        )

    except Exception as e:
        logger.exception("Agent chat failed")
        error_str = str(e)
        if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
            user_msg = (
                "⏳ The AI service is temporarily rate-limited. "
                "Please wait about 30 seconds and try again."
            )
        elif "503" in error_str or "UNAVAILABLE" in error_str:
            user_msg = (
                "⏳ The AI service is experiencing high demand. "
                "Please try again in a few seconds."
            )
        else:
            user_msg = f"Sorry, I encountered an error: {error_str}"
        return ChatResponse(
            thread_id=conversation_id,
            response=user_msg,
            requires_confirmation=False,
        )


# ── POST /agent/confirm/{thread_id} ──────────────────────────────────────────


@app.post("/agent/confirm/{thread_id}", response_model=ChatResponse)
async def confirm_action(thread_id: str, req: ConfirmRequest):
    """Confirm, cancel, or modify a proposed action to resume the graph."""
    graph = await _get_graph()
    config = {"configurable": {"thread_id": thread_id}}

    try:
        resume_value = {
            "action": req.action,
            "modification_payload": req.modification_payload,
        }

        result = await graph.ainvoke(
            Command(resume=resume_value),
            config=config,
        )

        # Persist state after confirm/cancel too
        await _save_persisted_state(thread_id, result)

        return ChatResponse(
            thread_id=thread_id,
            response=result.get("final_response", "Action processed."),
            requires_confirmation=False,
            response_metadata=result.get("response_metadata"),
        )

    except Exception as e:
        logger.exception("Confirmation failed")
        return ChatResponse(
            thread_id=thread_id,
            response=f"Error processing confirmation: {str(e)}",
            requires_confirmation=False,
        )


# ── GET /agent/history/{thread_id} ───────────────────────────────────────────


@app.get("/agent/history/{thread_id}", response_model=HistoryResponse)
async def get_history(thread_id: str):
    """Get conversation history for a thread."""
    graph = await _get_graph()
    config = {"configurable": {"thread_id": thread_id}}

    try:
        state = await graph.aget_state(config)
        messages = []
        for msg in state.values.get("messages", []):
            messages.append({
                "role": "user" if msg.type == "human" else "assistant",
                "content": msg.content,
            })
        return HistoryResponse(thread_id=thread_id, messages=messages)
    except Exception:
        return HistoryResponse(thread_id=thread_id, messages=[])


# ── GET /agent/health ─────────────────────────────────────────────────────────


@app.get("/agent/health")
async def health():
    return {
        "status": "healthy",
        "service": "agent-service",
        "model": settings.gemini_model,
        "spring_boot": settings.spring_boot_base_url,
        "ml_service": settings.ml_service_url,
        "conversation_state_db": "connected" if _state_repo else "disabled",
    }


# ── Entrypoint ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.agent_port,
        reload=True,
    )
