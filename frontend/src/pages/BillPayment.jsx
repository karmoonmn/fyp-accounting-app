import React from 'react'
import { useNavigate } from 'react-router-dom'
import { HiOutlineChevronDown, HiOutlineXMark } from 'react-icons/hi2'

const DEMO_BILLS = [
  { id: 'b1', no: 'Bill #1-077935', dueDate: '25.11.2025', original: 189.73, open: 189.73 },
  { id: 'b2', no: 'Bill #1-077319', dueDate: '01.12.2025', original: 99.13, open: 99.13 },
  { id: 'b3', no: 'Bill #1-077337', dueDate: '03.12.2025', original: 35.5, open: 35.5 },
  { id: 'b4', no: 'Bill #1-077339', dueDate: '03.12.2025', original: 39.93, open: 39.93 },
  { id: 'b5', no: 'Bill #1-077369', dueDate: '04.11.2025', original: 755.63, open: 755.63 },
  { id: 'b6', no: 'Bill #1-077419', dueDate: '06.11.2025', original: 347.6, open: 347.6 },
]

function formatRm(n) {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2,
  }).format(n)
}

export default function BillPayment() {
  const navigate = useNavigate()
  const [payee, setPayee] = React.useState('TCW EDGING SDN BHD')
  const [email, setEmail] = React.useState('')
  const [sendLater, setSendLater] = React.useState(false)
  const [bankAccount, setBankAccount] = React.useState('Bank')
  const [paymentDate, setPaymentDate] = React.useState('2026-05-04')
  const [refNo, setRefNo] = React.useState('281013')
  const [mailingAddress, setMailingAddress] = React.useState('TCW EDGING SDN BHD')
  const [filter, setFilter] = React.useState('')

  const [selected, setSelected] = React.useState(() => new Set([DEMO_BILLS[0]?.id]))
  const [payments, setPayments] = React.useState(() => ({
    [DEMO_BILLS[0]?.id]: '96.00',
  }))

  const amountPaid = DEMO_BILLS.reduce((sum, b) => {
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
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const checkboxClass =
    'h-4 w-4 rounded border border-[#D1D5DB] bg-white accent-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/30'

  const visibleBills = DEMO_BILLS.filter((b) => {
    const q = filter.trim().toLowerCase()
    if (!q) return true
    return b.no.toLowerCase().includes(q)
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
                {visibleBills.map((b, i) => (
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
                      {b.no}
                    </td>
                    <td className="border-b border-[#F3F4F6] px-4 py-3 text-[#111827]">{b.dueDate}</td>
                    <td className="border-b border-[#F3F4F6] px-4 py-3 text-right tabular-nums text-[#111827]">
                      {formatRm(b.original)}
                    </td>
                    <td className="border-b border-[#F3F4F6] px-4 py-3 text-right tabular-nums text-[#111827]">
                      {formatRm(b.open)}
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
                        placeholder={selected.has(b.id) ? formatRm(b.open) : ''}
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

