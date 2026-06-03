"""Preprocess Node — multimodal entry point.

Handles text, image, and PDF inputs.  For images/PDFs it uses
Gemini 2.5 Flash's native multimodal capability to extract content.
PII masking is applied before any data leaves this node.
"""

from __future__ import annotations

import base64
import logging
from typing import Any

from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import settings
from app.models.state import AgentState
from app.models.classification import DocumentExtractionResult
from app.security.pii_masker import mask_pii

logger = logging.getLogger(__name__)


def _get_model() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.google_api_key,
        temperature=0.1,
    )


async def preprocess_node(state: AgentState) -> dict[str, Any]:
    """
    First node in the graph.

    1. Detect input type (text / image / pdf).
    2. If image → use Gemini multimodal to extract structured data.
    3. If PDF → extract text, then structure it via Gemini.
    4. Apply PII masking on all extracted text.
    5. Return updated state fields.
    """
    input_type = state.get("input_type", "text")
    user_input = state.get("user_input", "")
    file_bytes = state.get("file_bytes")

    extracted_data = None
    processed_input = user_input

    if input_type == "image" and file_bytes:
        extracted_data = await _process_image(file_bytes, user_input)
        processed_input = (
            f"{user_input}\n\n[Extracted from image: {extracted_data}]"
            if user_input
            else f"[Extracted from image: {extracted_data}]"
        )

    elif input_type == "pdf" and file_bytes:
        pdf_text = _extract_pdf_text(file_bytes)
        extracted_data = await _structure_pdf_text(pdf_text, user_input)
        processed_input = (
            f"{user_input}\n\n[Extracted from PDF: {extracted_data}]"
            if user_input
            else f"[Extracted from PDF: {extracted_data}]"
        )

    # Apply PII masking
    masked_input, pii_mapping = mask_pii(processed_input)

    return {
        "user_input": masked_input,
        "extracted_data": extracted_data,
        "messages": [HumanMessage(content=masked_input)],
        "response_metadata": {"pii_mapping": pii_mapping},
    }


async def _process_image(image_bytes: bytes, context: str) -> dict | None:
    """Use Gemini 2.5 Flash multimodal to extract invoice/receipt data from an image."""
    model = _get_model()

    b64 = base64.standard_b64encode(image_bytes).decode("utf-8")

    message = HumanMessage(
        content=[
            {"type": "text", "text": (
                "You are an expert financial document parser. "
                "Extract all structured data from this document image. "
                "Identify: document type (invoice/receipt/bill), vendor name, "
                "customer name, document number, date, due date, line items "
                "(description, quantity, unit price, amount), total amount, "
                "and any notes/memo. "
                f"Additional context from user: {context}"
            )},
            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
        ]
    )

    try:
        structured_model = model.with_structured_output(DocumentExtractionResult)
        result: DocumentExtractionResult = await structured_model.ainvoke([message])
        return result.model_dump()
    except Exception:
        logger.exception("Image extraction failed, falling back to raw text extraction.")
        raw = await model.ainvoke([message])
        return {"raw_text": raw.content, "document_type": "unknown"}


def _extract_pdf_text(pdf_bytes: bytes) -> str:
    """Extract text from a PDF using PyPDF2."""
    try:
        import io
        from PyPDF2 import PdfReader

        reader = PdfReader(io.BytesIO(pdf_bytes))
        pages = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
        return "\n\n".join(pages)
    except Exception:
        logger.exception("PDF text extraction failed.")
        return ""


async def _structure_pdf_text(pdf_text: str, context: str) -> dict | None:
    """Send extracted PDF text to Gemini for structuring."""
    if not pdf_text.strip():
        return None

    model = _get_model()

    message = HumanMessage(
        content=(
            "You are an expert financial document parser. "
            "The following text was extracted from a PDF document. "
            "Extract all structured financial data from it.\n\n"
            f"PDF Text:\n{pdf_text}\n\n"
            f"Additional context: {context}"
        )
    )

    try:
        structured_model = model.with_structured_output(DocumentExtractionResult)
        result: DocumentExtractionResult = await structured_model.ainvoke([message])
        return result.model_dump()
    except Exception:
        logger.exception("PDF structuring failed.")
        return {"raw_text": pdf_text, "document_type": "unknown"}
