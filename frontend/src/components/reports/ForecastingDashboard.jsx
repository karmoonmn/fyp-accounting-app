import { useState, useEffect } from 'react'
import { api } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'
import {
  HiOutlineArrowTrendingUp,
} from 'react-icons/hi2'

const formatMoney = (val) => {
  if (val == null) return '$0.00'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg px-4 py-3 min-w-[180px]">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{label}</p>
        {payload.filter(p => p.value != null).map((entry, i) => (
          <div key={i} className="flex justify-between items-center gap-4 py-0.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-xs text-slate-600 font-medium">{entry.name}</span>
            </div>
            <span className="text-xs font-bold text-slate-800 tabular-nums">{formatMoney(entry.value)}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function ForecastingDashboard() {
  const { idToken: token } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await api(`/api/reports/forecast`, { token })
      
      // Combine historical and forecast data for the chart
      const combined = [
        ...res.historicalData.map(d => ({ ...d, type: 'Historical' })),
        ...res.forecastData.map(d => ({ 
          month: d.month, 
          forecastRevenue: d.revenue, 
          forecastExpenses: d.expenses,
          type: 'Forecast'
        }))
      ]
      
      // Link the last historical point to the first forecast point for continuous lines
      if (res.historicalData.length > 0 && res.forecastData.length > 0) {
        const lastHist = res.historicalData[res.historicalData.length - 1]
        const linkPoint = {
          month: lastHist.month,
          forecastRevenue: lastHist.revenue,
          forecastExpenses: lastHist.expenses,
          type: 'Link'
        }
        const insertIndex = combined.findIndex(d => d.type === 'Forecast')
        combined.splice(insertIndex, 0, linkPoint)
      }

      setData({ raw: res, chartData: combined })
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) loadData()
  }, [token])

  const avgRevenue = data?.raw.historicalData.reduce((acc, curr) => acc + curr.revenue, 0) / Math.max(1, data?.raw.historicalData.length || 1) || 0
  const avgExpenses = data?.raw.historicalData.reduce((acc, curr) => acc + curr.expenses, 0) / Math.max(1, data?.raw.historicalData.length || 1) || 0

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-cyan-100 px-7 py-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-200">
            <HiOutlineArrowTrendingUp className="w-5.5 h-5.5 text-white" />
          </div>
          <div>
            <h2 className="text-[#111827] text-[18px] font-bold">Financial Forecasting</h2>
            <p className="text-[13px] text-[#64748B] mt-0.5">Predictive analysis based on historical journal entries</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-7">
        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
            <div className="h-96 bg-slate-100 rounded-xl animate-pulse" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-5 py-4 text-sm font-medium">
            <span className="text-lg">⚠️</span>
            {error}
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/60 p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-200/20 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                  <h3 className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-2">Avg Historical Revenue</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-emerald-800 tabular-nums">{formatMoney(avgRevenue)}</span>
                    <span className="text-xs font-semibold text-emerald-600/60">/mo</span>
                  </div>
                </div>
              </div>
              
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200/60 p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-200/20 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                  <h3 className="text-[11px] font-bold text-rose-700 uppercase tracking-wider mb-2">Avg Historical Expenses</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-rose-800 tabular-nums">{formatMoney(avgExpenses)}</span>
                    <span className="text-xs font-semibold text-rose-600/60">/mo</span>
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/60 p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-200/20 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                  <h3 className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-2">Forecasted Growth</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-blue-800">+2.0%</span>
                    <span className="text-xs font-semibold text-blue-600/60">baseline trend</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/30">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Revenue vs Expenses — Actual & Forecast</h3>
                <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-0.5 bg-emerald-500 rounded-full" />
                    <span>Solid = Actual</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-0.5 border-b-2 border-dashed border-emerald-500" />
                    <span>Dashed = Forecast</span>
                  </div>
                </div>
              </div>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }}
                      iconType="circle"
                      iconSize={8}
                    />
                    
                    <ReferenceLine
                      x={data.raw.historicalData[data.raw.historicalData.length - 1]?.month}
                      stroke="#94a3b8"
                      strokeDasharray="4 4"
                      label={{ position: 'top', value: '▼ Today', fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                    />

                    <Line
                      name="Actual Revenue"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, fill: 'white' }}
                      activeDot={{ r: 6, strokeWidth: 3, fill: 'white' }}
                    />
                    <Line
                      name="Actual Expenses"
                      type="monotone"
                      dataKey="expenses"
                      stroke="#f43f5e"
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, fill: 'white' }}
                      activeDot={{ r: 6, strokeWidth: 3, fill: 'white' }}
                    />
                    
                    <Line
                      name="Forecast Revenue"
                      type="monotone"
                      dataKey="forecastRevenue"
                      stroke="#10b981"
                      strokeWidth={3}
                      strokeDasharray="8 4"
                      dot={{ r: 4, strokeWidth: 2, fill: 'white' }}
                      activeDot={{ r: 6, strokeWidth: 3, fill: 'white' }}
                    />
                    <Line
                      name="Forecast Expenses"
                      type="monotone"
                      dataKey="forecastExpenses"
                      stroke="#f43f5e"
                      strokeWidth={3}
                      strokeDasharray="8 4"
                      dot={{ r: 4, strokeWidth: 2, fill: 'white' }}
                      activeDot={{ r: 6, strokeWidth: 3, fill: 'white' }}
                    />
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
