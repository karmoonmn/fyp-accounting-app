import { useState, useEffect } from 'react'
import { api } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts'
import {
  HiOutlinePresentationChartLine,
} from 'react-icons/hi2'

const formatMoney = (val) => {
  if (val == null) return '$0.00'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg px-4 py-3 min-w-[160px]">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{label}</p>
        {payload.map((entry, i) => (
          <div key={i} className="flex justify-between items-center gap-4 py-0.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-xs text-slate-600 font-medium">{entry.name}</span>
            </div>
            <span className="text-xs font-bold text-slate-800">{formatMoney(entry.value)}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
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

  const pieData = data?.expenseByCategory?.map(c => ({
    name: c.accountName,
    value: c.balance
  })).sort((a, b) => b.value - a.value) || []

  const allCategories = [...new Set(data?.expenseByCategory?.map(c => c.accountName) || [])]

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100 px-7 py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-200">
              <HiOutlinePresentationChartLine className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <h2 className="text-[#111827] text-[18px] font-bold">Expense Analysis</h2>
              <p className="text-[13px] text-[#64748B] mt-0.5">Breakdown and monthly trends of operating expenses</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-xl border border-violet-200 px-4 py-2 shadow-sm">
            <span className="text-xs font-semibold text-slate-500">Fiscal Year</span>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="text-[13px] text-[#111827] bg-transparent focus:outline-none font-bold cursor-pointer"
            >
              {[...Array(5)].map((_, i) => {
                const y = new Date().getFullYear() - i;
                return <option key={y} value={y}>{y}</option>
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-7">
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 h-96 bg-slate-100 rounded-xl animate-pulse" />
            <div className="lg:col-span-2 h-96 bg-slate-100 rounded-xl animate-pulse" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-5 py-4 text-sm font-medium">
            <span className="text-lg">⚠️</span>
            {error}
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Summary & Pie */}
            <div className="lg:col-span-1 border border-slate-200 rounded-xl overflow-hidden">
              {/* Total Expenses Card */}
              <div className="relative overflow-hidden bg-gradient-to-br from-rose-50 to-pink-50 p-5 border-b border-slate-200">
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-200/20 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                  <h3 className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1.5">Total Expenses</h3>
                  <div className="text-3xl font-black text-rose-700 tabular-nums">{formatMoney(data.totalExpenses)}</div>
                </div>
              </div>

              {/* Donut Chart */}
              <div className="p-5">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">By Category</h4>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                        label={renderCustomLabel}
                        labelLine={false}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="white" strokeWidth={2} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-1">
                  {pieData.map((entry, index) => (
                    <div key={entry.name} className="flex justify-between items-center text-sm group hover:bg-slate-50 rounded-lg px-2 py-1.5 -mx-2 transition-colors duration-200">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-3 h-3 rounded-full shrink-0 ring-2 ring-offset-1 ring-white" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-slate-600 truncate text-[13px] font-medium" title={entry.name}>{entry.name}</span>
                      </div>
                      <span className="font-bold text-slate-800 text-[13px] tabular-nums shrink-0 ml-2">{formatMoney(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Line Chart */}
            <div className="lg:col-span-2 border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-5">Monthly Trends</h3>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.monthlyTrends} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="month"
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
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
                      iconType="circle"
                      iconSize={8}
                    />
                    {allCategories.map((cat, idx) => (
                      <Line
                        key={cat}
                        type="monotone"
                        dataKey={cat}
                        stroke={COLORS[idx % COLORS.length]}
                        strokeWidth={2.5}
                        dot={{ r: 3.5, strokeWidth: 2, fill: 'white' }}
                        activeDot={{ r: 6, strokeWidth: 3, fill: 'white' }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
