"""PII masking layer using Microsoft Presidio.

Masks sensitive data (SSN, credit cards, phone numbers, emails) before
sending user input to Gemini, and can reverse the masking for the final
response back to the user.
"""

from __future__ import annotations

import logging
import uuid
from typing import Optional

logger = logging.getLogger(__name__)

# Lazy-loaded singletons
_analyzer = None
_anonymizer = None


def _get_analyzer():
    global _analyzer
    if _analyzer is None:
        try:
            from presidio_analyzer import AnalyzerEngine
            _analyzer = AnalyzerEngine()
            logger.info("Presidio AnalyzerEngine initialized.")
        except ImportError:
            logger.warning(
                "presidio-analyzer not installed. PII masking disabled."
            )
    return _analyzer


def _get_anonymizer():
    global _anonymizer
    if _anonymizer is None:
        try:
            from presidio_anonymizer import AnonymizerEngine
            _anonymizer = AnonymizerEngine()
            logger.info("Presidio AnonymizerEngine initialized.")
        except ImportError:
            logger.warning(
                "presidio-anonymizer not installed. PII masking disabled."
            )
    return _anonymizer


# The entity types we care about in a financial context
_ENTITIES = [
    "CREDIT_CARD",
    "CRYPTO",
    "EMAIL_ADDRESS",
    "IBAN_CODE",
    "IP_ADDRESS",
    "NRP",
    "PHONE_NUMBER",
    "US_BANK_NUMBER",
    "US_SSN",
    "US_PASSPORT",
    "US_DRIVER_LICENSE",
]


def mask_pii(text: str) -> tuple[str, dict[str, str]]:
    """
    Detect and mask PII in *text*.

    Returns:
        A tuple of (masked_text, mapping) where *mapping* maps each
        placeholder token back to the original value so that
        ``unmask_pii`` can reverse the operation.
    """
    analyzer = _get_analyzer()
    anonymizer = _get_anonymizer()

    if analyzer is None or anonymizer is None:
        return text, {}

    results = analyzer.analyze(text=text, entities=_ENTITIES, language="en")

    if not results:
        return text, {}

    # Build a deterministic replacement mapping
    mapping: dict[str, str] = {}
    sorted_results = sorted(results, key=lambda r: r.start, reverse=True)

    masked = text
    for result in sorted_results:
        original = text[result.start : result.end]
        placeholder = f"<{result.entity_type}_{uuid.uuid4().hex[:6]}>"
        mapping[placeholder] = original
        masked = masked[: result.start] + placeholder + masked[result.end :]

    logger.info("Masked %d PII entities.", len(mapping))
    return masked, mapping


def unmask_pii(text: str, mapping: dict[str, str]) -> str:
    """Replace placeholder tokens with their original PII values."""
    result = text
    for placeholder, original in mapping.items():
        result = result.replace(placeholder, original)
    return result
