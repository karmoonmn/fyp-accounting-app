import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { HiOutlineChevronDown, HiOutlineXMark } from 'react-icons/hi2'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

function formatMoney(n) {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 2,
  }).format(n)
}

export default function InvoicePayment() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const { me, meError, getFreshToken } = useAuth()
  
  const [customer, setCustomer] = useState('')
  const [email, setEmail] = useState('')
  const [sendLater, setSendLater] = useState(false)
  const [depositTo, setDepositTo] = useState('Bank')
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [refNo, setRefNo] = useState(() => {
    return 'RCV-' + Math.floor(10000 + Math.random() * 90000)
  })
  const [filter, setFilter] = useState('')
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [selected, setSelected] = useState(() => new Set())
  const [payments, setPayments] = useState(() => ({}))

  useEffect(() => {
    if (!me || meError) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const token = await getFreshToken()
        if (!token || cancelled) return
        const [data, paymentData] = await Promise.all([
          api('/invoice', { token }),
          isEdit ? api(`/payment/${id}`, { token }) : Promise.resolve(null)
        ])
        
        if (!cancelled) {
          if (paymentData) {
            setRefNo(paymentData.docNumber || '')
            setPaymentDate(paymentData.txnDate || new Date().toISOString().slice(0, 10))
            setDepositTo(paymentData.depositTo || 'Bank')
            
            const sel = new Set()
            const pmap = {}
            if (paymentData.allocations) {
              paymentData.allocations.forEach(a => {
                if (a.invoice) {
                  const idStr = a.invoice.id.toString()
                  sel.add(idStr)
                  pmap[idStr] = a.amount.toString()
                }
              })
            }
            setSelected(sel)
            setPayments(pmap)
          }

          const visibleInvoices = (data || []).filter((inv) => {
            const isOutstanding = (Number.parseFloat(inv.balance) || 0) > 0
            const isPaidByThis = paymentData?.allocations?.some(a => a.invoice?.id === inv.id)
            return isOutstanding || isPaidByThis
          })
          setInvoices(visibleInvoices)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not fetch outstanding invoices')
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

  const amountReceived = invoices.reduce((sum, inv) => {
    const idStr = inv.id.toString()
    if (!selected.has(idStr)) return sum
    const v = Number.parseFloat(payments[idStr] ?? '') || 0
    return sum + v
  }, 0)

  function close() {
    navigate(-1)
  }

  function toggle(id) {
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
        const inv = invoices.find((i) => i.id.toString() === idStr)
        if (inv) {
          setPayments((p) => ({ ...p, [idStr]: (Number.parseFloat(inv.balance) || 0).toString() }))
        }
      }
      return next
    })
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault()
    if (selected.size === 0) {
      setError('Please select at least one invoice to receive payment.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const token = await getFreshToken()
      if (!token) throw new Error('Not signed in')

      const paymentItems = Array.from(selected).map((idStr) => {
        const amt = Number.parseFloat(payments[idStr])
        if (!Number.isFinite(amt) || amt <= 0) {
          throw new Error('Please enter a valid payment amount for all selected invoices.')
        }
        return {
          invoiceId: Number.parseInt(idStr, 10),
          amount: amt,
        }
      })

      const body = {
        refNo: refNo.trim(),
        paymentDate,
        depositTo,
        payments: paymentItems,
      }

      const url = isEdit ? `/payment/${id}` : '/invoice/payment'
      const method = isEdit ? 'PUT' : 'POST'

      await api(url, {
        method,
        token,
        body,
      })

      navigate(-1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save payment')
    } finally {
      setBusy(false)
    }
  }

  const checkboxClass =
    'h-4 w-4 rounded border border-[#D1D5DB] bg-white accent-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/30'

  const visible = invoices.map(inv => ({
    id: inv.id.toString(),
    no: `Invoice #${inv.docNumber}`,
    dueDate: inv.dueDate || '—',
    original: Number.parseFloat(inv.totalAmt) || 0,
    open: Number.parseFloat(inv.balance) || 0,
    customerName: inv.customer?.name || ''
  })).filter((inv) => {
    const q = filter.trim().toLowerCase()
    if (!q) return true
    return inv.no.toLowerCase().includes(q) || inv.customerName.toLowerCase().includes(q)
  })

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4">
        <div className="min-w-0">
          <h2 className="truncate text-[18px] font-bold text-[#111827]">
            {isEdit ? 'Edit Payment' : 'Receive Payment'} #{refNo}
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
        {error ? (
          <div className="mb-6 rounded-xl border border-[#FEE2E2] bg-[#FEF2F2] px-4 py-3 text-[13px] font-semibold text-[#B91C1C]">
            {error}
          </div>
        ) : null}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div className="grid grid-cols-4 gap-4">
            <label className="text-[12px] font-bold text-[#6B7280]">
              Customer
              <input
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
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
              Deposit to
              <div className="relative mt-1">
                <select
                  value={depositTo}
                  onChange={(e) => setDepositTo(e.target.value)}
                  className="h-10 w-full appearance-none rounded-xl border border-[#E5E7EB] bg-white px-3 pr-9 text-[13px] font-medium text-[#111827] focus:border-[#0F766E] focus:outline-none"
                >
                  <option>Bank</option>
                  <option>Cash</option>
                  <option>Undeposited funds</option>
                </select>
                <HiOutlineChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
              </div>
            </label>
            <div className="flex items-start justify-end">
              <div className="text-right">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">Amount received</p>
                <p className="mt-1 text-[28px] font-bold tabular-nums text-[#111827]">
                  {formatMoney(amountReceived)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-4">
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
                placeholder="Find Invoice No."
                className="h-10 w-[240px] rounded-xl border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#111827] placeholder-[#9CA3AF] focus:border-[#0F766E] focus:outline-none"
              />
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-[#0F766E] bg-white px-4 text-[13px] font-bold text-[#0F766E] hover:bg-[#CCFBF1]"
              >
                Filter &gt;
              </button>
              <span className="text-[13px] font-semibold text-[#64748B]">All</span>
            </div>
            <div className="w-[240px]">
              <input
                readOnly
                value={formatMoney(amountReceived)}
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
                      Loading outstanding invoices...
                    </td>
                  </tr>
                ) : visible.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[13px] font-semibold text-[#64748B]">
                      No outstanding invoices found.
                    </td>
                  </tr>
                ) : (
                  visible.map((inv, i) => (
                    <tr key={inv.id} className={i % 2 === 1 ? 'bg-[#F9FAFB]/70' : 'bg-white'}>
                      <td className="border-b border-[#F3F4F6] px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(inv.id)}
                          onChange={() => toggle(inv.id)}
                          className={checkboxClass}
                        />
                      </td>
                      <td className="border-b border-[#F3F4F6] px-4 py-3 font-semibold text-[#0F766E]">
                        {inv.no}
                      </td>
                      <td className="border-b border-[#F3F4F6] px-4 py-3 text-[#111827]">{inv.dueDate}</td>
                      <td className="border-b border-[#F3F4F6] px-4 py-3 text-right tabular-nums text-[#111827]">
                        {formatMoney(inv.original)}
                      </td>
                      <td className="border-b border-[#F3F4F6] px-4 py-3 text-right tabular-nums text-[#111827]">
                        {formatMoney(inv.open)}
                      </td>
                      <td className="border-b border-[#F3F4F6] px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          disabled={!selected.has(inv.id)}
                          value={payments[inv.id] ?? ''}
                          onChange={(e) => setPayments((p) => ({ ...p, [inv.id]: e.target.value }))}
                          className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-right text-[13px] font-bold text-[#111827] focus:border-[#0F766E] focus:outline-none disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF]"
                          placeholder={selected.has(inv.id) ? formatMoney(inv.open) : ''}
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
              {busy ? 'Saving...' : (isEdit ? 'Update payment' : 'Save and close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

