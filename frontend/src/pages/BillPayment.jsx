import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HiOutlineChevronDown, HiOutlineXMark } from 'react-icons/hi2'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

function formatRm(n) {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2,
  }).format(n)
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function BillPayment() {
  const navigate = useNavigate()
  const { me, meError, getFreshToken } = useAuth()
  const [payee, setPayee] = useState('')
  const [email, setEmail] = useState('')
  const [sendLater, setSendLater] = useState(false)
  const [bankAccount, setBankAccount] = useState('Bank')
  const [paymentDate, setPaymentDate] = useState(todayISO())
  const [refNo, setRefNo] = useState('')
  const [mailingAddress, setMailingAddress] = useState('')
  const [filter, setFilter] = useState('')
  
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
        const data = await api('/bill', { token })
        if (!cancelled) {
          const openBills = (data || []).filter((b) => (b.balance ?? b.totalAmt) > 0)
          setBills(openBills)
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

  const amountPaid = bills.reduce((sum, b) => {
    if (!selected.has(b.id)) return sum
    const v = Number.parseFloat(payments[b.id] ?? '') || 0
    return sum + v
  }, 0)

  function close() {
    navigate('/bills')
  }

  function toggleBill(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        setPayments(p => ({ ...p, [id]: '' }))
      } else {
        next.add(id)
        const b = bills.find(x => x.id === id)
        if (b) {
          setPayments(p => ({ ...p, [id]: (b.balance ?? b.totalAmt).toString() }))
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
    for (const id of selected) {
      const amt = Number.parseFloat(payments[id])
      if (amt > 0) {
        paymentItems.push({
          billId: id,
          amount: amt
        })
      }
    }
    
    if (paymentItems.length === 0) {
      setError('Select at least one bill and enter a payment amount > 0.')
      return
    }
    
    setBusy(true)
    try {
      const token = await getFreshToken()
      const payload = {
        refNo: refNo || undefined,
        paymentDate,
        depositTo: bankAccount,
        payments: paymentItems
      }
      await api('/bill/payment', { method: 'POST', token, body: payload })
      navigate('/bills')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit payment')
    } finally {
      setBusy(false)
    }
  }

  const checkboxClass =
    'h-4 w-4 rounded border border-[#D1D5DB] bg-white accent-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/30'

  const visibleBills = bills.filter((b) => {
    const q = filter.trim().toLowerCase()
    if (!q) return true
    return (b.docNumber || '').toLowerCase().includes(q) || (b.supplier?.name || '').toLowerCase().includes(q)
  })

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4">
        <div className="min-w-0">
          <h2 className="truncate text-[18px] font-bold text-[#111827]">Bill Payment #{refNo}</h2>
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
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div className="grid grid-cols-4 gap-4">
            <label className="text-[12px] font-bold text-[#6B7280]">
              Payee
              <input
                value={payee}
                onChange={(e) => setPayee(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#111827] focus:border-[#0F766E] focus:outline-none"
              />
            </label>
            <label className="text-[12px] font-bold text-[#6B7280]">
              Email
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (Separate emails with a comma)"
                className="mt-1 h-10 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#111827] placeholder-[#9CA3AF] focus:border-[#0F766E] focus:outline-none"
              />
              <span className="mt-2 inline-flex items-center gap-2 text-[12px] font-semibold text-[#64748B]">
                <input
                  type="checkbox"
                  checked={sendLater}
                  onChange={(e) => setSendLater(e.target.checked)}
                  className={checkboxClass}
                />
                Send later
              </span>
            </label>
            <label className="text-[12px] font-bold text-[#6B7280]">
              Bank/Credit account
              <div className="relative mt-1">
                <select
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="h-10 w-full appearance-none rounded-xl border border-[#E5E7EB] bg-white px-3 pr-9 text-[13px] font-medium text-[#111827] focus:border-[#0F766E] focus:outline-none"
                >
                  <option>Bank</option>
                  <option>Cash</option>
                  <option>Credit card</option>
                </select>
                <HiOutlineChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
              </div>
            </label>
            <div className="flex items-start justify-end">
              <div className="text-right">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">Amount paid</p>
                <p className="mt-1 text-[28px] font-bold tabular-nums text-[#111827]">{formatRm(amountPaid)}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-4">
            <label className="col-span-1 text-[12px] font-bold text-[#6B7280]">
              Mailing address
              <textarea
                rows={3}
                value={mailingAddress}
                onChange={(e) => setMailingAddress(e.target.value)}
                className="mt-1 w-full resize-none rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] font-medium text-[#111827] focus:border-[#0F766E] focus:outline-none"
              />
            </label>
            <label className="col-span-1 text-[12px] font-bold text-[#6B7280]">
              Payment date
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#111827] focus:border-[#0F766E] focus:outline-none"
              />
            </label>
            <div className="col-span-1" />
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

        <div className="mt-6 rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-[#111827] text-[16px] font-bold">Outstanding Transactions</h3>
            <div className="text-[12px] font-semibold text-[#64748B]">Amount</div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Find Bill No."
                className="h-10 w-[220px] rounded-xl border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#111827] placeholder-[#9CA3AF] focus:border-[#0F766E] focus:outline-none"
              />
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-[#0F766E] bg-white px-4 text-[13px] font-bold text-[#0F766E] hover:bg-[#CCFBF1]"
              >
                Filter &gt;
              </button>
              <span className="text-[13px] font-semibold text-[#64748B]">All</span>
            </div>
            <div className="w-[220px]">
              <input
                readOnly
                value={formatRm(amountPaid)}
                className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-right text-[13px] font-bold text-[#111827]"
              />
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-[#E5E7EB]">
            <table className="w-full min-w-[980px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA] text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">
                  <th className="px-4 py-3 w-10">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Due date</th>
                  <th className="px-4 py-3 text-right">Original amount</th>
                  <th className="px-4 py-3 text-right">Open balance</th>
                  <th className="px-4 py-3 text-right">Payment</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[13px] font-semibold text-[#64748B]">
                      Loading open bills...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[13px] font-semibold text-[#B91C1C]">
                      {error}
                    </td>
                  </tr>
                ) : visibleBills.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[13px] font-semibold text-[#64748B]">
                      No open bills found.
                    </td>
                  </tr>
                ) : (
                  visibleBills.map((b, i) => (
                    <tr key={b.id} className={i % 2 === 1 ? 'bg-[#F9FAFB]/70' : 'bg-white'}>
                      <td className="border-b border-[#F3F4F6] px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(b.id)}
                          onChange={() => toggleBill(b.id)}
                          className={checkboxClass}
                        />
                      </td>
                      <td className="border-b border-[#F3F4F6] px-4 py-3 font-semibold text-[#0F766E]">
                        Bill #{b.docNumber}
                        {b.supplier ? ` (${b.supplier.name})` : ''}
                      </td>
                      <td className="border-b border-[#F3F4F6] px-4 py-3 text-[#111827]">{b.dueDate || '—'}</td>
                      <td className="border-b border-[#F3F4F6] px-4 py-3 text-right tabular-nums text-[#111827]">
                        {formatRm(b.totalAmt || 0)}
                      </td>
                      <td className="border-b border-[#F3F4F6] px-4 py-3 text-right tabular-nums text-[#111827]">
                        {formatRm(b.balance ?? b.totalAmt)}
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
                          placeholder={selected.has(b.id) ? formatRm(b.balance ?? b.totalAmt) : ''}
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
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[#374151] px-5 text-[14px] font-bold text-white hover:bg-[#4B5563]"
            >
              Print
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={busy}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[#0F766E] px-5 text-[14px] font-bold text-white hover:bg-[#0F766E]/90 disabled:opacity-60"
            >
              {busy ? 'Saving...' : 'Save and close'}
              <HiOutlineChevronDown className="ml-2 h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

