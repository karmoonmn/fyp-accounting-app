import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import {
  HiOutlineMagnifyingGlass,
  HiOutlineCreditCard,
  HiOutlineArrowDownTray,
  HiOutlineArrowUpTray,
  HiOutlineArrowsUpDown,
  HiOutlineChevronDown,
  HiOutlineCalendarDays,
  HiOutlineXMark,
  HiOutlineBanknotes,
  HiOutlineFunnel,
} from 'react-icons/hi2'
import DashboardLayout from '../components/DashboardLayout'

function formatRm(n) {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2,
  }).format(n)
}

const SORT_OPTIONS = [
  { key: 'date-desc', label: 'Date (Newest)' },
  { key: 'date-asc', label: 'Date (Oldest)' },
  { key: 'amount-desc', label: 'Amount (High-Low)' },
  { key: 'amount-asc', label: 'Amount (Low-High)' },
]

export default function BankAccountHistory() {
  const navigate = useNavigate()
  const { me, meError, getFreshToken } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchText, setSearchText] = useState('')
  const [sortBy, setSortBy] = useState('date-desc')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    if (!me || meError) return
    let cancelled = false
      ; (async () => {
        setLoading(true)
        try {
          const token = await getFreshToken()
          if (!token || cancelled) return
          const data = await api('/account/bank/ledger', { token })
          if (!cancelled) {
            setRows(data || [])
          }
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Could not fetch bank ledger')
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

  const stats = useMemo(() => {
    const totalDeposits = rows.reduce((s, r) => s + (r.deposit || 0), 0)
    const totalPayments = rows.reduce((s, r) => s + (r.payment || 0), 0)
    const endingBalance = rows.length > 0 ? rows[rows.length - 1].balance : 0
    const netFlow = totalDeposits - totalPayments
    return { totalDeposits, totalPayments, endingBalance, netFlow, count: rows.length }
  }, [rows])

  const filteredAndSorted = useMemo(() => {
    let result = [...rows]

    // Search
    const q = searchText.trim().toLowerCase()
    if (q) {
      result = result.filter((row) =>
        (row.refNo || '').toLowerCase().includes(q) ||
        (row.payee || '').toLowerCase().includes(q) ||
        (row.memo || '').toLowerCase().includes(q) ||
        (row.refType || '').toLowerCase().includes(q)
      )
    }

    // Date range
    if (dateFrom) result = result.filter((row) => (row.date || '') >= dateFrom)
    if (dateTo) result = result.filter((row) => (row.date || '') <= dateTo)

    // Sort
    const [field, dir] = sortBy.split('-')
    result.sort((a, b) => {
      let cmp = 0
      switch (field) {
        case 'date': cmp = (a.date || '').localeCompare(b.date || ''); break
        case 'amount': {
          const aAmt = (a.deposit || 0) + (a.payment || 0)
          const bAmt = (b.deposit || 0) + (b.payment || 0)
          cmp = aAmt - bAmt
          break
        }
        default: cmp = 0
      }
      return dir === 'desc' ? -cmp : cmp
    })

    return result
  }, [rows, searchText, sortBy, dateFrom, dateTo])

  function clearFilters() {
    setSearchText(''); setSortBy('date-desc'); setDateFrom(''); setDateTo('')
  }

  const hasActiveFilters = searchText || dateFrom || dateTo

  return (
    <DashboardLayout activeNav="bank">
      <div className="space-y-6" style={{ animation: 'fadeIn 0.4s ease-out' }}>
        {/* Simple Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[28px] font-bold tracking-tight text-[#111827]">Bank Account</h2>
            <p className="mt-0.5 text-[14px] font-medium text-[#6B7280]">
              {stats.count} transaction{stats.count !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">Ending Balance</p>
            <p className="text-[32px] font-bold tabular-nums text-[#111827] leading-none mt-1">{formatRm(stats.endingBalance)}</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Deposits', value: formatRm(stats.totalDeposits), color: 'border-l-emerald-500', icon: HiOutlineArrowDownTray, iconBg: 'bg-emerald-50 text-emerald-600' },
            { label: 'Total Payments', value: formatRm(stats.totalPayments), color: 'border-l-red-500', icon: HiOutlineArrowUpTray, iconBg: 'bg-red-50 text-red-600' },
            { label: 'Net Flow', value: formatRm(stats.netFlow), color: stats.netFlow >= 0 ? 'border-l-blue-500' : 'border-l-amber-500', icon: HiOutlineBanknotes, iconBg: stats.netFlow >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600' },
          ].map((card, i) => (
            <div
              key={i}
              className={`rounded-2xl border border-[#E5E7EB] border-l-[3px] ${card.color} bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md`}
              style={{ animation: `fadeIn 0.4s ease-out ${i * 0.08}s both` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">{card.label}</p>
                  <p className="mt-1 text-[24px] font-bold tabular-nums text-[#111827]">{card.value}</p>
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
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px] max-w-[360px]">
                <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="search"
                  placeholder="Search by ref, payee, memo..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] pl-10 pr-3 text-[13px] text-[#111827] placeholder-[#9CA3AF] transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <HiOutlineCalendarDays className="h-4 w-4 text-[#9CA3AF]" />
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                  className="h-10 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-[13px] text-[#111827] transition-colors focus:border-blue-500 focus:outline-none" />
                <span className="text-[12px] font-medium text-[#9CA3AF]">to</span>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                  className="h-10 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-[13px] text-[#111827] transition-colors focus:border-blue-500 focus:outline-none" />
              </div>

              <div className="relative">
                <button type="button" onClick={() => setShowSortMenu(!showSortMenu)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-[13px] font-medium text-[#111827] transition-colors hover:border-blue-400">
                  <HiOutlineArrowsUpDown className="h-4 w-4 text-[#6B7280]" />
                  {SORT_OPTIONS.find((o) => o.key === sortBy)?.label || 'Sort'}
                  <HiOutlineChevronDown className="h-3.5 w-3.5 text-[#6B7280]" />
                </button>
                {showSortMenu && (
                  <div className="absolute right-0 top-12 z-50 w-48 rounded-xl border border-[#E5E7EB] bg-white p-1.5 shadow-xl">
                    {SORT_OPTIONS.map((opt) => (
                      <button key={opt.key} type="button"
                        onClick={() => { setSortBy(opt.key); setShowSortMenu(false) }}
                        className={`w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors ${sortBy === opt.key ? 'bg-blue-50 text-blue-700' : 'text-[#374151] hover:bg-[#F9FAFB]'}`}>
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

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA] text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-3 py-3">Ref No.</th>
                  <th className="px-3 py-3 min-w-[200px]">Payee / Account</th>
                  <th className="px-3 py-3">Memo</th>
                  <th className="px-3 py-3 text-right">
                    <span className="text-red-500">Payment</span>
                  </th>
                  <th className="px-3 py-3 text-right">
                    <span className="text-emerald-600">Deposit</span>
                  </th>
                  <th className="px-3 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#F3F4F6]">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="py-4 px-4">
                          <div className="h-4 w-full animate-pulse rounded-lg bg-[#F3F4F6]" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : error ? (
                  <tr><td colSpan={7} className="py-12 text-center">
                    <p className="text-[14px] font-semibold text-red-600">{error}</p>
                  </td></tr>
                ) : filteredAndSorted.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <HiOutlineCreditCard className="h-10 w-10 text-[#D1D5DB]" />
                      <p className="text-[14px] font-semibold text-[#6B7280]">
                        {hasActiveFilters ? 'No transactions match your filters' : 'No transactions found'}
                      </p>
                      {hasActiveFilters && (
                        <button type="button" onClick={clearFilters} className="mt-1 text-[13px] font-semibold text-blue-600 hover:underline">Clear all filters</button>
                      )}
                    </div>
                  </td></tr>
                ) : (
                  filteredAndSorted.map((row, i) => (
                    <tr
                      key={row.id || i}
                      onClick={() => {
                        if (row.paymentId) {
                          if (row.paymentDocType === 'Bill') {
                            navigate(`/bill/payment/edit/${row.paymentId}`)
                          } else if (row.paymentDocType === 'Invoice') {
                            navigate(`/payment/edit/${row.paymentId}`)
                          }
                        }
                      }}
                      className={`border-b border-[#F3F4F6] transition-colors hover:bg-blue-50/30 ${row.paymentId ? 'cursor-pointer' : ''} ${i % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'}`}
                    >
                      <td className="whitespace-nowrap px-5 py-3.5 align-top font-medium text-[#111827]">
                        {row.date}
                      </td>
                      <td className="px-3 py-3.5 align-top">
                        <div className="font-bold text-blue-700">{row.refNo}</div>
                        <div className="text-[11px] font-medium text-[#9CA3AF]">{row.refType}</div>
                      </td>
                      <td className="px-3 py-3.5 align-top">
                        <div className="font-medium text-[#111827]">{row.payee}</div>
                        {row.payeeSub ? (
                          <div className="mt-0.5 text-[12px] text-[#9CA3AF]">{row.payeeSub}</div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3.5 align-top text-[#9CA3AF]">{row.memo || '—'}</td>
                      <td className="px-3 py-3.5 align-top text-right tabular-nums">
                        {row.payment != null && row.payment > 0 ? (
                          <span className="font-semibold text-red-600">{formatRm(row.payment)}</span>
                        ) : <span className="text-[#D1D5DB]">—</span>}
                      </td>
                      <td className="px-3 py-3.5 align-top text-right tabular-nums">
                        {row.deposit != null && row.deposit > 0 ? (
                          <span className="font-semibold text-emerald-600">{formatRm(row.deposit)}</span>
                        ) : <span className="text-[#D1D5DB]">—</span>}
                      </td>
                      <td className="px-3 py-3.5 align-top text-right tabular-nums font-bold text-[#111827]">
                        {formatRm(row.balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[#E5E7EB] px-5 py-3 text-[13px]">
            <span className="font-medium text-[#6B7280]">
              Showing {filteredAndSorted.length} of {rows.length} transactions
            </span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
