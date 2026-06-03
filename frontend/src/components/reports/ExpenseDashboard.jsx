import { useState, useEffect } from 'react'
import { api } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts'

const formatMoney = (val) => {
  if (val == null) return '$0.00'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
}

export default function ExpenseDashboard() {
  const { idToken: token } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [year, setYear] = useState(() => new Date().getFullYear())

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await api(`/api/reports/expense-analysis?year=${year}`, { token })
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
  }, [token, year])

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

  const pieData = data?.expenseByCategory?.map(c => ({
    name: c.accountName,
    value: c.balance
  })).sort((a, b) => b.value - a.value) || []

  // Extract all unique category names for lines
  const allCategories = [...new Set(data?.expenseByCategory?.map(c => c.accountName) || [])]

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Expense Analysis</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Breakdown and monthly trends of operating expenses</p>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <label className="text-sm text-slate-500 font-medium">Fiscal Year:</label>
          <select 
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="border border-slate-300 dark:border-slate-600 rounded px-3 py-1.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-200"
          >
            {[...Array(5)].map((_, i) => {
              const y = new Date().getFullYear() - i;
              return <option key={y} value={y}>{y}</option>
            })}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse h-96 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Summary & Pie */}
          <div className="lg:col-span-1 border border-slate-200 dark:border-slate-700 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Total Expenses</h3>
            <div className="text-3xl font-black text-rose-600 dark:text-rose-400 mb-6">{formatMoney(data.totalExpenses)}</div>
            
            <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">By Category</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => formatMoney(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-2">
              {pieData.map((entry, index) => (
                <div key={entry.name} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="text-slate-700 dark:text-slate-300 truncate w-32" title={entry.name}>{entry.name}</span>
                  </div>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{formatMoney(entry.value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Line Chart */}
          <div className="lg:col-span-2 border border-slate-200 dark:border-slate-700 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-6">Monthly Trends</h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.monthlyTrends} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{fill: '#64748b', fontSize: 12}} axisLine={{stroke: '#cbd5e1'}} tickLine={false} />
                  <YAxis tickFormatter={(val) => `$${val/1000}k`} tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                  <RechartsTooltip formatter={(value) => formatMoney(value)} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  {allCategories.map((cat, idx) => (
                    <Line 
                      key={cat} 
                      type="monotone" 
                      dataKey={cat} 
                      stroke={COLORS[idx % COLORS.length]} 
                      strokeWidth={2}
                      dot={{ r: 4, strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      ) : null}
    </div>
  )
}
