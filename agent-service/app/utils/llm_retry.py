"""LLM Retry Wrapper — handles rate-limit errors by rotating API keys.

On a 429 error, instead of waiting 46 seconds with the same key,
we immediately rotate to the next API key and retry.

Usage:
    from app.utils.llm_retry import invoke_with_retry

    # Simple: retries with same function (legacy)
    response = await invoke_with_retry(model.ainvoke, messages)

    # Better: pass a factory so each retry gets a fresh model with a new key
    response = await invoke_with_retry(
        call_factory=lambda: _get_model().ainvoke(messages)
    )
"""

from __future__ import annotations

import asyncio
import logging
import re
from typing import Any, Callable, Awaitable, Optional

from app.config import get_api_key

logger = logging.getLogger(__name__)

# Retry config
MAX_RETRIES = 3
# Short delay between key swaps (just enough to avoid hammering)
KEY_SWAP_DELAY = 1.0
# Fallback delay if no keys left to swap
FALLBACK_DELAY = 15.0


async def invoke_with_retry(
    fn: Optional[Callable[..., Awaitable[Any]]] = None,
    *args: Any,
    call_factory: Optional[Callable[[], Awaitable[Any]]] = None,
    max_retries: int = MAX_RETRIES,
    **kwargs: Any,
) -> Any:
    """
    Call an async LLM function with automatic retry + key rotation.

    Two usage modes:

    1. Simple (bound method):
       ``await invoke_with_retry(model.ainvoke, messages)``
       On retry, the SAME model is used (same key). Still useful for
       transient per-minute limits.

    2. Factory (recommended):
       ``await invoke_with_retry(call_factory=lambda: _get_model().ainvoke(msgs))``
       On retry, _get_model() is called again, which picks the NEXT
       API key from the rotation. This handles daily limits.
    """
    last_error = None

    for attempt in range(max_retries + 1):
        try:
            if call_factory:
                return await call_factory()
            else:
                return await fn(*args, **kwargs)
        except Exception as e:
            error_str = str(e)

            # Check if it's a retryable error (rate limit or server overload)
            is_rate_limit = "429" in error_str or "RESOURCE_EXHAUSTED" in error_str
            is_server_error = "503" in error_str or "UNAVAILABLE" in error_str

            if is_rate_limit or is_server_error:
                last_error = e

                if attempt < max_retries:
                    if call_factory and is_rate_limit:
                        # Factory mode: next call will use a new key automatically
                        delay = KEY_SWAP_DELAY
                        next_key = get_api_key()  # Advance the rotation
                        logger.warning(
                            "Rate limited (attempt %d/%d). "
                            "Rotating to next API key, retrying in %.1fs...",
                            attempt + 1, max_retries + 1, delay,
                        )
                    elif is_server_error:
                        # Server overload: wait a bit and retry with same key
                        delay = 5.0 * (attempt + 1)  # 5s, 10s, 15s
                        logger.warning(
                            "Server unavailable (attempt %d/%d). Retrying in %.1fs...",
                            attempt + 1, max_retries + 1, delay,
                        )
                    else:
                        # Simple mode: same key, wait for rate limit window
                        delay = _extract_retry_delay(error_str)
                        if delay is None:
                            delay = FALLBACK_DELAY
                        logger.warning(
                            "Rate limited (attempt %d/%d). Retrying in %.1fs...",
                            attempt + 1, max_retries + 1, delay,
                        )

                    await asyncio.sleep(delay)
                else:
                    logger.error(
                        "Rate limited — all %d retries exhausted.",
                        max_retries + 1,
                    )
                    raise RuntimeError(
                        "⏳ All API keys are rate-limited. "
                        "Please wait a moment and try again."
                    ) from e
            else:
                # Non-rate-limit error — don't retry
                raise

    raise last_error


def _extract_retry_delay(error_message: str) -> float | None:
    """Try to extract the retry delay from a Google API error message."""
    match = re.search(
        r"retry\s*(?:in|Delay['\"]?:\s*['\"]?)(\d+\.?\d*)\s*s",
        error_message, re.IGNORECASE,
    )
    if match:
        delay = float(match.group(1))
        return min(delay + 2.0, 60.0)  # Cap at 60s
    return None
