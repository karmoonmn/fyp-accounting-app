import { useState, useEffect } from 'react'
import { api } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const formatMoney = (val) => {
  if (val == null) return '$0.00'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
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

  const colors = ['#10b981', '#f59e0b', '#f97316', '#ef4444', '#b91c1c'] // green to deep red

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          {type === 'AR' ? 'Accounts Receivable Aging' : 'Accounts Payable Aging'}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {type === 'AR' ? 'Outstanding customer invoices by overdue duration' : 'Outstanding vendor bills by overdue duration'}
        </p>
      </div>

      {loading ? (
        <div className="animate-pulse h-64 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : data ? (
        <div>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            {data.buckets.map((bucket, i) => (
              <div key={bucket.name} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded border border-slate-200 dark:border-slate-600 text-center">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase mb-1">{bucket.name}</div>
                <div className="text-lg font-bold" style={{ color: colors[i] }}>{formatMoney(bucket.amount)}</div>
              </div>
            ))}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded border border-blue-200 dark:border-blue-800 text-center col-span-2 md:col-span-1">
              <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase mb-1">Total Outstanding</div>
              <div className="text-xl font-bold text-blue-700 dark:text-blue-300">{formatMoney(data.totalAmount)}</div>
            </div>
          </div>

          {/* Validation Warning */}
          {data.totalAmount !== data.glBalance && (
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md text-yellow-800 dark:text-yellow-200 text-sm flex items-start gap-3">
              <div className="mt-0.5">⚠️</div>
              <div>
                <strong>Reconciliation Warning:</strong> The total outstanding amount ({formatMoney(data.totalAmount)}) 
                does not match the General Ledger balance for {type === 'AR' ? 'Accounts Receivable' : 'Accounts Payable'} ({formatMoney(data.glBalance)}). 
                This indicates a journal entry was manually posted to the control account bypassing the Invoice/Bill system, or an orphaned payment exists.
              </div>
            </div>
          )}

          {/* Chart */}
          <div className="h-64 mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.buckets} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} axisLine={{stroke: '#cbd5e1'}} tickLine={false} />
                <YAxis tickFormatter={(val) => `$${val/1000}k`} tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => formatMoney(value)} cursor={{fill: 'rgba(148, 163, 184, 0.1)'}} />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {data.buckets.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detail Table */}
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Overdue Details</h3>
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-medium">Document #</th>
                  <th className="px-4 py-3 font-medium">{type === 'AR' ? 'Customer' : 'Supplier'}</th>
                  <th className="px-4 py-3 font-medium">Due Date</th>
                  <th className="px-4 py-3 font-medium">Bucket</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {data.buckets.flatMap(b => b.items.map(item => ({ ...item, bucketName: b.name }))).length === 0 ? (
                  <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">No outstanding items</td></tr>
                ) : (
                  data.buckets.flatMap(b => b.items.map(item => ({ ...item, bucketName: b.name })))
                    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                    .map(item => (
                    <tr key={item.docNumber} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{item.docNumber}</td>
                      <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{item.name}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{item.dueDate || 'N/A'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400"><span className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-xs">{item.bucketName}</span></td>
                      <td className="px-4 py-3 text-slate-800 dark:text-slate-200 font-medium text-right">{formatMoney(item.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      ) : null}
    </div>
  )
}
