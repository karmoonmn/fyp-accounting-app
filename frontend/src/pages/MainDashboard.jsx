import React, { useState, useEffect } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  HiOutlineArrowTrendingUp,
  HiOutlineArrowTrendingDown,
  HiOutlineChartBar,
  HiOutlineCreditCard,
  HiOutlineDocumentText,
  HiOutlinePaperAirplane,
  HiOutlineReceiptPercent,
  HiOutlineSparkles,
  HiOutlineBanknotes,
  HiOutlineExclamationTriangle,
  HiOutlineCalendarDays,
} from 'react-icons/hi2'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import DashboardLayout from '../components/DashboardLayout'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white/95 p-3 shadow-xl backdrop-blur-md">
      <p className="mb-1.5 text-[12px] font-bold text-[#6B7280]">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-[13px]">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="font-medium text-[#374151] capitalize">{entry.dataKey}:</span>
          <span className="font-bold tabular-nums text-[#111827]">
            ${Number(entry.value || 0).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function MainDashboard() {
  const navigate = useNavigate()
  const { idToken: token } = useAuth()

  const [chartData, setChartData] = useState([])
  const [summaryCards, setSummaryCards] = useState([
    { label: 'Total Income', amount: '$0', trend: 'Loading...', trendUp: true, gradient: 'from-emerald-500 to-teal-600', icon: HiOutlineArrowTrendingUp, iconBg: 'bg-emerald-500/10 text-emerald-600' },
    { label: 'Total Expenses', amount: '$0', trend: 'Loading...', trendUp: true, gradient: 'from-rose-500 to-pink-600', icon: HiOutlineArrowTrendingDown, iconBg: 'bg-rose-500/10 text-rose-600' },
    { label: 'Bank Balance', amount: '$0', trend: 'Loading...', trendUp: true, gradient: 'from-blue-500 to-indigo-600', icon: HiOutlineBanknotes, iconBg: 'bg-blue-500/10 text-blue-600' },
    { label: 'Overdue Bills', amount: '0', trend: 'Loading...', trendUp: false, highlight: true, gradient: 'from-amber-500 to-orange-600', icon: HiOutlineExclamationTriangle, iconBg: 'bg-amber-500/10 text-amber-600' },
  ])

  useEffect(() => {
    if (!token) return;
    const loadDashboard = async () => {
      try {
        const forecastRes = await api('/api/reports/forecast', { token })
        
        const mappedChart = forecastRes.historicalData.map(d => ({
          month: d.month,
          revenue: d.revenue,
          expense: d.expenses
        }))
        setChartData(mappedChart)
        
        const lastMonth = forecastRes.historicalData[forecastRes.historicalData.length - 1] || { revenue: 0, expenses: 0 }
        const prevMonth = forecastRes.historicalData[forecastRes.historicalData.length - 2] || { revenue: 0, expenses: 0 }
        
        const calcTrend = (curr, prev) => {
          if (prev === 0) return '+0.0%'
          const pct = ((curr - prev) / prev) * 100
          return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
        }
        
        const incTrend = calcTrend(lastMonth.revenue, prevMonth.revenue)
        const expTrend = calcTrend(lastMonth.expenses, prevMonth.expenses)
        
        const formatMoney = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)

        const dateStr = new Date().toISOString().split('T')[0]
        let bankBalance = 0
        try {
          const bs = await api(`/api/reports/balance-sheet?endDate=${dateStr}`, { token })
          const bankAcc = bs.assets.find(a => a.accountCode.startsWith('10'))
          if (bankAcc) bankBalance = bankAcc.balance
        } catch (e) {}

        let overdueCount = 0
        try {
          const bills = await api('/bill', { token })
          overdueCount = bills.filter(b =>
            b.status === 'OVERDUE' ||
            (b.status !== 'PAID' && b.dueDate && new Date(b.dueDate) < new Date() && (b.balance ?? b.totalAmt) > 0)
          ).length
        } catch (e) {}

        setSummaryCards([
          { label: 'Total Income', amount: formatMoney(lastMonth.revenue), trend: `${incTrend} from last month`, trendUp: !incTrend.startsWith('-'), gradient: 'from-emerald-500 to-teal-600', icon: HiOutlineArrowTrendingUp, iconBg: 'bg-emerald-500/10 text-emerald-600' },
          { label: 'Total Expenses', amount: formatMoney(lastMonth.expenses), trend: `${expTrend} from last month`, trendUp: expTrend.startsWith('-'), gradient: 'from-rose-500 to-pink-600', icon: HiOutlineArrowTrendingDown, iconBg: 'bg-rose-500/10 text-rose-600' },
          { label: 'Bank Balance', amount: formatMoney(bankBalance), trend: 'Current standing', trendUp: true, gradient: 'from-blue-500 to-indigo-600', icon: HiOutlineBanknotes, iconBg: 'bg-blue-500/10 text-blue-600' },
          { label: 'Overdue Bills', amount: String(overdueCount), trend: overdueCount > 0 ? `${overdueCount} bills need attention` : 'All caught up', trendUp: false, highlight: overdueCount > 0, gradient: 'from-amber-500 to-orange-600', icon: HiOutlineExclamationTriangle, iconBg: 'bg-amber-500/10 text-amber-600' },
        ])
      } catch (err) {
        console.error(err)
      }
    }
    loadDashboard()
  }, [token])

  const aiInsights = [
    { title: 'Anomaly Detected', description: 'Unusual expense pattern detected in Marketing category', type: 'alert' },
    { title: 'Spending Analysis', description: 'Your office supplies spending is 23% lower than industry average', type: 'insight' },
    { title: 'Monthly Forecast', description: 'Projected cash flow: $45,200 by month-end', type: 'forecast' },
  ]

  const quickQuestions = ["What's my cash runway?", 'Show Q4 expenses', 'Tax filing checklist']

  const today = new Date()
  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <DashboardLayout activeNav="dashboard">
      <div className="space-y-6" style={{ animation: 'fadeIn 0.4s ease-out' }}>
        {/* Simple Welcome Banner */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <HiOutlineCalendarDays className="h-4 w-4 text-[#6B7280]" />
            <span className="text-[13px] font-medium text-[#6B7280]">
              {today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <h2 className="text-[32px] font-bold tracking-tight text-[#111827]">{greeting} 👋</h2>
          <p className="mt-1 text-[15px] font-medium text-[#6B7280]">Here's what's happening with your finances today.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-5">
          {summaryCards.map((card, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
              style={{ animation: `fadeIn 0.4s ease-out ${index * 0.1}s both` }}
            >
              <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${card.gradient} opacity-[0.06] transition-transform group-hover:scale-125`} />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[13px] font-semibold text-[#6B7280]">{card.label}</span>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBg} transition-transform group-hover:scale-110`}>
                    <card.icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-[32px] font-bold tabular-nums text-[#111827] leading-none">{card.amount}</div>
                <div className={`mt-2 text-[13px] font-semibold ${card.trendUp ? 'text-emerald-600' : card.highlight ? 'text-amber-600' : 'text-[#6B7280]'}`}>
                  {card.trend}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* AI Insights */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-7">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-200/30" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                <HiOutlineSparkles className="w-5 h-5" />
              </div>
              <h2 className="text-[#111827] text-xl font-bold">AI Financial Insights</h2>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-5">
              {aiInsights.map((insight, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-white/80 bg-white/70 p-5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                >
                  <div className="flex items-start gap-3 mb-3">
                    {insight.type === 'alert' && (
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100">
                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                      </div>
                    )}
                    {insight.type === 'insight' && (
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                        <HiOutlineChartBar className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                    )}
                    {insight.type === 'forecast' && (
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100">
                        <HiOutlineArrowTrendingUp className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[#111827] text-[14px] font-bold mb-1">{insight.title}</h3>
                      <p className="text-[#64748B] text-[13px] leading-relaxed">{insight.description}</p>
                    </div>
                  </div>
                  {insight.type === 'alert' && (
                    <button type="button" className="text-emerald-700 text-[13px] font-semibold hover:underline">
                      Review →
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 bg-emerald-700 text-white text-[14px] font-bold px-6 py-3 rounded-xl hover:bg-emerald-800 transition-all shadow-sm active:scale-[0.97]"
            >
              <HiOutlineSparkles className="h-4 w-4" />
              Ask AI Assistant
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <h2 className="text-[#111827] text-lg font-bold mb-5">Quick Actions</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'New Invoice', icon: HiOutlineDocumentText, onClick: () => navigate('/invoice/new'), gradient: 'from-emerald-600 to-teal-600' },
              { label: 'New Bill', icon: HiOutlineReceiptPercent, onClick: () => navigate('/bill/new'), gradient: 'from-rose-600 to-pink-600' },
              { label: 'Record Payment', icon: HiOutlineCreditCard, onClick: () => navigate('/invoice/payment'), gradient: 'from-blue-600 to-indigo-600' },
            ].map((action, i) => (
              <button
                key={i}
                type="button"
                onClick={action.onClick}
                className={`group relative overflow-hidden bg-gradient-to-br ${action.gradient} text-white rounded-xl min-h-[64px] px-6 flex items-center justify-center gap-3 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97]`}
              >
                <div className="absolute inset-0 bg-white/0 transition-colors group-hover:bg-white/10" />
                <action.icon className="w-6 h-6 relative" />
                <span className="text-[15px] font-bold relative">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chart + AI Assistant */}
        <div className="grid grid-cols-[1.5fr_1fr] gap-6">
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-7 shadow-sm">
            <div className="flex items-center justify-between mb-6 gap-3">
              <h2 className="text-[#111827] text-[22px] font-bold">Profit & Loss Overview</h2>
              <div className="flex items-center gap-1 rounded-xl bg-[#F3F4F6] p-1">
                {['3M', '6M', '1Y', 'All'].map((period, index) => (
                  <button
                    type="button"
                    key={period}
                    className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                      index === 1 ? 'bg-white text-emerald-700 shadow-sm' : 'text-[#64748B] hover:text-[#111827]'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0F766E" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#0F766E" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#0F766E" strokeWidth={2.5} fill="url(#revGrad)" dot={{ fill: '#0F766E', r: 4, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }} />
                <Area type="monotone" dataKey="expense" stroke="#F59E0B" strokeWidth={2.5} fill="url(#expGrad)" dot={{ fill: '#F59E0B', r: 4, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }} />
              </AreaChart>
            </ResponsiveContainer>

            <div className="flex items-center justify-center gap-8 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#0F766E]" />
                <span className="text-[#6B7280] text-[13px] font-medium">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                <span className="text-[#6B7280] text-[13px] font-medium">Expense</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <HiOutlineSparkles className="w-4 h-4" />
              </div>
              <h2 className="text-[#111827] text-lg font-bold">AI Accounting Assistant</h2>
            </div>

            <div className="flex flex-col gap-2.5 mb-6">
              {quickQuestions.map((question, index) => (
                <button
                  type="button"
                  key={index}
                  className="bg-[#F3F4F6] text-[#374151] text-[13px] font-medium px-4 py-2.5 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 transition-all text-left"
                >
                  {question}
                </button>
              ))}
            </div>

            <div className="mt-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ask me anything about your finances..."
                  className="w-full h-11 px-4 pr-12 border border-[#E5E7EB] rounded-xl text-[13px] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  className="absolute right-1.5 top-1.5 w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center hover:bg-emerald-700 transition-all active:scale-95"
                >
                  <HiOutlinePaperAirplane className="w-4 h-4 text-white" />
                </button>
              </div>
              <div className="mt-3 text-center">
                <span className="text-[#9CA3AF] text-[11px] font-medium">Powered by AI · Ask about invoices, expenses, forecasts</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
