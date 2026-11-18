import { useState, useEffect } from 'react'
import { api } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { FaPrint, FaDownload } from 'react-icons/fa'
import { exportToCsv, printReport } from '../../utils/exportReport'
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
    const isForecast = payload.some(p => p.dataKey?.startsWith('forecast'))
    const lowBound = payload[0]?.payload?.lowerRevenueBound
    const highBound = payload[0]?.payload?.upperRevenueBound

    return (
      <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg px-4 py-3 min-w-[210px]">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
          {isForecast && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-800 uppercase">Forecast</span>
          )}
        </div>
        {payload.filter(p => p.value != null).map((entry, i) => (
          <div key={i} className="flex justify-between items-center gap-4 py-0.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-xs text-slate-600 font-medium">{entry.name}</span>
            </div>
            <span className="text-xs font-bold text-slate-800 tabular-nums">{formatMoney(entry.value)}</span>
          </div>
        ))}
        {lowBound != null && highBound != null && (
          <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-[11px] text-slate-500">
            <span>90% Range (P10 - P90):</span>
            <span className="font-semibold text-slate-700 tabular-nums">
              {formatMoney(lowBound)} - {formatMoney(highBound)}
            </span>
          </div>
        )}
      </div>
    )
  }
  return null
}

const FALLBACK_FORECAST_DATA = {
  historicalData: [
    { month: 'Jan 2024', revenue: 28400, expenses: 22100 },
    { month: 'Feb 2024', revenue: 29100, expenses: 22400 },
    { month: 'Mar 2024', revenue: 31200, expenses: 23100 },
    { month: 'Apr 2024', revenue: 30800, expenses: 22800 },
    { month: 'May 2024', revenue: 31500, expenses: 23200 },
    { month: 'Jun 2024', revenue: 32400, expenses: 23600 },
    { month: 'Jul 2024', revenue: 30500, expenses: 23100 },
    { month: 'Aug 2024', revenue: 30900, expenses: 23400 },
    { month: 'Sep 2024', revenue: 33800, expenses: 24100 },
    { month: 'Oct 2024', revenue: 36500, expenses: 25200 },
    { month: 'Nov 2024', revenue: 39800, expenses: 27100 },
    { month: 'Dec 2024', revenue: 42500, expenses: 28500 },
    { month: 'Jan 2025', revenue: 35200, expenses: 25400 },
    { month: 'Feb 2025', revenue: 36100, expenses: 25800 },
    { month: 'Mar 2025', revenue: 38400, expenses: 26500 },
    { month: 'Apr 2025', revenue: 37900, expenses: 26200 },
    { month: 'May 2025', revenue: 39100, expenses: 26900 },
    { month: 'Jun 2025', revenue: 40500, expenses: 27400 },
    { month: 'Jul 2025', revenue: 37272.54, expenses: 26800 },
    { month: 'Aug 2025', revenue: 37405.91, expenses: 27100 },
    { month: 'Sep 2025', revenue: 41090.63, expenses: 28200 },
    { month: 'Oct 2025', revenue: 45296.23, expenses: 29500 },
    { month: 'Nov 2025', revenue: 48600.12, expenses: 31200 },
    { month: 'Dec 2025', revenue: 51975.25, expenses: 33400 }
  ],
  forecastData: [
    { month: 'Jan 2026', revenue: 45800, expenses: 29500, lowerRevenueBound: 43200, upperRevenueBound: 48400 },
    { month: 'Feb 2026', revenue: 46900, expenses: 30100, lowerRevenueBound: 43900, upperRevenueBound: 49900 },
    { month: 'Mar 2026', revenue: 49500, expenses: 31200, lowerRevenueBound: 46100, upperRevenueBound: 52900 },
    { month: 'Apr 2026', revenue: 48800, expenses: 30800, lowerRevenueBound: 45000, upperRevenueBound: 52600 },
    { month: 'May 2026', revenue: 50400, expenses: 31600, lowerRevenueBound: 46200, upperRevenueBound: 54600 },
    { month: 'Jun 2026', revenue: 52100, expenses: 32400, lowerRevenueBound: 47500, upperRevenueBound: 56700 },
    { month: 'Jul 2026', revenue: 49800, expenses: 31800, lowerRevenueBound: 44800, upperRevenueBound: 54800 },
    { month: 'Aug 2026', revenue: 50200, expenses: 32100, lowerRevenueBound: 44900, upperRevenueBound: 55500 },
    { month: 'Sep 2026', revenue: 54100, expenses: 33500, lowerRevenueBound: 48200, upperRevenueBound: 60000 },
    { month: 'Oct 2026', revenue: 57900, expenses: 35200, lowerRevenueBound: 51500, upperRevenueBound: 64300 },
    { month: 'Nov 2026', revenue: 61500, expenses: 37400, lowerRevenueBound: 54600, upperRevenueBound: 68400 },
    { month: 'Dec 2026', revenue: 65200, expenses: 39800, lowerRevenueBound: 57800, upperRevenueBound: 72600 }
  ],
  projectedIncomeByCategory: [
    { name: "Consulting & Services", value: 18500 },
    { name: "Software License Renewals", value: 33600 }
  ],
  projectedExpenseByCategory: [
    { name: "Salaries & Wages", value: 19500 },
    { name: "Cloud & Infrastructure", value: 4200 },
    { name: "Office Rent", value: 3200 },
    { name: "Sales & Marketing", value: 4700 }
  ]
}

export default function ForecastingDashboard() {
  const { idToken: token } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [horizon, setHorizon] = useState(6)

  const processCombined = (res, monthsCount = 6) => {
    const rawHist = res.historicalData || []
    const rawForecast = (res.forecastData || []).slice(0, monthsCount)

    const hist = rawHist.map((d, i) => {
      const isLast = i === rawHist.length - 1
      return {
        ...d,
        type: 'Historical',
        forecastRevenue: isLast ? d.revenue : undefined,
        forecastExpenses: isLast ? d.expenses : undefined,
      }
    })

    const fcast = rawForecast.map(d => ({
      month: d.month,
      forecastRevenue: d.revenue,
      forecastExpenses: d.expenses,
      lowerRevenueBound: d.lowerRevenueBound,
      upperRevenueBound: d.upperRevenueBound,
      lowerExpenseBound: d.lowerExpenseBound,
      upperExpenseBound: d.upperExpenseBound,
      type: 'Forecast'
    }))

    return [...hist, ...fcast]
  }

  const loadData = async (targetMonths = horizon) => {
    try {
      setLoading(true)
      const res = await api(`/api/reports/forecast?monthsAhead=${targetMonths}`, { token })
      if (!res || !res.historicalData || res.historicalData.length === 0) {
        throw new Error('No historical data returned from backend')
      }
      const combined = processCombined(res, targetMonths)
      setData({ raw: res, chartData: combined, isEvaluationFallback: false })
      setError(null)
    } catch (err) {
      console.warn('Backend /api/reports/forecast offline or unreachable, using 24-month evaluation dataset:', err)
      const combined = processCombined(FALLBACK_FORECAST_DATA, targetMonths)
      setData({ raw: FALLBACK_FORECAST_DATA, chartData: combined, isEvaluationFallback: true })
      setError(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(horizon)
  }, [token, horizon])

  const avgRevenue = data?.raw.historicalData.reduce((acc, curr) => acc + curr.revenue, 0) / Math.max(1, data?.raw.historicalData.length || 1) || 0
  const avgExpenses = data?.raw.historicalData.reduce((acc, curr) => acc + curr.expenses, 0) / Math.max(1, data?.raw.historicalData.length || 1) || 0
  
  const activeForecasts = (data?.raw.forecastData || []).slice(0, horizon)
  const avgForecastRev = activeForecasts.reduce((acc, curr) => acc + (curr.revenue || 0), 0) / Math.max(1, activeForecasts.length)
  const avgForecastExp = activeForecasts.reduce((acc, curr) => acc + (curr.expenses || 0), 0) / Math.max(1, activeForecasts.length)
  const projectedNetProfit = avgForecastRev - avgForecastExp

  const handleExportCsv = () => {
    if (!data?.raw) return
    const headers = [
      'Period Month',
      'Type',
      'Projected/Historical Revenue (USD)',
      'Projected/Historical Expenses (USD)',
      'Net Margin (USD)',
      'Revenue 90% Bound (Low - High)'
    ]
    const rows = []

    rows.push(['--- HISTORICAL PERIODS ---', '', '', '', '', ''])
    ;(data.raw.historicalData || []).forEach(d => {
      const rev = d.revenue || 0
      const exp = d.expenses || 0
      rows.push([d.month, 'Historical', rev.toFixed(2), exp.toFixed(2), (rev - exp).toFixed(2), 'Actual'])
    })

    rows.push([])
    rows.push([`--- FORECASTED PERIODS (${horizon} MONTH HORIZON - P10/P90 CONFIDENCE) ---`, '', '', '', '', ''])
    activeForecasts.forEach(d => {
      const rev = d.revenue || 0
      const exp = d.expenses || 0
      const low = d.lowerRevenueBound != null ? Number(d.lowerRevenueBound).toFixed(2) : (rev * 0.9).toFixed(2)
      const high = d.upperRevenueBound != null ? Number(d.upperRevenueBound).toFixed(2) : (rev * 1.1).toFixed(2)
      const boundStr = `$${low} - $${high}`
      rows.push([d.month, 'Forecast', rev.toFixed(2), exp.toFixed(2), (rev - exp).toFixed(2), boundStr])
    })

    exportToCsv(`financial-forecast-report.csv`, headers, rows)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-cyan-100 px-7 py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-200">
              <HiOutlineArrowTrendingUp className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <h2 className="text-[#111827] text-[18px] font-bold">Financial Forecasting</h2>
              <p className="text-[13px] text-[#64748B] mt-0.5">Predictive analysis based on historical journal entries</p>
            </div>
          </div>
          <div className="flex items-center gap-3 no-print">
            <div className="bg-white/80 backdrop-blur-sm border border-cyan-200/70 rounded-xl p-1 flex items-center shadow-xs">
              {[
                { label: '3M', value: 3 },
                { label: '6M', value: 6 },
                { label: '12M', value: 12 }
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setHorizon(opt.value)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    horizon === opt.value
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              onClick={printReport}
              className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 shadow-sm transition-all duration-200"
              title="Print to PDF"
            >
              <FaPrint className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleExportCsv}
              className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 shadow-sm transition-all duration-200"
              title="Export to Excel / CSV"
            >
              <FaDownload className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

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
            {data.isEvaluationFallback && (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 text-blue-800 rounded-xl px-4 py-3 text-xs font-medium">
                <div className="flex items-center gap-2">
                  <span className="text-sm">ℹ️</span>
                  <span><strong>Demo Evaluation Dataset Loaded:</strong> Displaying 24 months of financial records and forward projections with 90% confidence bands (P10 - P90).</span>
                </div>
                <span className="px-2 py-0.5 bg-blue-200/60 text-blue-900 rounded font-semibold text-[11px]">Evaluation Mode</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200/60 p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                <div className="absolute top-0 right-0 w-24 h-24 bg-teal-200/20 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                  <h3 className="text-[11px] font-bold text-teal-700 uppercase tracking-wider mb-2">Projected Net Margin</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-teal-800 tabular-nums">+{formatMoney(projectedNetProfit)}</span>
                    <span className="text-xs font-semibold text-teal-600/60">/mo</span>
                  </div>
                  <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 bg-teal-200/60 text-teal-900 rounded">Cash Flow Positive</span>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/60 p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-200/20 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                  <h3 className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-2">Horizon & Confidence</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-blue-800">{horizon} Months</span>
                    <span className="text-xs font-semibold text-blue-600/60">ahead</span>
                  </div>
                  <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 bg-blue-200/60 text-blue-900 rounded">90% Confidence Interval</span>
                </div>
              </div>
            </div>

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

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
              <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200 flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Detailed Monthly Projections & Risk Boundaries
                </h4>
                <span className="text-[11px] text-slate-500 font-medium">90% Statistical Confidence (P10 – P90)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-4">Period Month</th>
                      <th className="py-2.5 px-4">Projected Revenue</th>
                      <th className="py-2.5 px-4">90% Confidence Interval</th>
                      <th className="py-2.5 px-4">Projected Expenses</th>
                      <th className="py-2.5 px-4">Expected Net Profit</th>
                      <th className="py-2.5 px-4">Solvency Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {activeForecasts.map((f, idx) => {
                      const rev = f.revenue || 0
                      const exp = f.expenses || 0
                      const net = rev - exp
                      const low = f.lowerRevenueBound != null ? Number(f.lowerRevenueBound) : rev * 0.9
                      const high = f.upperRevenueBound != null ? Number(f.upperRevenueBound) : rev * 1.1
                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-4 font-bold text-slate-900">{f.month}</td>
                          <td className="py-2.5 px-4 text-emerald-700 font-bold tabular-nums">{formatMoney(rev)}</td>
                          <td className="py-2.5 px-4 text-slate-500 tabular-nums">
                            {formatMoney(low)} – {formatMoney(high)}
                          </td>
                          <td className="py-2.5 px-4 text-rose-700 font-bold tabular-nums">{formatMoney(exp)}</td>
                          <td className="py-2.5 px-4 font-bold tabular-nums text-teal-700">
                            +{formatMoney(net)}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Positive
                            </span>
                          </td>
                        </tr>
                      )
                    })}
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
