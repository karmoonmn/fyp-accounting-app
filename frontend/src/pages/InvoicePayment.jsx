import React from 'react'
import { useNavigate } from 'react-router-dom'
import { HiOutlineChevronDown, HiOutlineXMark } from 'react-icons/hi2'

const DEMO_INVOICES = [
  { id: 'i1', no: 'Invoice #260403', dueDate: '03.06.2026', original: 5139.0, open: 5139.0 },
  { id: 'i2', no: 'Invoice #260401', dueDate: '08.06.2026', original: 9189.5, open: 9189.5 },
  { id: 'i3', no: 'Invoice #260304', dueDate: '01.06.2026', original: 1440.0, open: 1440.0 },
  { id: 'i4', no: 'Invoice #260303', dueDate: '28.05.2026', original: 12657.5, open: 12657.5 },
]

function formatMoney(n) {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 2,
  }).format(n)
}

export default function InvoicePayment() {
  const navigate = useNavigate()
  const [customer, setCustomer] = React.useState('Key Concept Pte Ltd')
  const [email, setEmail] = React.useState('')
  const [sendLater, setSendLater] = React.useState(false)
  const [depositTo, setDepositTo] = React.useState('Bank')
  const [paymentDate, setPaymentDate] = React.useState('2026-05-04')
  const [refNo, setRefNo] = React.useState('RCV-10013')
  const [filter, setFilter] = React.useState('')

  const [selected, setSelected] = React.useState(() => new Set([DEMO_INVOICES[0]?.id]))
  const [payments, setPayments] = React.useState(() => ({
    [DEMO_INVOICES[0]?.id]: '120.00',
  }))

  const amountReceived = DEMO_INVOICES.reduce((sum, inv) => {
    if (!selected.has(inv.id)) return sum
    const v = Number.parseFloat(payments[inv.id] ?? '') || 0
    return sum + v
  }, 0)

  function close() {
    navigate('/invoices')
  }

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const checkboxClass =
    'h-4 w-4 rounded border border-[#D1D5DB] bg-white accent-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/30'

  const visible = DEMO_INVOICES.filter((inv) => {
    const q = filter.trim().toLowerCase()
    if (!q) return true
    return inv.no.toLowerCase().includes(q)
  })

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4">
        <div className="min-w-0">
          <h2 className="truncate text-[18px] font-bold text-[#111827]">Receive payment #{refNo}</h2>
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
                {visible.map((inv, i) => (
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
                ))}
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
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[#0F766E] px-5 text-[14px] font-bold text-white hover:bg-[#0F766E]/90"
              title="UI preview"
            >
              Save and close
              <HiOutlineChevronDown className="ml-2 h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

