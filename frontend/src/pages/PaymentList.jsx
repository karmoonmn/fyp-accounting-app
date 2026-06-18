import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import {
  HiOutlineArrowUpTray,
  HiOutlineArrowsUpDown,
  HiOutlineCheckCircle,
  HiOutlineChevronDown,
  HiOutlineMagnifyingGlass,
  HiOutlinePrinter,
  HiOutlineCog6Tooth,
  HiOutlineCalendarDays,
  HiOutlineXMark,
} from 'react-icons/hi2'
import DashboardLayout from '../components/DashboardLayout'

function formatMoney(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n)
}

const SORT_OPTIONS = [
  { key: 'date-desc', label: 'Newest first' },
  { key: 'date-asc', label: 'Oldest first' },
  { key: 'amount-desc', label: 'Amount (High-Low)' },
  { key: 'amount-asc', label: 'Amount (Low-High)' },
]

export default function PaymentList() {
  const navigate = useNavigate()
  const { me, meError, getFreshToken } = useAuth()
  const [selected, setSelected] = useState(() => new Set())
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchText, setSearchText] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState('date-desc')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [showPaymentMenu, setShowPaymentMenu] = useState(false)

  useEffect(() => {
    if (!me || meError) return
    let cancelled = false
      ; (async () => {
        setLoading(true)
        try {
          const token = await getFreshToken()
          if (!token || cancelled) return
          const data = await api('/payment', { token })
          if (!cancelled) {
            setPayments(data || [])
          }
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Could not fetch payments')
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
    if (!window.confirm('Are you sure you want to delete this payment? This will revert the balances on affected invoices or bills.')) return
    try {
      const token = await getFreshToken()
      if (!token) return
      await api(`/payment/${id}`, { method: 'DELETE', token })
      setPayments((prev) => prev.filter((p) => p.id.toString() !== id.toString()))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not delete payment')
    }
  }

  async function handleBatchDelete() {
    if (selected.size === 0) return
    if (!window.confirm(`Delete ${selected.size} selected payment${selected.size > 1 ? 's' : ''}? This will revert the balances on all affected invoices or bills.`)) return
    try {
      const token = await getFreshToken()
      if (!token) return
      await Promise.all(Array.from(selected).map(id => api(`/payment/${id}`, { method: 'DELETE', token })))
      setPayments(prev => prev.filter(p => !selected.has(p.id.toString())))
      setSelected(new Set())
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not delete payments')
    }
  }

  const rows = payments.map((p) => ({
    id: p.id.toString(),
    date: p.txnDate || '—',
    no: p.docNumber || '—',
    depositTo: p.depositTo || 'Bank',
    type: p.paymentType === 'INVOICE_RECEIPT' ? 'Receive Payment' : 'Payment',
    docType: p.paymentType === 'INVOICE_RECEIPT' ? 'Invoice' : 'Bill',
    amount: Number.parseFloat(p.totalAmount) || 0,
  }))

  const filteredAndSorted = useMemo(() => {
    let result = [...rows]

    // Search
    const q = searchText.trim().toLowerCase()
    if (q) {
      result = result.filter((row) =>
        row.no.toLowerCase().includes(q) ||
        row.depositTo.toLowerCase().includes(q) ||
        row.docType.toLowerCase().includes(q)
      )
    }

    // Date range
    if (dateFrom) result = result.filter((row) => row.date >= dateFrom)
    if (dateTo) result = result.filter((row) => row.date <= dateTo)

    // Sort
    const [field, dir] = sortBy.split('-')
    result.sort((a, b) => {
      let cmp = 0
      switch (field) {
        case 'date': cmp = (a.date || '').localeCompare(b.date || ''); break
        case 'amount': cmp = a.amount - b.amount; break
        default: cmp = 0
      }
      return dir === 'desc' ? -cmp : cmp
    })

    return result
  }, [rows, searchText, sortBy, dateFrom, dateTo])

  const totalAmount = filteredAndSorted.reduce((s, r) => s + r.amount, 0)
  const pageStart = filteredAndSorted.length > 0 ? 1 : 0
  const pageEnd = filteredAndSorted.length
  const totalCount = filteredAndSorted.length

  const hasActiveFilters = searchText || dateFrom || dateTo || sortBy !== 'date-desc'
  
  function clearFilters() {
    setSearchText(''); setSortBy('date-desc'); setDateFrom(''); setDateTo('')
  }

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

  return (
    <DashboardLayout activeNav="payments">
      <div className="space-y-6">
        <div>
          <h2 className="text-[#111827] text-[28px] font-bold tracking-tight">Payments</h2>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[240px] max-w-[360px]">
                  <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    type="search"
                    placeholder="Search ref no, deposit to, doc type..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] pl-10 pr-3 text-[13px] text-[#111827] placeholder-[#9CA3AF] transition-colors focus:border-[#0F766E] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <HiOutlineCalendarDays className="h-4 w-4 text-[#9CA3AF]" />
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                    className="h-10 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-[13px] text-[#111827] transition-colors focus:border-[#0F766E] focus:outline-none" title="From date" />
                  <span className="text-[12px] font-medium text-[#9CA3AF]">to</span>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                    className="h-10 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-[13px] text-[#111827] transition-colors focus:border-[#0F766E] focus:outline-none" title="To date" />
                </div>

                <div className="relative">
                  <button type="button" onClick={() => setShowSortMenu(!showSortMenu)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-[13px] font-medium text-[#111827] transition-colors hover:border-[#0F766E]">
                    <HiOutlineArrowsUpDown className="h-4 w-4 text-[#6B7280]" />
                    {SORT_OPTIONS.find((o) => o.key === sortBy)?.label || 'Sort'}
                    <HiOutlineChevronDown className="h-3.5 w-3.5 text-[#6B7280]" />
                  </button>
                  {showSortMenu && (
                    <div className="absolute right-0 top-12 z-50 w-52 rounded-xl border border-[#E5E7EB] bg-white p-1.5 shadow-xl">
                      {SORT_OPTIONS.map((opt) => (
                        <button key={opt.key} type="button"
                          onClick={() => { setSortBy(opt.key); setShowSortMenu(false) }}
                          className={`w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors ${sortBy === opt.key ? 'bg-[#CCFBF1] text-[#0F766E]' : 'text-[#374151] hover:bg-[#F9FAFB]'}`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {hasActiveFilters && (
                  <button type="button" onClick={clearFilters}
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-100">
                    <HiOutlineXMark className="h-4 w-4" /> Clear
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPaymentMenu(!showPaymentMenu)}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#0F766E] px-5 text-[14px] font-bold text-white shadow-sm hover:bg-[#0F766E]/90"
                >
                  Record payment
                  <HiOutlineChevronDown className="h-4 w-4" />
                </button>
                {showPaymentMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-lg z-50">
                    <button
                      onClick={() => navigate('/invoice/payment')}
                      className="w-full px-4 py-3 text-left text-[13px] font-semibold text-[#111827] hover:bg-[#F9FAFB]"
                    >
                      Receive payment (Invoice)
                    </button>
                    <button
                      onClick={() => navigate('/bill/payment')}
                      className="w-full px-4 py-3 text-left text-[13px] font-semibold text-[#111827] hover:bg-[#F9FAFB]"
                    >
                      Make payment (Bill)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/*<div className="mt-2 flex justify-end gap-2 border-b border-[#E5E7EB] pb-2">*/}
          {/*  <button*/}
          {/*    type="button"*/}
          {/*    className="rounded-lg p-2 text-[#64748B] hover:bg-[#F9FAFB] hover:text-[#111827]"*/}
          {/*    title="Print"*/}
          {/*  >*/}
          {/*    <HiOutlinePrinter className="h-5 w-5" />*/}
          {/*  </button>*/}
          {/*  <button*/}
          {/*    type="button"*/}
          {/*    className="rounded-lg p-2 text-[#64748B] hover:bg-[#F9FAFB] hover:text-[#111827]"*/}
          {/*    title="Export"*/}
          {/*  >*/}
          {/*    <HiOutlineArrowUpTray className="h-5 w-5" />*/}
          {/*  </button>*/}
          {/*  <button*/}
          {/*    type="button"*/}
          {/*    className="rounded-lg p-2 text-[#64748B] hover:bg-[#F9FAFB] hover:text-[#111827]"*/}
          {/*    title="Settings"*/}
          {/*  >*/}
          {/*    <HiOutlineCog6Tooth className="h-5 w-5" />*/}
          {/*  </button>*/}
          {/*</div>*/}

          <div className="overflow-x-auto">
            <table className="mt-2 w-full min-w-[960px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">
                  <th className="w-10 py-3 pr-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border border-[#D1D5DB] bg-white accent-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/30"
                      checked={selected.size === filteredAndSorted.length && filteredAndSorted.length > 0}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="py-3 pr-4">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-[#111827]">
                      Date
                      <HiOutlineArrowsUpDown className="h-3.5 w-3.5" />
                    </button>
                  </th>
                  <th className="py-3 pr-4">Type</th>
                  <th className="py-3 pr-4">Document</th>
                  <th className="py-3 pr-4">Ref No.</th>
                  <th className="py-3 pr-4">Deposit To</th>
                  <th className="py-3 pr-4 text-right">Amount</th>
                  <th className="py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[13px] font-semibold text-[#64748B]">
                      Loading payments...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[13px] font-semibold text-[#B91C1C]">
                      {error}
                    </td>
                  </tr>
                ) : filteredAndSorted.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[13px] font-semibold text-[#64748B]">
                      No payments found.
                    </td>
                  </tr>
                ) : (
                  filteredAndSorted.map((row, i) => (
                    <tr
                      key={row.id}
                      className={`border-b border-[#F3F4F6] ${i % 2 === 1 ? 'bg-[#F9FAFB]/80' : 'bg-white'}`}
                    >
                      <td className="py-3 pr-2 align-middle">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border border-[#D1D5DB] bg-white accent-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/30"
                          checked={selected.has(row.id)}
                          onChange={() => toggleRow(row.id)}
                        />
                      </td>
                      <td className="py-3 pr-4 align-middle font-medium text-[#111827]">{row.date}</td>
                      <td className="py-3 pr-4 align-middle text-[#374151]">{row.type}</td>
                      <td className="py-3 pr-4 align-middle">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${row.docType === 'Invoice'
                            ? 'bg-[#DBEAFE] text-[#1D4ED8]'
                            : 'bg-[#FEF3C7] text-[#92400E]'
                          }`}>
                          {row.docType}
                        </span>
                      </td>
                      <td className="py-3 pr-4 align-middle font-semibold text-[#0F766E]">{row.no}</td>
                      <td className="py-3 pr-4 align-middle text-[#111827]">{row.depositTo}</td>
                      <td className="py-3 pr-4 align-middle text-right font-semibold tabular-nums text-[#111827]">
                        {formatMoney(row.amount)}
                      </td>
                      <td className="py-3 align-middle">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <button
                            type="button"
                            onClick={() => navigate(row.docType === 'Bill' ? `/bill/payment/edit/${row.id}` : `/payment/edit/${row.id}`)}
                            className="font-semibold text-[#0F766E] hover:underline"
                          >
                            View/Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(row.id)}
                            className="font-semibold text-[#B91C1C] hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-[#E5E7EB] bg-[#F3F4F6] text-[13px]">
                  <td colSpan={6} className="px-2 py-3 font-bold text-[#111827]">
                    Total
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-[#111827]">
                    {formatMoney(totalAmount)}
                  </td>
                  <td className="py-3" />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-[#E5E7EB] px-2 py-3 text-[13px]">
            <div>
              {selected.size > 0 && (
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-[#0F766E]">{selected.size} selected</span>
                  <button
                    type="button"
                    onClick={handleBatchDelete}
                    className="rounded-lg bg-red-50 px-3 py-1.5 text-[12px] font-semibold text-red-600 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 font-semibold text-[#0F766E]">
              <button type="button" className="hover:underline disabled:opacity-40" disabled>First</button>
              <button type="button" className="hover:underline disabled:opacity-40" disabled>Previous</button>
              <span className="text-[#64748B]">{pageStart}-{pageEnd} of {totalCount}</span>
              <button type="button" className="hover:underline disabled:opacity-40" disabled>Next</button>
              <button type="button" className="hover:underline disabled:opacity-40" disabled>Last</button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
