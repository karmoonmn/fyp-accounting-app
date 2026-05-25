import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  HiOutlineArrowUpTray,
  HiOutlineArrowsUpDown,
  HiOutlineCheckCircle,
  HiOutlineChevronDown,
  HiOutlineExclamationCircle,
  HiOutlineMagnifyingGlass,
  HiOutlinePrinter,
  HiOutlineCog6Tooth,
} from 'react-icons/hi2'
import DashboardLayout from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

const TABS = [
  'Overview',
  'All bills',
  'Purchase orders',
  'Vendors',
  'Products & services',
]

function formatMoney(n) {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 2,
  }).format(n)
}

function StatusCell({ status }) {
  if (status.kind === 'overdue') {
    return (
      <div className="flex items-center gap-2 text-[#111827] text-[13px]">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FEF3C7] text-[#D97706]">
          <HiOutlineExclamationCircle className="h-3.5 w-3.5" />
        </span>
        <span className="font-medium text-[#B45309]">{status.label}</span>
      </div>
    )
  }
  if (status.kind === 'closed') {
    return (
      <div className="flex items-center gap-2 text-[#111827] text-[13px]">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#CCFBF1] text-[#0F766E]">
          <HiOutlineCheckCircle className="h-3.5 w-3.5" />
        </span>
        <span className="font-medium text-[#0F766E]">{status.label}</span>
      </div>
    )
  }
  if (status.kind === 'partial') {
    return (
      <div className="flex items-center gap-2 text-[#111827] text-[13px]">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FFEDD5] text-[#EA580C]">
          <HiOutlineExclamationCircle className="h-3.5 w-3.5" />
        </span>
        <span className="font-medium text-[#C2410C]">{status.label}</span>
      </div>
    )
  }
  if (status.kind === 'open') {
    return <span className="text-[13px] font-medium text-[#64748B]">{status.label}</span>
  }
  return <span className="text-[13px] font-medium text-[#64748B]">{status.label}</span>
}

function SelectShell({ label, value }) {
  return (
    <button
      type="button"
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 text-left text-[13px] font-medium text-[#111827] hover:border-[#0F766E]/40"
    >
      <span className="text-[#6B7280]">{label}</span>
      <span className="font-semibold">{value}</span>
      <HiOutlineChevronDown className="ml-1 h-4 w-4 shrink-0 text-[#6B7280]" />
    </button>
  )
}

export default function BillsList() {
  const navigate = useNavigate()
  const { me, meError, getFreshToken } = useAuth()
  const [bills, setBills] = React.useState([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [selected, setSelected] = React.useState(() => new Set())

  React.useEffect(() => {
    if (!me || meError) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const token = await getFreshToken()
        if (!token || cancelled) return
        const data = await api('/bill', { token })
        if (!cancelled) {
          setBills(data || [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not fetch bills')
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

  const totalAmount = bills.reduce((s, r) => s + (r.totalAmt || 0), 0)
  const pageStart = bills.length > 0 ? 1 : 0
  const pageEnd = bills.length
  const totalCount = bills.length

  function toggleRow(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === bills.length) setSelected(new Set())
    else setSelected(new Set(bills.map((r) => r.id)))
  }

  function getStatusInfo(status) {
    if (status === 'PAID') return { kind: 'closed', label: 'Paid' }
    if (status === 'PARTIALLY_PAID') return { kind: 'partial', label: 'Partially paid' }
    return { kind: 'open', label: 'Open' }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this bill?')) return
    try {
      const token = await getFreshToken()
      if (!token) return
      await api(`/bill/${id}`, { method: 'DELETE', token })
      setBills((prev) => prev.filter((b) => b.id.toString() !== id.toString()))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not delete bill')
    }
  }

  return (
    <DashboardLayout activeNav="bills">
      <div className="space-y-6">
        <div>
          <h2 className="text-[#111827] text-[28px] font-bold tracking-tight">Bills</h2>
          {/*<div className="mt-4 flex flex-wrap gap-8 border-b border-[#E5E7EB]">*/}
          {/*  {TABS.map((tab) => (*/}
          {/*    <button*/}
          {/*      key={tab}*/}
          {/*      type="button"*/}
          {/*      onClick={() => setActiveTab(tab)}*/}
          {/*      className={`relative pb-3 text-[15px] font-semibold transition-colors ${*/}
          {/*        activeTab === tab*/}
          {/*          ? 'text-[#0F766E]'*/}
          {/*          : 'text-[#64748B] hover:text-[#111827]'*/}
          {/*      }`}*/}
          {/*    >*/}
          {/*      {tab}*/}
          {/*      {activeTab === tab ? (*/}
          {/*        <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#0F766E]" />*/}
          {/*      ) : null}*/}
          {/*    </button>*/}
          {/*  ))}*/}
          {/*</div>*/}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 text-[13px] font-semibold text-[#111827] hover:bg-[#F3F4F6]"
              >
                Batch actions
                <HiOutlineChevronDown className="h-4 w-4 text-[#6B7280]" />
              </button>
              <SelectShell label="Type" value="All transactions" />
              <SelectShell label="Date" value="Last 3 months" />
              <div className="relative">
                <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="search"
                  placeholder="Vendor"
                  className="h-10 w-[220px] rounded-xl border border-[#E5E7EB] bg-white pl-9 pr-3 text-[13px] text-[#111827] placeholder-[#9CA3AF] focus:border-[#0F766E] focus:outline-none"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap items-center gap-4 text-[13px] font-semibold text-[#0F766E]">
                <button type="button" className="hover:underline">
                  All statuses
                </button>
                <button type="button" className="hover:underline">
                  Payment method
                </button>
                <button type="button" className="hover:underline">
                  Attachments
                </button>
              </div>
              <button
                type="button"
                onClick={() => navigate('/bill/new')}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#0F766E] px-5 text-[14px] font-bold text-white shadow-sm hover:bg-[#0F766E]/90"
              >
                New transaction
                <HiOutlineChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-2 border-b border-[#E5E7EB] pb-2">
            <button
              type="button"
              className="rounded-lg p-2 text-[#64748B] hover:bg-[#F9FAFB] hover:text-[#111827]"
              title="Print"
            >
              <HiOutlinePrinter className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="rounded-lg p-2 text-[#64748B] hover:bg-[#F9FAFB] hover:text-[#111827]"
              title="Export"
            >
              <HiOutlineArrowUpTray className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="rounded-lg p-2 text-[#64748B] hover:bg-[#F9FAFB] hover:text-[#111827]"
              title="Settings"
            >
              <HiOutlineCog6Tooth className="h-5 w-5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="mt-2 w-full min-w-[960px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">
                  <th className="w-10 py-3 pr-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border border-[#D1D5DB] bg-white accent-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/30"
                      checked={selected.size === bills.length && bills.length > 0}
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
                  <th className="py-3 pr-4">No.</th>
                  <th className="py-3 pr-4">Vendor</th>
                  <th className="py-3 pr-4">Memo</th>
                  <th className="py-3 pr-4 text-right">Amount</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-[13px] font-semibold text-[#64748B]">
                      Loading bills...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-[13px] font-semibold text-[#B91C1C]">
                      {error}
                    </td>
                  </tr>
                ) : bills.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-[13px] font-semibold text-[#64748B]">
                      No bills found.
                    </td>
                  </tr>
                ) : (
                  bills.map((row, i) => (
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
                      <td className="py-3 pr-4 align-middle font-medium text-[#111827]">{row.txnDate}</td>
                      <td className="py-3 pr-4 align-middle text-[#374151]">Bill</td>
                      <td className="py-3 pr-4 align-middle font-semibold text-[#0F766E]">{row.docNumber}</td>
                      <td className="py-3 pr-4 align-middle text-[#111827]">{row.supplier?.name || '—'}</td>
                      <td className="py-3 pr-4 align-middle text-[#9CA3AF]">{row.memo || '—'}</td>
                      <td className="py-3 pr-4 align-middle text-right font-semibold tabular-nums text-[#111827]">
                        {formatMoney(row.totalAmt || 0)}
                      </td>
                      <td className="py-3 pr-4 align-middle">
                        <StatusCell status={getStatusInfo(row.status)} />
                      </td>
                      <td className="py-3 align-middle">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <button 
                            type="button" 
                            onClick={() => navigate(`/bill/edit/${row.id}`)}
                            className="font-semibold text-[#0F766E] hover:underline"
                          >
                            View/Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate('/bill/payment')}
                            className="inline-flex items-center gap-0.5 font-semibold text-[#0F766E] hover:underline"
                          >
                            Make payment
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(row.id)}
                            className="font-semibold text-[#B91C1C] hover:underline ml-2"
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
                  <td colSpan={2} className="py-3" />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex items-center justify-end gap-4 border-t border-[#E5E7EB] px-2 py-3 text-[13px] font-semibold text-[#0F766E]">
            <button type="button" className="hover:underline disabled:opacity-40" disabled>
              First
            </button>
            <button type="button" className="hover:underline disabled:opacity-40" disabled>
              Previous
            </button>
            <span className="text-[#64748B]">
              {pageStart}-{pageEnd} of {totalCount}
            </span>
            <button type="button" className="hover:underline disabled:opacity-40" disabled>
              Next
            </button>
            <button type="button" className="hover:underline disabled:opacity-40" disabled>
              Last
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
