"""Agent Service — FastAPI entrypoint.

Multi-agent financial AI system powered by LangGraph + Gemini 2.5 Flash.

Endpoints:
  POST /agent/chat              — Send a message (text/image/PDF)
  POST /agent/confirm/{tid}     — Confirm/cancel/modify a proposed action
  GET  /agent/history/{tid}     — Get conversation history
  GET  /agent/health            — Health check
"""

from __future__ import annotations

import logging
import uuid
from contextlib import asynccontextmanager
from typing import Optional

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
from app.persistence.checkpointer import get_checkpointer
from app.clients import spring_boot_client, ml_client

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")

from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

# ── Compiled graph (singleton) ────────────────────────────────────────────────
_compiled_graph = None


async def _get_graph():
    global _compiled_graph
    return _compiled_graph


# ── Lifespan ──────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Agent Service on port %s", settings.agent_port)
    
    global _compiled_graph
    async with AsyncSqliteSaver.from_conn_string(settings.sqlite_db_path) as checkpointer:
        await checkpointer.setup()
        _compiled_graph = compile_graph(checkpointer=checkpointer)
        logger.info("LangGraph workflow compiled successfully.")
        yield

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


# ── POST /agent/chat ─────────────────────────────────────────────────────────


@app.post("/agent/chat", response_model=ChatResponse)
async def chat(
    message: str = Form(...),
    company_id: int = Form(...),
    auth_token: str = Form(...),
    thread_id: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
):
    """Send a message to the agent (text, image, or PDF)."""
    graph = await _get_graph()

    # Generate or reuse thread ID
    tid = thread_id or str(uuid.uuid4())

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

    # Build initial state — only include fields relevant to THIS turn.
    # Do NOT set persistent fields (pending_intent, pending_context, etc.)
    # to None — that would overwrite the checkpointed values.
    initial_state = {
        "user_input": message,
        "input_type": input_type,
        "file_bytes": file_bytes,
        "file_name": file_name,
        "company_id": company_id,
        "auth_token": auth_token,
        "thread_id": tid,
        # Reset per-turn transient fields
        "classification": None,
        "classification_confidence": None,
        "extracted_data": None,
        "proposed_action": None,
        "confirmation_status": None,
        "final_response": None,
        # NOTE: pending_intent, pending_context are intentionally OMITTED
        # so they survive across turns via the checkpointer.
    }

    config = {"configurable": {"thread_id": tid}}

    try:
        # Run the graph — may pause at human_confirmation interrupt
        result = await graph.ainvoke(initial_state, config=config)

        final_response = result.get("final_response", "I processed your request.")
        proposed = result.get("proposed_action")
        requires_confirmation = proposed is not None and result.get("confirmation_status") == "pending"

        return ChatResponse(
            thread_id=tid,
            response=final_response,
            requires_confirmation=requires_confirmation,
            proposed_action=proposed,
            response_metadata=result.get("response_metadata"),
        )

    except Exception as e:
        logger.exception("Agent chat failed")
        return ChatResponse(
            thread_id=tid,
            response=f"Sorry, I encountered an error: {str(e)}",
            requires_confirmation=False,
        )


# ── POST /agent/confirm/{thread_id} ──────────────────────────────────────────


@app.post("/agent/confirm/{thread_id}", response_model=ChatResponse)
async def confirm_action(thread_id: str, req: ConfirmRequest):
    """Confirm, cancel, or modify a proposed action to resume the graph."""
    graph = await _get_graph()
    config = {"configurable": {"thread_id": thread_id}}

    try:
        # Resume the interrupted graph with the user's decision
        resume_value = {
            "action": req.action,
            "modification_payload": req.modification_payload,
        }

        result = await graph.ainvoke(
            Command(resume=resume_value),
            config=config,
        )

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


# ── GET /agent/health ────────────────────────────────────────────────────────


@app.get("/agent/health")
async def health():
    return {
        "status": "healthy",
        "service": "agent-service",
        "model": settings.gemini_model,
        "spring_boot": settings.spring_boot_base_url,
        "ml_service": settings.ml_service_url,
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
