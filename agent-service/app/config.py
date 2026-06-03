"""Agent Service Configuration — loads from .env"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Central configuration for the multi-agent financial system."""

    # ── AI / LLM ──────────────────────────────────────────────
    google_api_key: str = "not-set"
    gemini_model: str = "gemini-2.5-flash"

    # ── Spring Boot Backend ───────────────────────────────────
    spring_boot_base_url: str = "http://localhost:8080"

    # ── ML Forecasting Service ────────────────────────────────
    ml_service_url: str = "http://localhost:8001"

    # ── Agent Service ─────────────────────────────────────────
    agent_port: int = 8002

    # ── Persistence / Checkpointing ───────────────────────────
    checkpoint_backend: str = "sqlite"  # "sqlite" or "postgres"
    sqlite_db_path: str = "./checkpoints.db"

    # ── Supabase (optional — for postgres checkpoint backend) ─
    supabase_url: Optional[str] = None
    supabase_service_key: Optional[str] = None

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
