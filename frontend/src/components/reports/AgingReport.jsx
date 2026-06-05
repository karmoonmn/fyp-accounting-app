import { useState, useEffect } from 'react'
import { api } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import {
  HiOutlineClock,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2'

const formatMoney = (val) => {
  if (val == null) return '$0.00'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg px-4 py-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-base font-black text-slate-800">{formatMoney(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

export default function AgingReport({ type }) {
  const { idToken: token } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await api(`/api/reports/${type === 'AR' ? 'ar' : 'ap'}-aging`, { token })
      setData(res)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) loadData()
  }, [token, type])

  const colors = ['#10b981', '#f59e0b', '#f97316', '#ef4444', '#b91c1c']
  const bgColors = ['bg-emerald-50', 'bg-amber-50', 'bg-orange-50', 'bg-rose-50', 'bg-red-50']
  const borderColors = ['border-emerald-200', 'border-amber-200', 'border-orange-200', 'border-rose-200', 'border-red-200']
  const textColors = ['text-emerald-700', 'text-amber-700', 'text-orange-700', 'text-rose-700', 'text-red-700']

  const isAR = type === 'AR'

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className={`bg-gradient-to-r ${isAR ? 'from-amber-50 to-orange-50 border-amber-100' : 'from-rose-50 to-pink-50 border-rose-100'} border-b px-7 py-6`}>
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${isAR ? 'from-amber-500 to-orange-600 shadow-amber-200' : 'from-rose-500 to-pink-600 shadow-rose-200'} flex items-center justify-center shadow-md`}>
            <HiOutlineClock className="w-5.5 h-5.5 text-white" />
          </div>
          <div>
            <h2 className="text-[#111827] text-[18px] font-bold">
              {isAR ? 'Accounts Receivable Aging' : 'Accounts Payable Aging'}
            </h2>
            <p className="text-[13px] text-[#64748B] mt-0.5">
              {isAR ? 'Outstanding customer invoices by overdue duration' : 'Outstanding vendor bills by overdue duration'}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-7">
        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
            <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-5 py-4 text-sm font-medium">
            <span className="text-lg">⚠️</span>
            {error}
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {data.buckets.map((bucket, i) => (
                <div
                  key={bucket.name}
                  className={`${bgColors[i] || 'bg-slate-50'} ${borderColors[i] || 'border-slate-200'} border rounded-xl p-4 text-center transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}
                >
                  <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">{bucket.name}</div>
                  <div className="text-lg font-black tabular-nums" style={{ color: colors[i] }}>{formatMoney(bucket.amount)}</div>
                </div>
              ))}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 text-center col-span-2 md:col-span-1 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                <div className="text-[11px] text-blue-600 font-bold uppercase tracking-wider mb-1.5">Total</div>
                <div className="text-xl font-black text-blue-700 tabular-nums">{formatMoney(data.totalAmount)}</div>
              </div>
            </div>

            {/* Validation Warning */}
            {data.totalAmount !== data.glBalance && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm">
                <HiOutlineExclamationTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-amber-800">
                  <strong className="font-bold">Reconciliation Warning:</strong>{' '}
                  The total outstanding ({formatMoney(data.totalAmount)}) does not match the General Ledger balance
                  for {isAR ? 'Accounts Receivable' : 'Accounts Payable'} ({formatMoney(data.glBalance)}).
                  This may indicate a manual journal entry was posted bypassing the {isAR ? 'Invoice' : 'Bill'} system.
                </div>
              </div>
            )}

            {/* Chart */}
            <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/30">
              <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-4">Aging Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.buckets} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(val) => `$${val / 1000}k`}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} />
                    <Bar dataKey="amount" radius={[8, 8, 0, 0]} barSize={48}>
                      {data.buckets.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detail Table */}
            <div>
              <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3">Overdue Details</h3>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wider">Document #</th>
                      <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wider">{isAR ? 'Customer' : 'Supplier'}</th>
                      <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wider">Due Date</th>
                      <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wider">Bucket</th>
                      <th className="px-5 py-3.5 font-semibold text-xs uppercase tracking-wider text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.buckets.flatMap(b => b.items.map(item => ({ ...item, bucketName: b.name }))).length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-5 py-10 text-center text-slate-400 font-medium">
                          <div className="flex flex-col items-center gap-2">
                            <HiOutlineClock className="w-8 h-8 text-slate-300" />
                            No outstanding items
                          </div>
                        </td>
                      </tr>
                    ) : (
                      data.buckets.flatMap(b => b.items.map(item => ({ ...item, bucketName: b.name })))
                        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                        .map((item, i) => (
                          <tr key={item.docNumber} className={`transition-colors duration-200 hover:bg-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                            <td className="px-5 py-3 text-slate-800 font-semibold">{item.docNumber}</td>
                            <td className="px-5 py-3 text-slate-700">{item.name}</td>
                            <td className="px-5 py-3 text-slate-500 tabular-nums">{item.dueDate || 'N/A'}</td>
                            <td className="px-5 py-3">
                              <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${
                                item.bucketName.includes('Current')
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : item.bucketName.includes('90+') || item.bucketName.includes('91')
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-amber-100 text-amber-700'
                              }`}>
                                {item.bucketName}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-slate-800 font-bold text-right tabular-nums">{formatMoney(item.amount)}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
