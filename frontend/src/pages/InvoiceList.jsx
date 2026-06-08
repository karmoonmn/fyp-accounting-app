import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import {
  HiOutlineArrowsUpDown,
  HiOutlineCheckCircle,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineExclamationCircle,
  HiOutlineMagnifyingGlass,
  HiOutlineDocumentText,
  HiOutlineBanknotes,
  HiOutlineClock,
  HiOutlineXMark,
  HiOutlineCalendarDays,
  HiOutlineFunnel,
} from 'react-icons/hi2'
import DashboardLayout from '../components/DashboardLayout'

function formatMoney(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n)
}

const STATUS_OPTIONS = [
  { key: 'all', label: 'All', color: 'bg-gray-100 text-gray-700' },
  { key: 'open', label: 'Open', color: 'bg-blue-50 text-blue-700' },
  { key: 'partial', label: 'Partially Paid', color: 'bg-orange-50 text-orange-700' },
  { key: 'paid', label: 'Paid', color: 'bg-emerald-50 text-emerald-700' },
  { key: 'overdue', label: 'Overdue', color: 'bg-red-50 text-red-700' },
]

const SORT_OPTIONS = [
  { key: 'date-desc', label: 'Date (Newest)' },
  { key: 'date-asc', label: 'Date (Oldest)' },
  { key: 'customer-asc', label: 'Customer (A-Z)' },
  { key: 'customer-desc', label: 'Customer (Z-A)' },
  { key: 'docNumber-asc', label: 'Invoice No. (A-Z)' },
  { key: 'docNumber-desc', label: 'Invoice No. (Z-A)' },
  { key: 'amount-desc', label: 'Amount (High-Low)' },
  { key: 'amount-asc', label: 'Amount (Low-High)' },
]

function StatusBadge({ status }) {
  if (status.kind === 'overdue') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-[12px] font-semibold text-red-700 ring-1 ring-red-100">
        <HiOutlineExclamationCircle className="h-3.5 w-3.5" />
        {status.label}
      </span>
    )
  }
  if (status.kind === 'closed') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
        <HiOutlineCheckCircle className="h-3.5 w-3.5" />
        {status.label}
      </span>
    )
  }
  if (status.kind === 'due') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[12px] font-semibold text-amber-700 ring-1 ring-amber-100">
        <HiOutlineClock className="h-3.5 w-3.5" />
        {status.label}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[12px] font-semibold text-blue-700 ring-1 ring-blue-100">
      {status.label}
    </span>
  )
}

export default function InvoiceList() {
  const navigate = useNavigate()
  const { me, meError, getFreshToken } = useAuth()
  const [selected, setSelected] = useState(() => new Set())
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date-desc')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    if (!me || meError) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const token = await getFreshToken()
        if (!token || cancelled) return
        const data = await api('/invoice', { token })
        if (!cancelled) {
          setInvoices(data || [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not fetch invoices')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [me, meError, getFreshToken])

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return
    try {
      const token = await getFreshToken()
      if (!token) return
      await api(`/invoice/${id}`, { method: 'DELETE', token })
      setInvoices((prev) => prev.filter((inv) => inv.id.toString() !== id.toString()))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not delete invoice')
    }
  }

  function getInvoiceStatus(inv) {
    const balance = Number.parseFloat(inv.balance) || 0
    const total = Number.parseFloat(inv.totalAmt) || 0
    if (balance <= 0 && total > 0) {
      return { kind: 'closed', label: 'Paid' }
    }
    if (inv.dueDate) {
      const today = new Date().setHours(0, 0, 0, 0)
      const due = new Date(inv.dueDate).setHours(0, 0, 0, 0)
      if (due < today) {
        return { kind: 'overdue', label: 'Overdue' }
      }
    }
    if (balance < total && balance > 0) {
      return { kind: 'due', label: 'Partially Paid' }
    }
    return { kind: 'open', label: 'Open' }
  }

  const rows = useMemo(() => invoices.map((inv) => ({
    id: inv.id.toString(),
    date: inv.txnDate || '—',
    type: 'Invoice',
    no: inv.docNumber || '—',
    customer: inv.customer ? inv.customer.name : '—',
    memo: inv.shipAddr || '',
    amount: Number.parseFloat(inv.totalAmt) || 0,
    balance: Number.parseFloat(inv.balance) || 0,
    status: getInvoiceStatus(inv),
    dueDate: inv.dueDate || '',
  })), [invoices])

  const filteredAndSorted = useMemo(() => {
    let result = [...rows]

    // Search filter
    const q = searchText.trim().toLowerCase()
    if (q) {
      result = result.filter((row) =>
        row.customer.toLowerCase().includes(q) ||
        row.no.toLowerCase().includes(q) ||
        row.memo.toLowerCase().includes(q) ||
        row.amount.toString().includes(q)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      const statusMap = {
        open: 'open',
        partial: 'due',
        paid: 'closed',
        overdue: 'overdue',
      }
      result = result.filter((row) => row.status.kind === statusMap[statusFilter])
    }

    // Date range filter
    if (dateFrom) {
      result = result.filter((row) => row.date >= dateFrom)
    }
    if (dateTo) {
      result = result.filter((row) => row.date <= dateTo)
    }

    // Sort
    const [field, dir] = sortBy.split('-')
    result.sort((a, b) => {
      let cmp = 0
      switch (field) {
        case 'date':
          cmp = (a.date || '').localeCompare(b.date || '')
          break
        case 'customer':
          cmp = (a.customer || '').localeCompare(b.customer || '')
          break
        case 'docNumber':
          cmp = (a.no || '').localeCompare(b.no || '')
          break
        case 'amount':
          cmp = a.amount - b.amount
          break
        default:
          cmp = 0
      }
      return dir === 'desc' ? -cmp : cmp
    })

    return result
  }, [rows, searchText, statusFilter, sortBy, dateFrom, dateTo])

  // Summary stats
  const stats = useMemo(() => {
    const total = rows.length
    const totalAmount = rows.reduce((s, r) => s + r.amount, 0)
    const paid = rows.filter((r) => r.status.kind === 'closed').length
    const overdue = rows.filter((r) => r.status.kind === 'overdue').length
    const overdueAmt = rows.filter((r) => r.status.kind === 'overdue').reduce((s, r) => s + r.balance, 0)
    return { total, totalAmount, paid, overdue, overdueAmt }
  }, [rows])

  const filteredTotal = filteredAndSorted.reduce((s, r) => s + r.amount, 0)

  function toggleRow(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === filteredAndSorted.length) setSelected(new Set())
    else setSelected(new Set(filteredAndSorted.map((r) => r.id)))
  }

  function clearFilters() {
    setSearchText('')
    setStatusFilter('all')
    setSortBy('date-desc')
    setDateFrom('')
    setDateTo('')
  }

  const hasActiveFilters = searchText || statusFilter !== 'all' || dateFrom || dateTo

  return (
    <DashboardLayout activeNav="invoices">
      <div className="space-y-6" style={{ animation: 'fadeIn 0.4s ease-out' }}>
        {/* Simple Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[28px] font-bold tracking-tight text-[#111827]">Invoices</h2>
            {/*<p className="mt-0.5 text-[14px] font-medium text-[#6B7280]">*/}
            {/*  {stats.total} total invoice{stats.total !== 1 ? 's' : ''} · {formatMoney(stats.totalAmount)}*/}
            {/*</p>*/}
          </div>
          <button
            type="button"
            onClick={() => navigate('/invoice/new')}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#0F766E] px-5 text-[14px] font-bold text-white shadow-sm hover:bg-[#0F766E]/90 transition-all"
          >
            New Invoice
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Invoices', value: stats.total, sub: formatMoney(stats.totalAmount), color: 'border-l-emerald-500', icon: HiOutlineDocumentText, iconBg: 'bg-emerald-50 text-emerald-600' },
            { label: 'Paid', value: stats.paid, sub: `of ${stats.total}`, color: 'border-l-blue-500', icon: HiOutlineCheckCircle, iconBg: 'bg-blue-50 text-blue-600' },
            { label: 'Overdue', value: stats.overdue, sub: formatMoney(stats.overdueAmt), color: 'border-l-red-500', icon: HiOutlineExclamationCircle, iconBg: 'bg-red-50 text-red-600' },
            { label: 'Collection Rate', value: stats.total > 0 ? `${Math.round((stats.paid / stats.total) * 100)}%` : '0%', sub: 'paid invoices', color: 'border-l-amber-500', icon: HiOutlineBanknotes, iconBg: 'bg-amber-50 text-amber-600' },
          ].map((card, i) => (
            <div
              key={i}
              className={`rounded-2xl border border-[#E5E7EB] border-l-[3px] ${card.color} bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md`}
              style={{ animation: `fadeIn 0.4s ease-out ${i * 0.08}s both` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">{card.label}</p>
                  <p className="mt-1 text-[28px] font-bold tabular-nums text-[#111827]">{card.value}</p>
                  <p className="mt-0.5 text-[13px] font-medium text-[#9CA3AF]">{card.sub}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBg}`}>
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters & Table */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
          {/* Filter Bar */}
          <div className="border-b border-[#E5E7EB] p-5">
            <div className="flex flex-col gap-4">
              {/* Top row: Search + Sort + Date */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[240px] max-w-[360px]">
                  <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    type="search"
                    placeholder="Search invoices, customers, amounts..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] pl-10 pr-3 text-[13px] text-[#111827] placeholder-[#9CA3AF] transition-colors focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <HiOutlineCalendarDays className="h-4 w-4 text-[#9CA3AF]" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-10 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-[13px] text-[#111827] transition-colors focus:border-emerald-500 focus:outline-none"
                    title="From date"
                  />
                  <span className="text-[12px] font-medium text-[#9CA3AF]">to</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-10 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-[13px] text-[#111827] transition-colors focus:border-emerald-500 focus:outline-none"
                    title="To date"
                  />
                </div>

                {/* Sort dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-[13px] font-medium text-[#111827] transition-colors hover:border-emerald-400"
                  >
                    <HiOutlineArrowsUpDown className="h-4 w-4 text-[#6B7280]" />
                    {SORT_OPTIONS.find((o) => o.key === sortBy)?.label || 'Sort'}
                    <HiOutlineChevronDown className="h-3.5 w-3.5 text-[#6B7280]" />
                  </button>
                  {showSortMenu && (
                    <div className="absolute right-0 top-12 z-50 w-52 rounded-xl border border-[#E5E7EB] bg-white p-1.5 shadow-xl">
                      {SORT_OPTIONS.map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => { setSortBy(opt.key); setShowSortMenu(false) }}
                          className={`w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors ${sortBy === opt.key ? 'bg-emerald-50 text-emerald-700' : 'text-[#374151] hover:bg-[#F9FAFB]'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-100"
                  >
                    <HiOutlineXMark className="h-4 w-4" />
                    Clear
                  </button>
                )}
              </div>

              {/* Status pills */}
              <div className="flex flex-wrap items-center gap-2">
                <HiOutlineFunnel className="h-4 w-4 text-[#9CA3AF]" />
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setStatusFilter(opt.key)}
                    className={`rounded-full px-4 py-1.5 text-[12px] font-semibold transition-all ${
                      statusFilter === opt.key
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'
                    }`}
                  >
                    {opt.label}
                    {opt.key !== 'all' && (
                      <span className="ml-1.5 opacity-70">
                        {rows.filter((r) => {
                          const statusMap = { open: 'open', partial: 'due', paid: 'closed', overdue: 'overdue' }
                          return r.status.kind === statusMap[opt.key]
                        }).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA] text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">
                  <th className="w-10 py-3 pl-5 pr-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border border-[#D1D5DB] bg-white accent-emerald-600 focus:ring-2 focus:ring-emerald-600/30"
                      checked={selected.size === filteredAndSorted.length && filteredAndSorted.length > 0}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Invoice No.</th>
                  <th className="py-3 pr-4">Customer</th>
                  <th className="py-3 pr-4">Due Date</th>
                  <th className="py-3 pr-4 text-right">Amount</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-5">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#F3F4F6]">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="py-4 px-4">
                          <div className="h-4 w-full animate-pulse rounded-lg bg-[#F3F4F6]" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : error ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <HiOutlineExclamationCircle className="h-8 w-8 text-red-400" />
                        <p className="text-[14px] font-semibold text-red-600">{error}</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredAndSorted.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <HiOutlineDocumentText className="h-10 w-10 text-[#D1D5DB]" />
                        <p className="text-[14px] font-semibold text-[#6B7280]">
                          {hasActiveFilters ? 'No invoices match your filters' : 'No invoices yet'}
                        </p>
                        {hasActiveFilters && (
                          <button
                            type="button"
                            onClick={clearFilters}
                            className="mt-1 text-[13px] font-semibold text-emerald-600 hover:underline"
                          >
                            Clear all filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAndSorted.map((row, i) => (
                    <tr
                      key={row.id}
                      className={`border-b border-[#F3F4F6] transition-colors hover:bg-emerald-50/30 ${
                        selected.has(row.id) ? 'bg-emerald-50/50' : i % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'
                      }`}
                    >
                      <td className="py-3.5 pl-5 pr-2 align-middle">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border border-[#D1D5DB] bg-white accent-emerald-600 focus:ring-2 focus:ring-emerald-600/30"
                          checked={selected.has(row.id)}
                          onChange={() => toggleRow(row.id)}
                        />
                      </td>
                      <td className="py-3.5 pr-4 align-middle font-medium text-[#111827]">{row.date}</td>
                      <td className="py-3.5 pr-4 align-middle">
                        <span className="font-bold text-emerald-700">{row.no}</span>
                      </td>
                      <td className="py-3.5 pr-4 align-middle font-medium text-[#111827]">{row.customer}</td>
                      <td className="py-3.5 pr-4 align-middle text-[#6B7280]">{row.dueDate || '—'}</td>
                      <td className="py-3.5 pr-4 align-middle text-right font-semibold tabular-nums text-[#111827]">
                        {formatMoney(row.amount)}
                      </td>
                      <td className="py-3.5 pr-4 align-middle">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="py-3.5 pr-5 align-middle">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/invoice/edit/${row.id}`)}
                            className="rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate('/invoice/payment')}
                            className="rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-blue-600 transition-colors hover:bg-blue-50"
                          >
                            Pay
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(row.id)}
                            className="rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-red-500 transition-colors hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredAndSorted.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-[#E5E7EB] bg-[#FAFAFA]">
                    <td colSpan={5} className="py-3.5 pl-5 text-[13px] font-bold text-[#111827]">
                      Total ({filteredAndSorted.length} invoice{filteredAndSorted.length !== 1 ? 's' : ''})
                    </td>
                    <td className="py-3.5 pr-4 text-right text-[14px] font-bold tabular-nums text-[#111827]">
                      {formatMoney(filteredTotal)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[#E5E7EB] px-5 py-3 text-[13px]">
            <span className="font-medium text-[#6B7280]">
              Showing {filteredAndSorted.length} of {rows.length} invoices
            </span>
            {selected.size > 0 && (
              <span className="font-semibold text-emerald-600">
                {selected.size} selected
              </span>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
