"""Structured-output schemas for the Classification Agent."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ClassificationResult(BaseModel):
    """
    Gemini 2.5 Flash returns this via ``with_structured_output``.

    The classifier inspects the (possibly multimodal) user input and
    decides which downstream agent pipeline should handle it.
    """

    intent: Literal[
        "INVOICE_PROCESS",
        "EXPENSE_MGMT",
        "RAG_QUERY",
        "ANALYTICS",
        "OUT_OF_SCOPE",
    ] = Field(
        description=(
            "The routing label.  "
            "INVOICE_PROCESS  — user wants to create / read / update / delete an invoice.  "
            "EXPENSE_MGMT     — user wants to create / read / update / delete a bill or expense.  "
            "RAG_QUERY        — user is asking a financial question (revenue, cost, profit, trends).  "
            "ANALYTICS        — user wants forecasting or predictive analytics.  "
            "OUT_OF_SCOPE     — the request has nothing to do with accounting."
        )
    )

    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Model's self-assessed confidence in the classification (0-1).",
    )

    reasoning: str = Field(
        description="One-sentence explanation of why this intent was chosen.",
    )


class DocumentExtractionResult(BaseModel):
    """Structured output when Gemini extracts data from an image/PDF."""

    document_type: Literal["invoice", "receipt", "bill", "unknown"] = Field(
        description="The detected document type."
    )
    vendor_name: str | None = Field(default=None, description="Vendor / supplier name.")
    customer_name: str | None = Field(default=None, description="Customer name.")
    doc_number: str | None = Field(default=None, description="Invoice or bill number.")
    date: str | None = Field(default=None, description="Transaction date (YYYY-MM-DD).")
    due_date: str | None = Field(default=None, description="Due date (YYYY-MM-DD).")
    currency: str = Field(default="USD", description="Currency code.")
    line_items: list[LineItemExtraction] = Field(
        default_factory=list, description="Extracted line items."
    )
    total_amount: float | None = Field(default=None, description="Total amount.")
    notes: str | None = Field(default=None, description="Any memo or notes.")


class LineItemExtraction(BaseModel):
    """A single line item extracted from a document."""

    description: str = Field(description="Line item description.")
    quantity: float = Field(default=1.0, description="Quantity.")
    unit_price: float = Field(default=0.0, description="Unit price.")
    amount: float = Field(default=0.0, description="Line total.")


# Fix forward reference — LineItemExtraction is used inside DocumentExtractionResult
DocumentExtractionResult.model_rebuild()
