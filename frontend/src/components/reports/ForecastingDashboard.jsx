import { useState, useEffect } from 'react'
import { api } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'

const formatMoney = (val) => {
  if (val == null) return '$0.00'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
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
      
      // We need to link the last historical point to the first forecast point to make the line continuous
      if (res.historicalData.length > 0 && res.forecastData.length > 0) {
        const lastHist = res.historicalData[res.historicalData.length - 1]
        const linkPoint = {
          month: lastHist.month,
          forecastRevenue: lastHist.revenue,
          forecastExpenses: lastHist.expenses,
          type: 'Link'
        }
        // Insert link point before the first forecast point
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

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Financial Forecasting</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Predictive analysis based on historical journal entries</p>
      </div>

      {loading ? (
        <div className="animate-pulse h-96 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : data ? (
        <div>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-2">Avg Historical Revenue</h3>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-500">
                {formatMoney(
                  data.raw.historicalData.reduce((acc, curr) => acc + curr.revenue, 0) / Math.max(1, data.raw.historicalData.length)
                )}
                <span className="text-sm font-normal text-emerald-600/70 dark:text-emerald-500/70 ml-2">/mo</span>
              </div>
            </div>
            
            <div className="bg-rose-50 dark:bg-rose-900/20 p-5 rounded-lg border border-rose-200 dark:border-rose-800">
              <h3 className="text-sm font-semibold text-rose-800 dark:text-rose-400 uppercase tracking-wider mb-2">Avg Historical Expenses</h3>
              <div className="text-3xl font-black text-rose-600 dark:text-rose-500">
                {formatMoney(
                  data.raw.historicalData.reduce((acc, curr) => acc + curr.expenses, 0) / Math.max(1, data.raw.historicalData.length)
                )}
                <span className="text-sm font-normal text-rose-600/70 dark:text-rose-500/70 ml-2">/mo</span>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-400 uppercase tracking-wider mb-2">Forecasted Growth</h3>
              <div className="text-3xl font-black text-blue-600 dark:text-blue-500">
                +2.0%
                <span className="text-sm font-normal text-blue-600/70 dark:text-blue-500/70 ml-2">baseline trend</span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="h-96 border border-slate-200 dark:border-slate-700 rounded-lg p-4 pt-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{fill: '#64748b', fontSize: 12}} axisLine={{stroke: '#cbd5e1'}} tickLine={false} />
                <YAxis tickFormatter={(val) => `$${val/1000}k`} tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => formatMoney(value)} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                
                <ReferenceLine x={data.raw.historicalData[data.raw.historicalData.length - 1]?.month} stroke="#94a3b8" strokeDasharray="3 3" label={{ position: 'top', value: 'Today', fill: '#64748b', fontSize: 12 }} />

                <Line name="Actual Revenue" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                <Line name="Actual Expenses" type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                
                <Line name="Forecast Revenue" type="monotone" dataKey="forecastRevenue" stroke="#10b981" strokeWidth={3} strokeDasharray="5 5" dot={{r: 4}} activeDot={{r: 6}} />
                <Line name="Forecast Expenses" type="monotone" dataKey="forecastExpenses" stroke="#f43f5e" strokeWidth={3} strokeDasharray="5 5" dot={{r: 4}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>

        </div>
      ) : null}
    </div>
  )
}
