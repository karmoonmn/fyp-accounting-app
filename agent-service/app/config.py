"""Agent Service Configuration — loads from .env"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Central configuration for the multi-agent financial system."""

    # ── AI / LLM ──────────────────────────────────────────────
    google_api_key: str = "not-set"
    google_api_keys: str = "" # Comma-separated list of keys
    # gemini_model: str = "gemini-2.5-flash"
    gemini_model: str = "gemini-2.5-flash-lite"

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

import itertools
import threading

_key_cycle = None
_key_lock = threading.Lock()

def get_api_key() -> str:
    """Return the next Google API key in the rotation."""
    global _key_cycle
    with _key_lock:
        if _key_cycle is None:
            # Parse keys from google_api_keys (comma-separated)
            keys = [k.strip() for k in settings.google_api_keys.split(",") if k.strip()]
            # Fallback to single key if multiple are not provided
            if not keys and settings.google_api_key and settings.google_api_key != "not-set":
                keys = [settings.google_api_key.strip()]
            # If still no keys, use a placeholder
            if not keys:
                keys = ["not-set"]
            _key_cycle = itertools.cycle(keys)
        return next(_key_cycle)
