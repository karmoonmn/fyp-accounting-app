"""FastAPI request / response schemas for the agent service endpoints."""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


# ── Chat Request ──────────────────────────────────────────────────────────────


class ChatRequest(BaseModel):
    """POST /agent/chat — send a message to the agent."""

    message: str = Field(description="User's text message.")
    company_id: int = Field(description="The company context for this request.")
    auth_token: str = Field(description="Firebase ID token for Spring Boot calls.")
    thread_id: Optional[str] = Field(
        default=None,
        description="Existing thread ID to continue a conversation. None = new thread.",
    )
    # File uploads are handled via multipart form-data separately


# ── Chat Response ─────────────────────────────────────────────────────────────


class ChatResponse(BaseModel):
    """Returned by POST /agent/chat."""

    thread_id: str = Field(description="The conversation thread ID.")
    response: str = Field(description="The agent's text response.")
    requires_confirmation: bool = Field(
        default=False,
        description="True if the agent is waiting for user confirmation.",
    )
    proposed_action: Optional[dict[str, Any]] = Field(
        default=None,
        description="If requires_confirmation=True, the action details.",
    )
    response_metadata: Optional[dict[str, Any]] = Field(
        default=None,
        description="Extra metadata: citations, SQL used, tools invoked, etc.",
    )


# ── Confirmation Request ──────────────────────────────────────────────────────


class ConfirmRequest(BaseModel):
    """POST /agent/confirm/{thread_id}"""

    action: str = Field(description="'confirm', 'cancel', or 'modify'.")
    modification_payload: Optional[dict[str, Any]] = Field(
        default=None,
        description="Fields to change if action='modify'.",
    )


# ── History Response ──────────────────────────────────────────────────────────


class HistoryResponse(BaseModel):
    """GET /agent/history/{thread_id}"""

    thread_id: str
    messages: list[dict[str, Any]] = Field(default_factory=list)
