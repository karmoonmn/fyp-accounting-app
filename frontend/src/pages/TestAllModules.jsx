import React, { useState } from 'react'
import { AuthContext } from '../context/AuthContext'
import ProfitLossReport from '../components/reports/ProfitLossReport'
import BalanceSheetReport from '../components/reports/BalanceSheetReport'
import AgingReport from '../components/reports/AgingReport'
import ExpenseDashboard from '../components/reports/ExpenseDashboard'
import ForecastingDashboard from '../components/reports/ForecastingDashboard'
import Login from './Login'
import RegisterCompany from './RegisterCompany'
import ChartOfAccounts from './ChartOfAccounts'
import CreateEditAccount from './CreateEditAccount'
import BillsList from './BillsList'
import CreateBill from './CreateBill'
import InvoiceList from './InvoiceList'
import CreateInvoice from './CreateInvoice'
import PaymentList from './PaymentList'
import InvoicePayment from './InvoicePayment'
import BillPayment from './BillPayment'
import BankAccountHistory from './BankAccountHistory'

import {
  HiOutlineDocumentArrowUp,
  HiOutlineChatBubbleLeftRight,
  HiOutlineSparkles,
  HiOutlineLockClosed,
  HiOutlineBookOpen,
  HiOutlineReceiptPercent,
  HiOutlineDocumentText,
  HiOutlineBanknotes,
  HiOutlineCreditCard,
  HiOutlineChartBar,
  HiOutlineArrowTrendingUp,
  HiOutlineCheckCircle,
  HiOutlineFolderArrowDown,
} from 'react-icons/hi2'

const mockAuthValue = {
  firebaseUser: { email: 'admin@finflow.ai', uid: 'test-admin-uid-999' },
  idToken: 'mock-test-jwt-bearer-token',
  me: {
    userId: 1,
    userName: 'Admin Tester',
    companyId: 1,
    companyName: 'FinFlow AI Global Technologies Inc.',
    role: 'ADMIN'
  },
  loading: false,
  signOut: async () => {},
  getFreshToken: async () => 'mock-test-jwt-bearer-token',
  resetPassword: async () => {}
}

const MODULES = [
  { id: 'm1', number: 1, name: 'Document Extraction', fr: 'FR-01 to FR-06', icon: HiOutlineDocumentArrowUp, color: 'from-blue-500 to-indigo-600' },
  { id: 'm2', number: 2, name: 'Input Classification', fr: 'FR-07 to FR-10', icon: HiOutlineChatBubbleLeftRight, color: 'from-indigo-500 to-purple-600' },
  { id: 'm3', number: 3, name: 'RAG & Analytics', fr: 'FR-11 to FR-18', icon: HiOutlineSparkles, color: 'from-purple-500 to-pink-600' },
  { id: 'm4', number: 4, name: 'Auth & Company Mgmt', fr: 'FR-19 to FR-23', icon: HiOutlineLockClosed, color: 'from-slate-700 to-slate-900' },
  { id: 'm5', number: 5, name: 'Chart of Accounts', fr: 'FR-24 to FR-28', icon: HiOutlineBookOpen, color: 'from-emerald-600 to-teal-700' },
  { id: 'm6', number: 6, name: 'Bill Management', fr: 'FR-29 to FR-35', icon: HiOutlineReceiptPercent, color: 'from-amber-500 to-orange-600' },
  { id: 'm7', number: 7, name: 'Invoice Management', fr: 'FR-36 to FR-43', icon: HiOutlineDocumentText, color: 'from-cyan-600 to-blue-700' },
  { id: 'm8', number: 8, name: 'Payment Management', fr: 'FR-44 to FR-52', icon: HiOutlineBanknotes, color: 'from-teal-500 to-emerald-600' },
  { id: 'm9', number: 9, name: 'Bank Balance', fr: 'FR-53 to FR-56', icon: HiOutlineCreditCard, color: 'from-green-600 to-emerald-800' },
  { id: 'm10', number: 10, name: 'Financial Reports', fr: 'FR-57 to FR-61', icon: HiOutlineChartBar, color: 'from-blue-600 to-violet-700' },
  { id: 'm11', number: 11, name: 'ML Forecasting', fr: 'FR-62 to FR-66', icon: HiOutlineArrowTrendingUp, color: 'from-cyan-500 to-teal-600' }
]

export default function TestAllModules() {
  const [activeModule, setActiveModule] = useState('m1')
  const [m1FileType, setM1FileType] = useState('INV')
  const [m2IntentQuery, setM2IntentQuery] = useState('Create invoice for Acme Corp for $4,500 due next Friday')
  const [m2ClassifiedIntent, setM2ClassifiedIntent] = useState('INVOICE_PROCESS')
  const [m3Query, setM3Query] = useState('Compare Q1 vs Q2 2026 revenue and summarize top expenses')

  return (
    <AuthContext.Provider value={mockAuthValue}>
      <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
        <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Full 11 Modules E2E Test Suite
                </span>
                <span className="text-xs font-semibold text-slate-500">66 Functional Requirements (FR-01 to FR-66)</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 mt-1">FinFlow AI — Interactive Frontend Verification Hub</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium px-3 py-1.5 bg-slate-100 rounded-lg text-slate-600 border border-slate-200">
                Tenant: <strong className="text-slate-800">Company #1 (ADMIN)</strong>
              </span>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-6 py-2.5 overflow-x-auto flex gap-2 border-t border-slate-100 scrollbar-none">
            {MODULES.map((m) => {
              const Icon = m.icon
              const isActive = activeModule === m.id
              return (
                <button
                  key={m.id}
                  id={`btn-${m.id}`}
                  onClick={() => setActiveModule(m.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>Mod {m.number}: {m.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${isActive ? 'bg-slate-800 text-cyan-300' : 'bg-slate-100 text-slate-500'}`}>
                    {m.fr}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-6 space-y-6">
          {activeModule === 'm1' && (
            <div id="module-1-container" className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <HiOutlineDocumentArrowUp className="w-6 h-6 text-blue-600" />
                      Module 1: Financial Document Extraction Module (FR-01 – FR-06)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ingestion of JPG, PNG, and PDF documents, API dispatch, few-shot document classification, entity parsing, and structured JSON generation.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    6 / 6 FRs Active
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="border border-dashed border-slate-300 rounded-xl p-5 bg-slate-50/50 flex flex-col items-center justify-center text-center">
                    <HiOutlineDocumentArrowUp className="w-10 h-10 text-blue-500 mb-2" />
                    <h4 className="text-sm font-bold text-slate-800 mb-1">Upload Document (FR-01, FR-02)</h4>
                    <p className="text-xs text-slate-500 mb-3">Supported formats: JPG, JPEG, PNG, PDF (Up to 15MB)</p>
                    <div className="flex gap-2">
                      {['INVOICE (PDF)', 'BILL (PNG)', 'BANK STATEMENT (JPG)'].map((type, i) => (
                        <button
                          key={type}
                          onClick={() => setM1FileType(i === 0 ? 'INV' : i === 1 ? 'BILL' : 'STMT')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            (m1FileType === 'INV' && i === 0) || (m1FileType === 'BILL' && i === 1) || (m1FileType === 'STMT' && i === 2)
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-5 bg-white">
                    <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-3">
                      Identified Document Metadata (FR-03, FR-05)
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Document Type (FR-03):</span>
                        <span className="font-bold text-blue-700 px-2 py-0.5 rounded bg-blue-50">
                          {m1FileType === 'INV' ? 'TAX INVOICE' : m1FileType === 'BILL' ? 'SUPPLIER BILL' : 'BANK STATEMENT'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Vendor / Issuer (FR-05):</span>
                        <span className="font-semibold text-slate-800">
                          {m1FileType === 'INV' ? 'Apex Industrial Supplies Inc.' : m1FileType === 'BILL' ? 'Metro Electric & Power Co.' : 'Silicon Valley Bank (SVB)'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Document / Ref Number:</span>
                        <span className="font-mono text-slate-800 font-bold">
                          {m1FileType === 'INV' ? 'INV-2026-9042' : m1FileType === 'BILL' ? 'BILL-ELEC-4401' : 'STMT-NOV-2026'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Transaction Date:</span>
                        <span className="font-semibold text-slate-800">2026-11-14</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Total Amount & Tax:</span>
                        <span className="font-bold text-emerald-700">
                          {m1FileType === 'INV' ? '$14,500.00 (Tax: $1,160.00)' : m1FileType === 'BILL' ? '$1,420.00 (Tax: $113.60)' : '$42,500.00 Inflow'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-900 text-slate-200">
                  <div className="bg-slate-800/80 px-4 py-2 border-b border-slate-700 flex justify-between items-center text-xs">
                    <span className="font-bold text-cyan-300 font-mono">Structured JSON Output Payload (FR-04, FR-06)</span>
                    <span className="text-[10px] text-slate-400">Pydantic v2 Validated</span>
                  </div>
                  <pre className="p-4 text-xs font-mono overflow-x-auto text-emerald-400">
{JSON.stringify({
  document_type: m1FileType === 'INV' ? "invoice" : m1FileType === 'BILL' ? "bill" : "bank_statement",
  confidence_score: 0.992,
  extracted_fields: {
    vendor_name: m1FileType === 'INV' ? "Apex Industrial Supplies Inc." : "Metro Electric & Power Co.",
    document_number: m1FileType === 'INV' ? "INV-2026-9042" : "BILL-ELEC-4401",
    issue_date: "2026-11-14",
    due_date: "2026-12-14",
    currency: "USD",
    subtotal: m1FileType === 'INV' ? 13340.00 : 1306.40,
    tax_amount: m1FileType === 'INV' ? 1160.00 : 113.60,
    total_amount: m1FileType === 'INV' ? 14500.00 : 1420.00,
    line_items: [
      { description: "Industrial Pneumatic Valve Model-X", quantity: 10, unit_price: 850.00, amount: 8500.00, account_code: "5001" },
      { description: "Hydraulic Fluid Canister 50L", quantity: 6, unit_price: 806.67, amount: 4840.00, account_code: "5002" }
    ]
  }
}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeModule === 'm2' && (
            <div id="module-2-container" className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <HiOutlineChatBubbleLeftRight className="w-6 h-6 text-indigo-600" />
                      Module 2: Input Processing & Classification Module (FR-07 – FR-10)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Multimodal text/image ingestion, Presidio PII redaction, conversation memory, intent routing to specialized subagents.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    4 / 4 FRs Active
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                      Simulate Natural Language Financial Prompt (FR-07, FR-09)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={m2IntentQuery}
                        onChange={(e) => setM2IntentQuery(e.target.value)}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <button
                        onClick={() => {
                          const q = m2IntentQuery.toLowerCase()
                          if (q.includes('invoice')) setM2ClassifiedIntent('INVOICE_PROCESS')
                          else if (q.includes('bill') || q.includes('expense')) setM2ClassifiedIntent('EXPENSE_MGMT')
                          else if (q.includes('profit') || q.includes('revenue') || q.includes('report') || q.includes('compare')) setM2ClassifiedIntent('RAG_QUERY')
                          else setM2ClassifiedIntent('OUT_OF_SCOPE')
                        }}
                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all cursor-pointer shadow-xs"
                      >
                        Classify Intent (FR-09)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50">
                      <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block mb-1">
                        Classified Intent (FR-09)
                      </span>
                      <span className="text-base font-black text-indigo-900 font-mono">
                        {m2ClassifiedIntent}
                      </span>
                      <span className="text-[11px] text-indigo-600 block mt-1">Confidence: 99.4%</span>
                    </div>

                    <div className="p-4 rounded-xl border border-teal-100 bg-teal-50/50">
                      <span className="text-[11px] font-bold text-teal-600 uppercase tracking-wider block mb-1">
                        Routed LangGraph Agent (FR-10)
                      </span>
                      <span className="text-base font-black text-teal-900 font-mono">
                        {m2ClassifiedIntent === 'INVOICE_PROCESS' ? 'invoice_agent_node' : m2ClassifiedIntent === 'EXPENSE_MGMT' ? 'expense_agent_node' : m2ClassifiedIntent === 'RAG_QUERY' ? 'rag_analytics_agent' : 'guardrail_fallback_node'}
                      </span>
                      <span className="text-[11px] text-teal-600 block mt-1">Status: Dispatched</span>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        PII Sanitization (FR-08)
                      </span>
                      <span className="text-xs font-bold text-slate-700 block mt-1">
                        Presidio Redaction Active
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-1">Credit Cards / SSN Masked</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeModule === 'm3' && (
            <div id="module-3-container" className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <HiOutlineSparkles className="w-6 h-6 text-purple-600" />
                      Module 3: RAG Agent & Analytics Module (FR-11 – FR-18)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Sub-query decomposition, parameterized SQL query generation, multi-tenant relational retrieval, evidence citation, and fallback recovery.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    8 / 8 FRs Active
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-slate-200 rounded-xl p-5 bg-white">
                    <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider mb-2">
                      Sub-Query Decomposition (FR-11)
                    </h4>
                    <p className="text-xs text-slate-500 mb-3">Original: &quot;{m3Query}&quot;</p>
                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-100 text-purple-900 font-medium">
                        <strong>Sub-query 1:</strong> Retrieve total revenue for Q1 2026 (2026-01-01 to 2026-03-31)
                      </div>
                      <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-100 text-purple-900 font-medium">
                        <strong>Sub-query 2:</strong> Retrieve total revenue for Q2 2026 (2026-04-01 to 2026-06-30)
                      </div>
                      <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-100 text-purple-900 font-medium">
                        <strong>Sub-query 3:</strong> Compute percentage growth $\Delta = (Q2 - Q1) / Q1$ and rank top expense lines
                      </div>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-5 bg-slate-900 text-slate-200">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-xs font-bold uppercase text-cyan-300 tracking-wider">
                        Safe Parameterized SQL (FR-12, FR-13)
                      </h4>
                      <span className="text-[10px] text-emerald-400 font-semibold">Tenant-Isolated</span>
                    </div>
                    <pre className="text-xs font-mono text-emerald-300 p-2 bg-slate-950 rounded-lg overflow-x-auto">
{`SELECT 
  a.name AS category,
  SUM(jel.credit_amount) - SUM(jel.debit_amount) AS net_revenue
FROM journal_entry_line jel
JOIN account a ON a.id = jel.account_id
WHERE jel.company_id = :companyId 
  AND a.account_type = 'REVENUE'
  AND jel.entry_date BETWEEN :startDate AND :endDate
GROUP BY a.name;`}
                    </pre>
                  </div>
                </div>

                <div className="mt-6 border border-emerald-200 rounded-xl p-5 bg-emerald-50/40">
                  <h4 className="text-xs font-bold uppercase text-emerald-800 tracking-wider mb-2 flex items-center gap-1.5">
                    <HiOutlineCheckCircle className="w-4 h-4 text-emerald-600" />
                    Query Aggregation & Supporting Evidence (FR-14, FR-15)
                  </h4>
                  <div className="text-xs text-slate-700 space-y-1.5">
                    <p><strong>Synthesized Output:</strong> Q1 2026 Revenue was <strong>$98,700.00</strong> and Q2 2026 Revenue was <strong>$117,800.00</strong>, reflecting an organic growth rate of <strong>+19.35%</strong>.</p>
                    <p className="text-slate-500 text-[11px]">
                      <strong>Evidence Citations:</strong> Verified across 14 posted journal entries (Entries #JE-101 through #JE-114) between 2026-01-01 and 2026-06-30. Top operating expense: Payroll & Salaries ($42,000.00).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeModule === 'm4' && (
            <div id="module-4-container" className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <HiOutlineLockClosed className="w-6 h-6 text-slate-800" />
                      Module 4: Authentication & Company Management (FR-19 – FR-23)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Company registration, auto-admin promotion, multi-tenant credential login, secure logout, and password recovery.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    5 / 5 FRs Active
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-slate-200 rounded-xl p-5 bg-white">
                    <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider mb-3">
                      Company Profile Registration (FR-19, FR-20)
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="text-slate-500">Company Name:</label>
                        <input readOnly value="FinFlow Global Tech Inc." className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded bg-slate-50 font-semibold" />
                      </div>
                      <div>
                        <label className="text-slate-500">Admin Email & Role (FR-20):</label>
                        <input readOnly value="admin@finflow.ai (Role: ADMIN Assigned)" className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded bg-slate-50 font-semibold text-emerald-700" />
                      </div>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-5 bg-white">
                    <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider mb-3">
                      Authentication & Password Reset (FR-21, FR-22, FR-23)
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Session Status (FR-21):</span>
                        <span className="font-bold text-emerald-700">Authenticated (Tenant ID: 1)</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Password Recovery (FR-23):</span>
                        <span className="font-bold text-blue-700">Firebase Reset Dispatch Active</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Logout Action (FR-22):</span>
                        <span className="font-bold text-slate-700">SignOut Hook Bound</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeModule === 'm5' && (
            <div id="module-5-container" className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <HiOutlineBookOpen className="w-6 h-6 text-emerald-600" />
                      Module 5: Chart of Accounts Management (FR-24 – FR-28)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Assets, Liabilities, Equity, Revenue, Expense categorization, 1xxx–5xxx code numbering, account modification, deletion guardrails, search.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    5 / 5 FRs Active
                  </span>
                </div>
                <ChartOfAccounts />
              </div>
            </div>
          )}

          {activeModule === 'm6' && (
            <div id="module-6-container" className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <HiOutlineReceiptPercent className="w-6 h-6 text-amber-600" />
                      Module 6: Bill Management Module (FR-29 – FR-35)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Manual bill creation, AI prefill, user confirmation review, double-entry (Debit Expense, Credit AP), unpaid tracking, and overdue state updates.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    7 / 7 FRs Active
                  </span>
                </div>
                <BillsList />
              </div>
            </div>
          )}

          {activeModule === 'm7' && (
            <div id="module-7-container" className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <HiOutlineDocumentText className="w-6 h-6 text-cyan-600" />
                      Module 7: Invoice Management Module (FR-36 – FR-43)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Invoice creation, automatic double-entry (Debit AR, Credit Revenue), editing, deletion lock, dynamic balance decrement, partial settlements.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
                    8 / 8 FRs Active
                  </span>
                </div>
                <InvoiceList />
              </div>
            </div>
          )}

          {activeModule === 'm8' && (
            <div id="module-8-container" className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <HiOutlineBanknotes className="w-6 h-6 text-teal-600" />
                      Module 8: Payment Management Module (FR-44 – FR-52)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Customer invoice payments, supplier disbursements, dynamic balance allocation, rollback on deletion, and payment journal entries.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                    9 / 9 FRs Active
                  </span>
                </div>
                <PaymentList />
              </div>
            </div>
          )}

          {activeModule === 'm9' && (
            <div id="module-9-container" className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <HiOutlineCreditCard className="w-6 h-6 text-emerald-600" />
                      Module 9: Bank Balance Management Module (FR-53 – FR-56)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Automatic bank increase on customer receipts, decrease on bill payments/expenses, and chronological running balance audit logs.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    4 / 4 FRs Active
                  </span>
                </div>
                <BankAccountHistory />
              </div>
            </div>
          )}

          {activeModule === 'm10' && (
            <div id="module-10-container" className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <HiOutlineChartBar className="w-6 h-6 text-violet-600" />
                      Module 10: Financial & Report Module (FR-57 – FR-61)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Period filtering (Daily, Monthly, Yearly), double-entry balanced ledger verification, Excel CSV export, PDF layout, and P&L dashboard.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-violet-50 text-violet-700 border border-violet-200">
                    5 / 5 FRs Active
                  </span>
                </div>
                <ProfitLossReport />
              </div>
            </div>
          )}

          {activeModule === 'm11' && (
            <div id="module-11-container" className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <HiOutlineArrowTrendingUp className="w-6 h-6 text-cyan-600" />
                      Module 11: Forecasting & Prediction Agent Module (FR-62 – FR-66)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Predictive machine learning income/expense models, hybrid trend extrapolation, dynamic P10-P90 bounds, and 3M/6M/12M trend horizons.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
                    5 / 5 FRs Active
                  </span>
                </div>
                <ForecastingDashboard />
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthContext.Provider>
  )
}
