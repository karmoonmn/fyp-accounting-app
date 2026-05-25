import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import DashboardLayout from '../components/DashboardLayout'
import {
  HiOutlineChevronDown,
  HiOutlineMagnifyingGlass,
  HiOutlineUserPlus
} from 'react-icons/hi2'

export default function CustomerList() {
  const navigate = useNavigate()
  const { me, meError, getFreshToken } = useAuth()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchText, setSearchText] = useState('')
  const [selected, setSelected] = useState(() => new Set())

  useEffect(() => {
    if (!me || meError) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const token = await getFreshToken()
        if (!token || cancelled) return
        const data = await api('/customer', { token })
        if (!cancelled) {
          setCustomers(data || [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not fetch customers')
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
    if (!window.confirm('Are you sure you want to delete this customer?')) return
    try {
      const token = await getFreshToken()
      if (!token) return
      await api(`/customer/${id}`, { method: 'DELETE', token })
      setCustomers((prev) => prev.filter((c) => c.id.toString() !== id.toString()))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not delete customer')
    }
  }

  const filteredRows = customers.filter((row) => {
    const q = searchText.trim().toLowerCase()
    if (!q) return true
    return (
      (row.name || '').toLowerCase().includes(q) ||
      (row.email || '').toLowerCase().includes(q) ||
      (row.phoneNum || '').toLowerCase().includes(q)
    )
  })

  function toggleRow(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === filteredRows.length) setSelected(new Set())
    else setSelected(new Set(filteredRows.map((r) => r.id)))
  }

  return (
    <DashboardLayout activeNav="customers">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[#111827] text-[28px] font-bold tracking-tight">Customers</h2>
          <button
            type="button"
            onClick={() => navigate('/customer/create')}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#0F766E] px-5 text-[14px] font-bold text-white shadow-sm hover:bg-[#0F766E]/90"
          >
            <HiOutlineUserPlus className="h-5 w-5" />
            New Customer
          </button>
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
              <div className="relative">
                <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="search"
                  placeholder="Search customers"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="h-10 w-[260px] rounded-xl border border-[#E5E7EB] bg-white pl-9 pr-3 text-[13px] text-[#111827] placeholder-[#9CA3AF] focus:border-[#0F766E] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full min-w-[800px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">
                  <th className="w-10 py-3 pr-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border border-[#D1D5DB] bg-white accent-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/30"
                      checked={selected.size === filteredRows.length && filteredRows.length > 0}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="py-3 pr-4">Name</th>
                  <th className="py-3 pr-4">Email</th>
                  <th className="py-3 pr-4">Phone</th>
                  <th className="py-3 pr-4">Address</th>
                  <th className="py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[13px] font-semibold text-[#64748B]">
                      Loading customers...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[13px] font-semibold text-[#B91C1C]">
                      {error}
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[13px] font-semibold text-[#64748B]">
                      No customers found.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, i) => (
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
                      <td className="py-3 pr-4 align-middle font-semibold text-[#111827]">{row.name || '—'}</td>
                      <td className="py-3 pr-4 align-middle text-[#374151]">{row.email || '—'}</td>
                      <td className="py-3 pr-4 align-middle text-[#374151]">{row.phoneNum || '—'}</td>
                      <td className="py-3 pr-4 align-middle text-[#374151] max-w-[200px] truncate">{row.addr || '—'}</td>
                      <td className="py-3 align-middle">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => navigate(`/customer/edit/${row.id}`)}
                            className="font-semibold text-[#0F766E] hover:underline"
                          >
                            Edit
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
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
