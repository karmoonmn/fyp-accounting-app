import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { HiOutlineChevronDown, HiOutlineFunnel, HiOutlineXMark } from 'react-icons/hi2'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

function formatMoney(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n)
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function BillPayment() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const isEdit = !!id
  const { me, meError, getFreshToken } = useAuth()
  const filterRef = useRef(null)

  const [bankAccount, setBankAccount] = useState('Bank')
  const [paymentDate, setPaymentDate] = useState(todayISO())
  const [refNo, setRefNo] = useState(() => {
    return 'PV-' + Math.floor(10000 + Math.random() * 90000)
  })
  const [filter, setFilter] = useState('')
  const [filterAmountMin, setFilterAmountMin] = useState('')
  const [filterAmountMax, setFilterAmountMax] = useState('')
  const [filterDueDateFrom, setFilterDueDateFrom] = useState('')
  const [filterDueDateTo, setFilterDueDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [selected, setSelected] = useState(() => new Set())
  const [payments, setPayments] = useState({})

  useEffect(() => {
    if (!me || meError) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const token = await getFreshToken()
        if (!token || cancelled) return
        const [data, paymentData] = await Promise.all([
          api('/bill', { token }),
          isEdit ? api(`/payment/${id}`, { token }) : Promise.resolve(null),
        ])
        if (!cancelled) {
          if (paymentData) {
            setRefNo(paymentData.docNumber || '')
            setPaymentDate(paymentData.txnDate || todayISO())
            setBankAccount(paymentData.depositTo || 'Bank')

            const sel = new Set()
            const pmap = {}
            if (paymentData.allocations) {
              paymentData.allocations.forEach((a) => {
                if (a.bill) {
                  const idStr = a.bill.id.toString()
                  sel.add(idStr)
                  pmap[idStr] = a.amount.toString()
                }
              })
            }
            setSelected(sel)
            setPayments(pmap)
          }

          const visibleBills = (data || []).filter((b) => {
            const isOutstanding = (b.balance ?? b.totalAmt) > 0
            const isPaidByThis = paymentData?.allocations?.some((a) => a.bill?.id === b.id)
            return isOutstanding || isPaidByThis
          })
          setBills(visibleBills)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not fetch bills')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [me, meError, getFreshToken])

  // Click-outside to close filter dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilters(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Pre-select bill(s) passed via router state
  useEffect(() => {
    const preIds = location.state?.billIds
    const preId = location.state?.billId
    const ids = preIds ? preIds.map(String) : (preId ? [preId.toString()] : [])
    if (ids.length === 0 || bills.length === 0) return
    const newSelected = new Set()
    const newPayments = {}
    ids.forEach(idStr => {
      const b = bills.find(x => x.id.toString() === idStr)
      if (!b) return
      newSelected.add(idStr)
      newPayments[idStr] = ((b.balance ?? b.totalAmt) || 0).toString()
    })
    if (newSelected.size > 0) {
      setSelected(newSelected)
      setPayments(newPayments)
    }
  }, [bills])

  const amountPaid = bills.reduce((sum, b) => {
    const idStr = b.id.toString()
    if (!selected.has(idStr)) return sum
    const v = Number.parseFloat(payments[idStr] ?? '') || 0
    return sum + v
  }, 0)

  function close() {
    navigate(isEdit ? '/payments' : '/bills')
  }

  function toggleBill(id) {
    const idStr = id.toString()
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(idStr)) {
        next.delete(idStr)
        setPayments((p) => {
          const nextP = { ...p }
          delete nextP[idStr]
          return nextP
        })
      } else {
        next.add(idStr)
        const b = bills.find((x) => x.id.toString() === idStr)
        if (b) {
          setPayments((p) => ({ ...p, [idStr]: (b.balance ?? b.totalAmt).toString() }))
        }
      }
      return next
    })
  }

  async function handleSubmit() {
    setError('')
    if (!me || meError) {
      setError('Sign in to record payment.')
      return
    }

    const paymentItems = []
    for (const idStr of selected) {
      const amt = Number.parseFloat(payments[idStr])
      if (amt > 0) {
        paymentItems.push({ billId: Number.parseInt(idStr, 10), amount: amt })
      }
    }

    if (paymentItems.length === 0) {
      setError('Select at least one bill and enter a payment amount > 0.')
      return
    }

    setBusy(true)
    try {
      const token = await getFreshToken()
      const body = {
        refNo: refNo.trim(),
        paymentDate,
        depositTo: bankAccount,
        payments: paymentItems,
      }

      const url = isEdit ? `/payment/${id}` : '/bill/payment'
      const method = isEdit ? 'PUT' : 'POST'

      await api(url, { method, token, body })
      navigate(isEdit ? '/payments' : '/bills')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit payment')
    } finally {
      setBusy(false)
    }
  }

  const checkboxClass =
    'h-4 w-4 rounded border border-[#D1D5DB] bg-white accent-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/30'

  const visible = bills
    .map((b) => ({
      id: b.id.toString(),
      no: `Bill #${b.docNumber}`,
      supplierName: b.supplier?.name || '',
      dueDate: b.dueDate || '—',
      original: Number.parseFloat(b.totalAmt) || 0,
      open: Number.parseFloat(b.balance ?? b.totalAmt) || 0,
    }))
    .filter((b) => {
      const q = filter.trim().toLowerCase()
      if (q && !b.no.toLowerCase().includes(q) && !b.supplierName.toLowerCase().includes(q)) return false
      if (filterAmountMin.trim()) {
        const min = parseFloat(filterAmountMin)
        if (!isNaN(min) && b.open < min) return false
      }
      if (filterAmountMax.trim()) {
        const max = parseFloat(filterAmountMax)
        if (!isNaN(max) && b.open > max) return false
      }
      if (filterDueDateFrom && b.dueDate !== '—' && b.dueDate < filterDueDateFrom) return false
      if (filterDueDateTo && b.dueDate !== '—' && b.dueDate > filterDueDateTo) return false
      return true
    })

  const hasRangeFilters = filterAmountMin || filterAmountMax || filterDueDateFrom || filterDueDateTo
  const activeRangeCount = [filterAmountMin, filterAmountMax, filterDueDateFrom, filterDueDateTo].filter(Boolean).length

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4">
        <div className="min-w-0">
          <h2 className="truncate text-[18px] font-bold text-[#111827]">
            {isEdit ? 'Edit Bill Payment' : 'Bill Payment'} {refNo && `#${refNo}`}
          </h2>
        </div>
        <button
          type="button"
          onClick={close}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#64748B] hover:bg-white hover:text-[#111827]"
          aria-label="Close"
        >
          <HiOutlineXMark className="h-5 w-5" />
        </button>
      </div>

      <div className="px-6 py-6">
        {error && (
          <div className="mb-6 rounded-xl border border-[#FEE2E2] bg-[#FEF2F2] px-4 py-3 text-[13px] font-semibold text-[#B91C1C]">
            {error}
          </div>
        )}

        {/* Top fields */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div className="grid grid-cols-4 gap-4">
            <label className="col-span-1 text-[12px] font-bold text-[#6B7280]">
              Bank/Credit account
              <div className="relative mt-1">
                <select
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="h-10 w-full appearance-none rounded-xl border border-[#E5E7EB] bg-white px-3 pr-9 text-[13px] font-medium text-[#111827] focus:border-[#0F766E] focus:outline-none"
                >
                  <option>Bank</option>
                  {/* <option>Cash</option>
                  <option>Credit card</option> */}
                </select>
                <HiOutlineChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
              </div>
            </label>
            <div className="col-span-2" />
            <div className="flex items-start justify-end">
              <div className="text-right">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">Amount paid</p>
                <p className="mt-1 text-[28px] font-bold tabular-nums text-[#111827]">{formatMoney(amountPaid)}</p>
              </div>
            </div>

            <label className="col-span-1 text-[12px] font-bold text-[#6B7280]">
              Payment date
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#111827] focus:border-[#0F766E] focus:outline-none"
              />
            </label>
            <div className="col-span-2" />
            <label className="col-span-1 text-[12px] font-bold text-[#6B7280]">
              Ref no.
              <input
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#111827] focus:border-[#0F766E] focus:outline-none"
              />
            </label>
          </div>
        </div>

        {/* Outstanding Transactions */}
        <div className="mt-6 rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-[16px] font-bold text-[#111827]">Outstanding Transactions</h3>
            <div className="text-[12px] font-semibold text-[#64748B]">Amount</div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Text search */}
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Find Bill No. / Supplier"
                className="h-10 w-[220px] rounded-xl border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#111827] placeholder-[#9CA3AF] focus:border-[#0F766E] focus:outline-none"
              />

              {/* Filters dropdown */}
              <div className="relative" ref={filterRef}>
                <button
                  type="button"
                  onClick={() => setShowFilters((v) => !v)}
                  className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-[13px] font-semibold transition-colors ${
                    showFilters || hasRangeFilters
                      ? 'border-[#0F766E] bg-[#F0FDFA] text-[#0F766E]'
                      : 'border-[#E5E7EB] bg-white text-[#374151] hover:border-[#0F766E] hover:text-[#0F766E]'
                  }`}
                >
                  <HiOutlineFunnel className="h-4 w-4" />
                  Filters
                  {hasRangeFilters && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0F766E] text-[10px] font-bold text-white">
                      {activeRangeCount}
                    </span>
                  )}
                  <HiOutlineChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>

                {showFilters && (
                  <div className="absolute left-0 top-full z-20 mt-2 w-[520px] rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-lg">
                    <div className="space-y-4">
                      <div>
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">
                          Open Balance Range
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={filterAmountMin}
                            onChange={(e) => setFilterAmountMin(e.target.value)}
                            placeholder="Min"
                            className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#111827] placeholder-[#9CA3AF] focus:border-[#0F766E] focus:outline-none"
                          />
                          <span className="shrink-0 text-[13px] font-semibold text-[#9CA3AF]">–</span>
                          <input
                            type="number"
                            value={filterAmountMax}
                            onChange={(e) => setFilterAmountMax(e.target.value)}
                            placeholder="Max"
                            className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#111827] placeholder-[#9CA3AF] focus:border-[#0F766E] focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">
                          Due Date Range
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={filterDueDateFrom}
                            onChange={(e) => setFilterDueDateFrom(e.target.value)}
                            className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#111827] focus:border-[#0F766E] focus:outline-none"
                          />
                          <span className="shrink-0 text-[13px] font-semibold text-[#9CA3AF]">–</span>
                          <input
                            type="date"
                            value={filterDueDateTo}
                            onChange={(e) => setFilterDueDateTo(e.target.value)}
                            className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#111827] focus:border-[#0F766E] focus:outline-none"
                          />
                        </div>
                      </div>
                      {hasRangeFilters && (
                        <button
                          type="button"
                          onClick={() => {
                            setFilterAmountMin('')
                            setFilterAmountMax('')
                            setFilterDueDateFrom('')
                            setFilterDueDateTo('')
                          }}
                          className="text-[12px] font-bold text-[#B91C1C] hover:underline"
                        >
                          Clear range filters
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Clear all */}
              {(filter || hasRangeFilters) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilter('')
                    setFilterAmountMin('')
                    setFilterAmountMax('')
                    setFilterDueDateFrom('')
                    setFilterDueDateTo('')
                  }}
                  className="text-xs font-bold text-[#B91C1C] hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="w-[240px]">
              <input
                readOnly
                value={formatMoney(amountPaid)}
                className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-right text-[13px] font-bold text-[#111827]"
              />
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-[#E5E7EB]">
            <table className="w-full min-w-[980px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA] text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">
                  <th className="w-10 px-4 py-3">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Due date</th>
                  <th className="px-4 py-3 text-right">Original amount</th>
                  <th className="px-4 py-3 text-right">Open balance</th>
                  <th className="px-4 py-3 text-right">Payment</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[13px] font-semibold text-[#64748B]">
                      Loading open bills...
                    </td>
                  </tr>
                ) : visible.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[13px] font-semibold text-[#64748B]">
                      No open bills found.
                    </td>
                  </tr>
                ) : (
                  visible.map((b, i) => (
                    <tr key={b.id} className={i % 2 === 1 ? 'bg-[#F9FAFB]/70' : 'bg-white'}>
                      <td className="border-b border-[#F3F4F6] px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(b.id)}
                          onChange={() => toggleBill(b.id)}
                          className={checkboxClass}
                        />
                      </td>
                      <td className="border-b border-[#F3F4F6] px-4 py-3 font-semibold text-[#0F766E]">{b.no}</td>
                      <td className="border-b border-[#F3F4F6] px-4 py-3 text-[#374151]">
                        {b.supplierName || '—'}
                      </td>
                      <td className="border-b border-[#F3F4F6] px-4 py-3 text-[#111827]">{b.dueDate}</td>
                      <td className="border-b border-[#F3F4F6] px-4 py-3 text-right tabular-nums text-[#111827]">
                        {formatMoney(b.original)}
                      </td>
                      <td className="border-b border-[#F3F4F6] px-4 py-3 text-right tabular-nums text-[#111827]">
                        {formatMoney(b.open)}
                      </td>
                      <td className="border-b border-[#F3F4F6] px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          disabled={!selected.has(b.id)}
                          value={payments[b.id] ?? ''}
                          onChange={(e) => setPayments((p) => ({ ...p, [b.id]: e.target.value }))}
                          className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-right text-[13px] font-bold text-[#111827] focus:border-[#0F766E] focus:outline-none disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF]"
                          placeholder={selected.has(b.id) ? formatMoney(b.open) : ''}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#E5E7EB] bg-[#111827]">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-3">
          <button
            type="button"
            onClick={close}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-5 text-[14px] font-bold text-[#0F766E] hover:bg-[#F3F4F6]"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={busy}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[#0F766E] px-5 text-[14px] font-bold text-white hover:bg-[#0F766E]/90 disabled:opacity-60"
            >
              {busy ? 'Saving...' : isEdit ? 'Update payment' : 'Save and close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}