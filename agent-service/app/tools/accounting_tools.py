"""Accounting Tools — LangChain @tool wrappers for Spring Boot APIs.

These tools are bound to Gemini via `model.bind_tools()` so that the LLM
can autonomously decide which data sources to query during a conversation.

IMPORTANT: All tools are READ-ONLY.  Write operations (create / update /
delete) are handled via the ProposedAction → human confirmation flow,
never through autonomous tool calls.
"""

from __future__ import annotations

import json
import logging
from typing import Optional

from langchain_core.tools import tool

from app.clients import spring_boot_client

logger = logging.getLogger(__name__)


# ── Customer Tools ────────────────────────────────────────────────────────────


@tool
async def search_customers(query: str) -> str:
    """Search for customers by name. Returns a JSON list of matching
    customers with their IDs and names. Use this when the user mentions
    a customer name and you need to find the matching customer ID."""
    # NOTE: auth_token and company_id are injected at runtime via tool_executor
    raise NotImplementedError("Must be called via tool_executor with injected credentials")


@tool
async def list_all_customers() -> str:
    """List all customers in the system. Returns a JSON list with
    customer IDs and names. Use this to find customers or resolve
    ambiguous customer references."""
    raise NotImplementedError("Must be called via tool_executor with injected credentials")


@tool
async def create_customer(name: str, email: str = "", phone: str = "", address: str = "") -> str:
    """Create a new customer in the system. Use this when the user asks to create an invoice for a customer that does not exist yet. Returns the newly created customer object including its ID. You should always use this to create a customer if they don't exist before proposing the invoice. CRITICAL: Only the name is required. Do NOT ask the user for their address, email, or phone number before creating them—just leave those fields blank."""
    raise NotImplementedError("Must be called via tool_executor with injected credentials")


# ── Supplier Tools ────────────────────────────────────────────────────────────


@tool
async def search_suppliers(query: str) -> str:
    """Search for suppliers by name. Returns a JSON list of matching
    suppliers with their IDs and names. Use this when the user mentions
    a supplier/vendor name and you need the supplier ID."""
    raise NotImplementedError("Must be called via tool_executor with injected credentials")


@tool
async def list_all_suppliers() -> str:
    """List all suppliers in the system. Returns a JSON list with
    supplier IDs and names."""
    raise NotImplementedError("Must be called via tool_executor with injected credentials")


@tool
async def create_supplier(name: str, email: str = "", phone: str = "", address: str = "") -> str:
    """Create a new supplier/vendor in the system. Use this when the user asks to create a bill for a supplier that does not exist yet. Returns the newly created supplier object including its ID. You should always use this to create a supplier if they don't exist before proposing the bill. CRITICAL: Only the name is required. Do NOT ask the user for their address, email, or phone number before creating them—just leave those fields blank."""
    raise NotImplementedError("Must be called via tool_executor with injected credentials")


# ── Invoice Tools ─────────────────────────────────────────────────────────────


@tool
async def list_all_invoices() -> str:
    """List all invoices with their status, amounts, dates, and customer info.
    Use this to answer questions about outstanding invoices, overdue amounts,
    or to find a specific invoice."""
    raise NotImplementedError("Must be called via tool_executor with injected credentials")


@tool
async def get_invoice_details(invoice_id: int) -> str:
    """Get detailed information about a specific invoice by its ID.
    Returns line items, amounts, dates, customer info, and status."""
    raise NotImplementedError("Must be called via tool_executor with injected credentials")


# ── Bill Tools ────────────────────────────────────────────────────────────────


@tool
async def list_all_bills() -> str:
    """List all bills/expenses with their status, amounts, dates, and
    supplier info. Use this to check outstanding bills or find a specific bill."""
    raise NotImplementedError("Must be called via tool_executor with injected credentials")


@tool
async def get_bill_details(bill_id: int) -> str:
    """Get detailed information about a specific bill by its ID."""
    raise NotImplementedError("Must be called via tool_executor with injected credentials")


# ── Account / Chart of Accounts Tools ────────────────────────────────────────


@tool
async def get_chart_of_accounts() -> str:
    """Get the Chart of Accounts (COA) tree structure. Returns all
    accounts with their IDs, names, types, and hierarchy. Use this
    to find the correct expense account ID when categorizing bills."""
    raise NotImplementedError("Must be called via tool_executor with injected credentials")


# ── Report Tools ──────────────────────────────────────────────────────────────


@tool
async def get_profit_and_loss(start_date: str, end_date: str) -> str:
    """Get the Profit & Loss report for a date range.
    Dates must be in YYYY-MM-DD format.
    Returns revenue accounts, expense accounts, and net profit."""
    raise NotImplementedError("Must be called via tool_executor with injected credentials")


@tool
async def get_balance_sheet(as_of_date: str) -> str:
    """Get the Balance Sheet as of a specific date (YYYY-MM-DD).
    Returns assets, liabilities, and equity balances."""
    raise NotImplementedError("Must be called via tool_executor with injected credentials")


@tool
async def get_expense_analysis(year: int) -> str:
    """Get expense breakdown by account for a given year.
    Returns a categorised summary of all expenses."""
    raise NotImplementedError("Must be called via tool_executor with injected credentials")


@tool
async def get_accounts_receivable_aging() -> str:
    """Get the Accounts Receivable aging report — shows outstanding
    invoices grouped by age (current, 1-30 days, 31-60 days, etc.).
    Use this to answer questions about overdue receivables."""
    raise NotImplementedError("Must be called via tool_executor with injected credentials")


@tool
async def get_accounts_payable_aging() -> str:
    """Get the Accounts Payable aging report — shows outstanding
    bills grouped by age. Use this to answer questions about overdue payables."""
    raise NotImplementedError("Must be called via tool_executor with injected credentials")


# ── Dummy Write Tools (To satisfy Gemini's tool scope) ────────────────────────


from typing import Optional, List
from pydantic import BaseModel, Field

class LineItemArgs(BaseModel):
    description: str
    quantity: float = 1.0
    unitPrice: float = 0.0
    amount: float = 0.0
    accountId: Optional[int] = Field(None, description="The account ID (e.g. Expense account) for this line item.")
    accountName: Optional[str] = Field(None, description="The name of the account chosen.")

class CreateInvoiceArgs(BaseModel):
    docNumber: str = Field(description="The invoice number.")
    txnDate: Optional[str] = Field(None, description="Transaction date YYYY-MM-DD")
    dueDate: Optional[str] = Field(None, description="Due date YYYY-MM-DD")
    customerId: Optional[int] = Field(None, description="The customer ID if known.")
    customerName: Optional[str] = Field(None, description="MUST provide the raw customer name if customerId is missing or unknown.")
    lines: List[LineItemArgs] = Field(default_factory=list, description="List of items.")

@tool(args_schema=CreateInvoiceArgs)
async def create_invoice_action(
    docNumber: str,
    txnDate: Optional[str] = None,
    dueDate: Optional[str] = None,
    customerId: Optional[int] = None,
    customerName: Optional[str] = None,
    lines: Optional[list] = None
) -> str:
    """USE THIS TOOL TO CREATE AN INVOICE."""
    return "Intercepted by tool_executor"


class CreateBillArgs(BaseModel):
    docNumber: str = Field(description="The bill/reference number.")
    txnDate: Optional[str] = Field(None, description="Transaction date YYYY-MM-DD")
    dueDate: Optional[str] = Field(None, description="Due date YYYY-MM-DD")
    supplierId: Optional[int] = Field(None, description="The supplier ID if known.")
    supplierName: Optional[str] = Field(None, description="MUST provide the raw supplier name if supplierId is missing or unknown.")
    lines: List[LineItemArgs] = Field(default_factory=list, description="List of items with description, amount, and accountId.")

@tool(args_schema=CreateBillArgs)
async def create_bill_action(
    docNumber: str,
    txnDate: Optional[str] = None,
    dueDate: Optional[str] = None,
    supplierId: Optional[int] = None,
    supplierName: Optional[str] = None,
    lines: Optional[list] = None
) -> str:
    """USE THIS TOOL TO CREATE A BILL OR EXPENSE."""
    return "Intercepted by tool_executor"

# ── Tool Registry ────────────────────────────────────────────────────────────


# Group tools by agent type for selective binding
INVOICE_TOOLS = [
    search_customers,
    list_all_customers,
    create_customer,
    list_all_invoices,
    get_invoice_details,
    get_chart_of_accounts,
    create_invoice_action,
]

EXPENSE_TOOLS = [
    search_suppliers,
    list_all_suppliers,
    create_supplier,
    list_all_bills,
    get_bill_details,
    get_chart_of_accounts,
    create_bill_action,
]

RAG_TOOLS = [
    list_all_invoices,
    list_all_bills,
    list_all_customers,
    list_all_suppliers,
    get_profit_and_loss,
    get_balance_sheet,
    get_expense_analysis,
    get_accounts_receivable_aging,
    get_accounts_payable_aging,
    get_chart_of_accounts,
]

ALL_TOOLS = list({t.name: t for t in INVOICE_TOOLS + EXPENSE_TOOLS + RAG_TOOLS}.values())
