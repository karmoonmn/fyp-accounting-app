import React, { useState, useEffect } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import {
  HiOutlineArrowDownTray,
  HiOutlineArrowTrendingDown,
  HiOutlineArrowTrendingUp,
  HiOutlineClock,
} from 'react-icons/hi2'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import DashboardLayout from '../components/DashboardLayout'

const TIMEFRAMES = ['This month', 'Next quarter', 'Next 6 months', 'Next year']

const CHART_SERIES = [
  { month: 'Jan', revenue: 52000, expense: 38000 },
  { month: 'Feb', revenue: 48000, expense: 41000 },
  { month: 'Mar', revenue: 61000, expense: 44000 },
  { month: 'Apr', revenue: 55000, expense: 39000 },
  { month: 'May', revenue: 67000, expense: 46000 },
  { month: 'Jun', revenue: 72000, expense: 48000 },
]

const INCOME_COLORS = ['#0F766E', '#14B8A6', '#5EEAD4', '#99F6E4', '#CCFBF1']
const EXPENSE_COLORS = ['#BE123C', '#E11D48', '#FB7185', '#FDA4AF', '#FECDD3']

function formatUsd(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function formatUsdFull(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(n)
}

function ConfidenceBadge({ level }) {
  const styles = {
    High: 'bg-[#CCFBF1] text-[#0F766E]',
    Medium: 'bg-[#FEF3C7] text-[#B45309]',
    Low: 'bg-[#FEE2E2] text-[#B91C1C]',
  }
  return (
    <span
      className={`inline-flex rounded-lg px-2.5 py-1 text-[12px] font-bold ${styles[level] || styles.Medium}`}
    >
      {level}
    </span>
  )
}

function DonutCard({ title, data, centerLabel, centerSub }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h3 className="text-[#111827] text-[16px] font-bold">{title}</h3>
      <div className="relative mx-auto mt-2 h-[260px] w-full max-w-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={72}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => `${v}%`} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-2">
          <span className="text-[22px] font-bold tabular-nums text-[#111827]">{centerLabel}</span>
          {centerSub ? <span className="text-[12px] font-medium text-[#64748B]">{centerSub}</span> : null}
        </div>
      </div>
      <ul className="mt-2 space-y-2">
        {data.map((row) => (
          <li key={row.name} className="flex items-center justify-between text-[13px]">
            <span className="flex items-center gap-2 text-[#374151]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
              {row.name}
            </span>
            <span className="font-semibold tabular-nums text-[#111827]">{row.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function FinancialForecast() {
  const { idToken: token } = useAuth()
  const [timeframe, setTimeframe] = useState('Next 6 months')
  const [chartKind, setChartKind] = useState('line')

  const [loading, setLoading] = useState(true)
  const [chartSeries, setChartSeries] = useState([])
  const [monthlyForecast, setMonthlyForecast] = useState([])
  const [totals, setTotals] = useState({ income: 0, expense: 0, net: 0 })

  const [incomeByCategory, setIncomeByCategory] = useState([])
  const [expenseByCategory, setExpenseByCategory] = useState([])

  useEffect(() => {
    if (!token) return
    const loadData = async () => {
      try {
        setLoading(true)
        
        let monthsAhead = 6
        if (timeframe === 'This month') monthsAhead = 1
        if (timeframe === 'Next quarter') monthsAhead = 3
        if (timeframe === 'Next year') monthsAhead = 12
        
        const res = await api(`/api/reports/forecast?monthsAhead=${monthsAhead}`, { token })
        
        const combined = [
          ...(res.historicalData || []).map(d => ({ month: d.month, revenue: d.revenue, expense: d.expenses })),
          ...(res.forecastData || []).map(d => ({ month: d.month, revenue: d.revenue, expense: d.expenses }))
        ]
        setChartSeries(combined)

        const forecastTable = (res.forecastData || []).map(d => ({
          month: d.month,
          income: d.revenue,
          expense: d.expenses,
          net: d.revenue - d.expenses,
          confidence: 'High'
        }))
        setMonthlyForecast(forecastTable)

        const totalInc = (res.forecastData || []).reduce((acc, cur) => acc + cur.revenue, 0)
        const totalExp = (res.forecastData || []).reduce((acc, cur) => acc + cur.expenses, 0)
        setTotals({ income: totalInc, expense: totalExp, net: totalInc - totalExp })
        
        // Calculate percentages and add colors
        const processCategories = (categories, colors, totalAmount) => {
           if (!categories) return []
           const total = categories.reduce((acc, cur) => acc + cur.value, 0)
           if (total === 0) return categories.map((c, i) => ({ ...c, value: 0, color: colors[i % colors.length] }))
           
           return categories.map((c, i) => ({
             name: c.name,
             value: Math.round((c.value / total) * 100),
             color: colors[i % colors.length]
           }))
        }
        
        setIncomeByCategory(processCategories(res.projectedIncomeByCategory, INCOME_COLORS, totalInc))
        setExpenseByCategory(processCategories(res.projectedExpenseByCategory, EXPENSE_COLORS, totalExp))

      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [token, timeframe])

  function downloadCsv() {
    const header = ['Month', 'Projected Income', 'Projected Expenses', 'Net Cash Flow', 'Confidence']
    const rows = monthlyForecast.map((r) =>
      [r.month, r.income, r.expense, r.net, r.confidence].join(','),
    )
    const blob = new Blob([[header.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'financial-forecast.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <DashboardLayout activeNav="analytics">
      <div className="space-y-6">
        {loading && <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">Loading...</div>}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <h2 className="text-[#111827] text-[28px] font-bold tracking-tight">Financial forecast</h2>
                <p className="mt-1 text-[15px] font-medium text-[#64748B]">
                  Predict your cash flow and plan ahead.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input
                type="date"
                className="h-10 rounded-xl border border-[#E5E7EB] bg-white px-3 text-[13px] text-[#111827] focus:border-[#0F766E] focus:outline-none"
                defaultValue="2024-01-01"
              />
              <span className="text-[#9CA3AF]">→</span>
              <input
                type="date"
                className="h-10 rounded-xl border border-[#E5E7EB] bg-white px-3 text-[13px] text-[#111827] focus:border-[#0F766E] focus:outline-none"
                defaultValue="2024-06-30"
              />
            </div>
          </div>

          <div className="flex flex-col items-start gap-4 sm:items-end">
            <div className="flex flex-wrap items-center justify-end gap-2">
              {TIMEFRAMES.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setTimeframe(label)}
                  className={`rounded-full px-4 py-2 text-[13px] font-bold transition-all ${
                    timeframe === label
                      ? 'bg-[#0F766E] text-white shadow-sm'
                      : 'bg-white text-[#64748B] shadow-sm ring-1 ring-[#E5E7EB] hover:text-[#111827]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {/*<div className="flex items-center gap-2">*/}
            {/*  {['JD', 'SC', 'MK'].map((initials) => (*/}
            {/*    <span*/}
            {/*      key={initials}*/}
            {/*      className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#E5E7EB] text-[11px] font-bold text-[#374151] shadow-sm"*/}
            {/*    >*/}
            {/*      {initials}*/}
            {/*    </span>*/}
            {/*  ))}*/}
            {/*</div>*/}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <span className="text-[13px] font-semibold text-[#64748B]">Projected income</span>
              <HiOutlineArrowTrendingUp className="h-5 w-5 text-[#0F766E]" />
            </div>
            <p className="mt-3 text-3xl font-bold tabular-nums text-[#111827]">{formatUsdFull(totals.income)}</p>
            <p className="mt-2 text-[13px] font-semibold text-[#0F766E]">↑ 12.3% vs last period</p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <span className="text-[13px] font-semibold text-[#64748B]">Projected expenses</span>
              <HiOutlineArrowTrendingDown className="h-5 w-5 text-[#E11D48]" />
            </div>
            <p className="mt-3 text-3xl font-bold tabular-nums text-[#111827]">{formatUsdFull(totals.expense)}</p>
            <p className="mt-2 text-[13px] font-semibold text-[#E11D48]">↓ 0.9% vs last period</p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <span className="text-[13px] font-semibold text-[#64748B]">Net cash flow</span>
              <HiOutlineClock className="h-5 w-5 text-[#0F766E]" />
            </div>
            <p className="mt-3 text-3xl font-bold tabular-nums text-[#111827]">{formatUsdFull(totals.net)}</p>
            <p className="mt-2 text-[13px] font-semibold text-[#0F766E]">↑ 24.6% vs last period</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-7 shadow-sm">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-[#111827] text-[18px] font-bold">Income vs expenses forecast</h3>
            <div className="inline-flex rounded-xl bg-[#F3F4F6] p-1">
              <button
                type="button"
                onClick={() => setChartKind('line')}
                className={`rounded-lg px-4 py-2 text-[13px] font-bold transition-all ${
                  chartKind === 'line' ? 'bg-white text-[#0F766E] shadow-sm' : 'text-[#64748B]'
                }`}
              >
                Line chart
              </button>
              <button
                type="button"
                onClick={() => setChartKind('bar')}
                className={`rounded-lg px-4 py-2 text-[13px] font-bold transition-all ${
                  chartKind === 'bar' ? 'bg-white text-[#0F766E] shadow-sm' : 'text-[#64748B]'
                }`}
              >
                Bar chart
              </button>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            {chartKind === 'line' ? (
              <LineChart data={chartSeries}>
                <CartesianGrid strokeDasharray="0" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                  tickFormatter={(v) => `${v / 1000}k`}
                />
                <Tooltip formatter={(value) => formatUsd(value)} />
                <Legend />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#0F766E" strokeWidth={3} dot={{ r: 4 }} />
                <Line
                  type="monotone"
                  dataKey="expense"
                  name="Expense"
                  stroke="#B45309"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            ) : (
              <BarChart data={chartSeries} barGap={4}>
                <CartesianGrid strokeDasharray="0" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                  tickFormatter={(v) => `${v / 1000}k`}
                />
                <Tooltip formatter={(value) => formatUsd(value)} />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#0F766E" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="#D97706" radius={[6, 6, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <DonutCard
            title="Projected income by category"
            data={incomeByCategory}
            centerLabel={formatUsdFull(totals.income)}
            centerSub="total projected"
          />
          <DonutCard
            title="Projected expenses by category"
            data={expenseByCategory}
            centerLabel={formatUsdFull(totals.expense)}
            centerSub="total projected"
          />
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-[#111827] text-[18px] font-bold">Month-by-month forecast</h3>
            <button
              type="button"
              onClick={downloadCsv}
              className="inline-flex items-center gap-2 text-[13px] font-bold text-[#0F766E] hover:underline"
            >
              <HiOutlineArrowDownTray className="h-4 w-4" />
              Download CSV
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
            <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA] text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Projected income</th>
                  <th className="px-4 py-3">Projected expenses</th>
                  <th className="px-4 py-3">Net cash flow</th>
                  <th className="px-4 py-3">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {monthlyForecast.map((row, i) => (
                  <tr key={row.month} className={i % 2 === 1 ? 'bg-[#F9FAFB]/80' : 'bg-white'}>
                    <td className="border-b border-[#F3F4F6] px-4 py-3 font-semibold text-[#111827]">
                      {row.month}
                    </td>
                    <td className="border-b border-[#F3F4F6] px-4 py-3 tabular-nums text-[#111827]">
                      {formatUsdFull(row.income)}
                    </td>
                    <td className="border-b border-[#F3F4F6] px-4 py-3 tabular-nums text-[#111827]">
                      {formatUsdFull(row.expense)}
                    </td>
                    <td className="border-b border-[#F3F4F6] px-4 py-3 font-semibold tabular-nums text-[#0F766E]">
                      {formatUsdFull(row.net)}
                    </td>
                    <td className="border-b border-[#F3F4F6] px-4 py-3">
                      <ConfidenceBadge level={row.confidence} />
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
