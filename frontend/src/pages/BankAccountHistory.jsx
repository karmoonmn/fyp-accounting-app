import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  HiOutlineArrowLeft,
  HiOutlineChevronDown,
  HiOutlinePlus,
} from 'react-icons/hi2'
import DashboardLayout from '../components/DashboardLayout'

/** Demo ledger — replace with API when available */
const DEMO_ROWS = [
  {
    id: '1',
    date: '02.05.2022',
    refNo: '27',
    refType: 'Journal',
    payee: 'Opening balance transfer',
    payeeSub: '',
    memo: '',
    foreign: '',
    payment: null,
    deposit: 10000.0,
    balance: 10000.0,
    reconciled: true,
  },
  {
    id: '2',
    date: '05.05.2022',
    refNo: '104',
    refType: 'Expense',
    payee: 'GOH KIM HOOI',
    payeeSub: 'Rental of workplace - COS',
    memo: '',
    foreign: '',
    payment: 7500.0,
    deposit: null,
    balance: 2500.0,
    reconciled: true,
  },
  {
    id: '3',
    date: '12.05.2022',
    refNo: '88',
    refType: 'Bill payment',
    payee: 'Utilities Malaysia Sdn Bhd',
    payeeSub: 'Electricity — HQ',
    memo: '',
    foreign: '',
    payment: 420.5,
    deposit: null,
    balance: 2079.5,
    reconciled: true,
  },
  {
    id: '4',
    date: '18.05.2022',
    refNo: '201',
    refType: 'Journal',
    payee: 'Interest income',
    payeeSub: '',
    memo: '',
    foreign: '',
    payment: null,
    deposit: 127.0,
    balance: 2206.5,
    reconciled: true,
  },
  {
    id: '5',
    date: '22.05.2022',
    refNo: '45',
    refType: 'Expense',
    payee: 'Office supplies — batch',
    payeeSub: 'Stationery',
    memo: '',
    foreign: '',
    payment: 7.5,
    deposit: null,
    balance: 2199.0,
    reconciled: true,
  },
]

function formatRm(n) {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2,
  }).format(n)
}

function ReconciledBalance({ value, reconciled }) {
  return (
    <div className="flex items-center justify-end gap-2 tabular-nums">
      {/*{reconciled ? (*/}
      {/*  <span*/}
      {/*    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0F766E] text-[10px] font-bold text-white"*/}
      {/*    title="Reconciled"*/}
      {/*  >*/}
      {/*    R*/}
      {/*  </span>*/}
      {/*) : (*/}
      {/*  <span className="h-5 w-5 shrink-0" aria-hidden />*/}
      {/*)}*/}
      <span className="font-semibold text-[#111827]">{formatRm(value)}</span>
    </div>
  )
}

export default function BankAccountHistory() {
  const navigate = useNavigate()
  const endingBalance = DEMO_ROWS[DEMO_ROWS.length - 1]?.balance ?? 0

  return (
    <DashboardLayout activeNav="bank">
      <div className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-3">
            {/*<button*/}
            {/*  type="button"*/}
            {/*  onClick={() => navigate('/')}*/}
            {/*  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#0F766E] hover:underline"*/}
            {/*>*/}
            {/*  <HiOutlineArrowLeft className="h-4 w-4" />*/}
            {/*  Back to chart of accounts*/}
            {/*</button>*/}

            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-[#111827] text-[28px] font-bold tracking-tight">Bank account history</h2>
              {/*<button*/}
              {/*  type="button"*/}
              {/*  className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 text-[13px] font-semibold text-[#111827] shadow-sm hover:border-[#0F766E]/40"*/}
              {/*>*/}
              {/*  Bank*/}
              {/*  <HiOutlineChevronDown className="h-4 w-4 text-[#6B7280]" />*/}
              {/*</button>*/}
            </div>

            <p className="text-[14px] font-medium text-[#64748B]">
              Reconciled through 20.05.2023 · Showing 1–{DEMO_ROWS.length} of 1,090
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
            <div className="flex items-center gap-2">
              {/*<div className="flex -space-x-2">*/}
              {/*  {['JD', 'SC', 'MK'].map((initials) => (*/}
              {/*    <span*/}
              {/*      key={initials}*/}
              {/*      className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#E5E7EB] text-[11px] font-bold text-[#374151]"*/}
              {/*    >*/}
              {/*      {initials}*/}
              {/*    </span>*/}
              {/*  ))}*/}
              {/*</div>*/}
              {/*<button*/}
              {/*  type="button"*/}
              {/*  className="rounded-xl bg-[#0F766E] px-5 py-2.5 text-[14px] font-bold text-white shadow-sm hover:bg-[#0F766E]/90"*/}
              {/*>*/}
              {/*  Reconcile*/}
              {/*</button>*/}
            </div>
            <div className="text-left sm:text-right">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Ending balance
              </p>
              <p className="text-[28px] font-bold tabular-nums text-[#111827]">{formatRm(endingBalance)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-xl bg-[#CCFBF1] px-4 py-2 text-[13px] font-bold text-[#0F766E]"
              >
                All
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-[13px] font-semibold text-[#111827] hover:bg-[#F3F4F6]"
              >
                <HiOutlinePlus className="h-4 w-4 text-[#0F766E]" />
                Add filter
              </button>
              <button
                type="button"
                className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] font-semibold text-[#111827] hover:border-[#0F766E]/30"
              >
                ↓ Sort: Date
              </button>
              <button
                type="button"
                className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] font-semibold text-[#111827] hover:border-[#0F766E]/30"
              >
                Columns
              </button>
              {/*<button*/}
              {/*  type="button"*/}
              {/*  className="inline-flex items-center gap-1 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] font-semibold text-[#111827] hover:border-[#0F766E]/30"*/}
              {/*>*/}
              {/*  <HiOutlinePlus className="h-4 w-4 text-[#0F766E]" />*/}
              {/*  Add cheque*/}
              {/*</button>*/}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[13px] font-semibold text-[#0F766E]">
              <span className="text-[#64748B]">
                Go to{' '}
                <span className="mx-1 inline-flex h-7 min-w-[2rem] items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-2 font-bold text-[#111827]">
                  1
                </span>{' '}
                of 8
              </span>
              <button type="button" className="hover:underline">
                &lt; Prev
              </button>
              <button type="button" className="hover:underline">
                Next &gt;
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-[#E5E7EB]">
            <div className="border-b border-[#E5E7EB] bg-[#FAFAFA] px-3 py-2">
              {/*<button*/}
              {/*  type="button"*/}
              {/*  className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#0F766E] hover:underline"*/}
              {/*>*/}
              {/*  <HiOutlinePlus className="h-4 w-4" />*/}
              {/*  Add transaction*/}
              {/*</button>*/}
            </div>

            <table className="w-full min-w-[1000px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-white text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Ref no.</th>
                  <th className="px-3 py-3 min-w-[200px]">Payee / Account</th>
                  <th className="px-3 py-3">Memo</th>
                  <th className="px-3 py-3">Foreign currency</th>
                  <th className="px-3 py-3 text-right">Payment (MYR)</th>
                  <th className="px-3 py-3 text-right">Deposit (MYR)</th>
                  <th className="px-3 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_ROWS.map((row, i) => (
                  <tr
                    key={row.id}
                    className={`border-b border-[#F3F4F6] ${i % 2 === 1 ? 'bg-[#F9FAFB]/70' : 'bg-white'}`}
                  >
                    <td className="whitespace-nowrap px-3 py-3 align-top font-medium text-[#111827]">
                      {row.date}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="font-bold text-[#111827]">{row.refNo}</div>
                      <div className="text-[12px] font-medium text-[#64748B]">{row.refType}</div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="font-medium text-[#111827]">{row.payee}</div>
                      {row.payeeSub ? (
                        <div className="mt-0.5 text-[12px] text-[#64748B]">{row.payeeSub}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 align-top text-[#9CA3AF]">{row.memo || '—'}</td>
                    <td className="px-3 py-3 align-top text-[#9CA3AF]">{row.foreign || '—'}</td>
                    <td className="px-3 py-3 align-top text-right tabular-nums font-medium text-[#111827]">
                      {row.payment != null ? formatRm(row.payment) : '—'}
                    </td>
                    <td className="px-3 py-3 align-top text-right tabular-nums font-semibold text-[#0F766E]">
                      {row.deposit != null ? formatRm(row.deposit) : '—'}
                    </td>
                    <td className="px-3 py-3 align-top">

                      <ReconciledBalance value={row.balance} reconciled={row.reconciled} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
