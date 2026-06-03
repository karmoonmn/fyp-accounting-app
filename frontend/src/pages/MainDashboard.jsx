import React, { useState, useEffect } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  HiOutlineArrowTrendingUp,
  HiOutlineChartBar,
  HiOutlineCreditCard,
  HiOutlineDocumentText,
  HiOutlinePaperAirplane,
  HiOutlineReceiptPercent,
  HiOutlineSparkles,
} from 'react-icons/hi2'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import DashboardLayout from '../components/DashboardLayout'

export default function MainDashboard() {
  const navigate = useNavigate()
  const { idToken: token } = useAuth()

  const [chartData, setChartData] = useState([])
  const [summaryCards, setSummaryCards] = useState([
    { label: 'Total Income', amount: '$0', trend: 'Loading...', trendUp: true },
    { label: 'Total Expenses', amount: '$0', trend: 'Loading...', trendUp: true },
    { label: 'Bank Balance', amount: '$0', trend: 'Loading...', trendUp: true },
    { label: 'Overdue Bills', amount: '0', trend: 'Loading...', trendUp: false, highlight: true },
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
          const bills = await api('/api/bills', { token })
          overdueCount = bills.filter(b => b.status === 'OVERDUE' || (b.status === 'UNPAID' && new Date(b.dueDate) < new Date())).length
        } catch (e) {}

        setSummaryCards([
          { label: 'Total Income', amount: formatMoney(lastMonth.revenue), trend: `${incTrend} from last month`, trendUp: !incTrend.startsWith('-') },
          { label: 'Total Expenses', amount: formatMoney(lastMonth.expenses), trend: `${expTrend} from last month`, trendUp: expTrend.startsWith('-') }, // For expenses, down is positive visually but let's keep green for up for now, actually down is better so trendUp true if negative
          { label: 'Bank Balance', amount: formatMoney(bankBalance), trend: 'Current standing', trendUp: true },
          { label: 'Overdue Bills', amount: String(overdueCount), trend: overdueCount > 0 ? `${overdueCount} bills need attention` : 'All caught up', trendUp: false, highlight: overdueCount > 0 },
        ])
      } catch (err) {
        console.error(err)
      }
    }
    loadDashboard()
  }, [token])

  const aiInsights = [
    {
      title: 'Anomaly Detected',
      description: 'Unusual expense pattern detected in Marketing category',
      type: 'alert',
    },
    {
      title: 'Spending Analysis',
      description: 'Your office supplies spending is 23% lower than industry average',
      type: 'insight',
    },
    {
      title: 'Monthly Forecast',
      description: 'Projected cash flow: $45,200 by month-end',
      type: 'forecast',
    },
  ]

  const quickQuestions = ["What's my cash runway?", 'Show Q4 expenses', 'Tax filing checklist']

  return (
    <DashboardLayout activeNav="dashboard">
      <div className="grid grid-cols-4 gap-5 mb-8">
        {summaryCards.map((card, index) => (
          <div
            key={index}
            className={`bg-white rounded-2xl p-6 min-h-[140px] flex flex-col justify-between shadow-sm ${
              card.highlight ? 'border-l-[3px] border-[#F59E0B]' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#111827] text-sm font-medium">{card.label}</span>
              {card.trendUp ? (
                <HiOutlineArrowTrendingUp className="w-5 h-5 text-[#F59E0B]" />
              ) : (
                <HiOutlineArrowTrendingUp className="w-5 h-5 text-[#EF4444]" />
              )}
            </div>
            <div className="text-[#111827] text-4xl font-bold mb-2">{card.amount}</div>
            <div className="text-[#0F766E] text-[13px] font-semibold">{card.trend}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#CCFBF1] rounded-2xl p-7 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <HiOutlineSparkles className="w-6 h-6 text-[#0F766E]" />
          <h2 className="text-[#0F766E] text-xl font-bold">AI Financial Insights</h2>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-5">
          {aiInsights.map((insight, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-5 min-h-[100px] flex flex-col justify-between"
            >
              <div className="flex items-start gap-2 mb-3">
                {insight.type === 'alert' && (
                  <div className="w-2 h-2 rounded-full bg-[#F59E0B] mt-1"></div>
                )}
                {insight.type === 'insight' && (
                  <HiOutlineChartBar className="w-5 h-5 text-[#0F766E]" />
                )}
                {insight.type === 'forecast' && (
                  <HiOutlineArrowTrendingUp className="w-5 h-5 text-[#0F766E]" />
                )}
                <div className="flex-1">
                  <h3 className="text-[#111827] text-sm font-semibold mb-1">{insight.title}</h3>
                  <p className="text-[#64748B] text-sm leading-relaxed">{insight.description}</p>
                </div>
              </div>
              {insight.type === 'alert' && (
                <button
                  type="button"
                  className="text-[#0F766E] text-sm font-semibold hover:underline text-left"
                >
                  Review →
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          className="bg-[#0F766E] text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-[#0F766E]/90 transition-all min-h-[40px]"
        >
          Ask AI Assistant
        </button>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm mb-8">
        <h2 className="text-[#111827] text-lg font-bold mb-5">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => navigate('/invoice/new')}
            className="bg-[#0F766E] text-white rounded-xl min-h-[56px] px-6 flex items-center justify-center gap-3 hover:bg-[#0F766E]/90 transition-all"
          >
            <HiOutlineDocumentText className="w-6 h-6" />
            <span className="text-base font-bold">New Invoice</span>
          </button>
          <button
            type="button"
            className="bg-white border-2 border-[#0F766E] text-[#0F766E] rounded-xl min-h-[56px] px-6 flex items-center justify-center gap-3 hover:bg-[#0F766E]/5 transition-all"
          >
            <HiOutlineReceiptPercent className="w-6 h-6" />
            <span className="text-base font-bold">New Bill</span>
          </button>
          <button
            type="button"
            className="bg-white border-2 border-[#0F766E] text-[#0F766E] rounded-xl min-h-[56px] px-6 flex items-center justify-center gap-3 hover:bg-[#0F766E]/5 transition-all"
          >
            <HiOutlineCreditCard className="w-6 h-6" />
            <span className="text-base font-bold">Record Payment</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[1.5fr_1fr] gap-6">
        <div className="bg-white rounded-2xl p-7 shadow-sm">
          <div className="flex items-center justify-between mb-6 gap-3">
            <h2 className="text-[#111827] text-[22px] font-bold">Profit & Loss Overview</h2>
            <div className="flex items-center gap-2">
              {['3M', '6M', '1Y', 'All'].map((period, index) => (
                <button
                  type="button"
                  key={period}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    index === 1 ? 'bg-[#CCFBF1] text-[#0F766E]' : 'text-[#64748B] hover:bg-[#F1F5F9]'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0F766E" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#0F766E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="0" stroke="#FAFAFA" vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#111827', fontSize: 13 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#111827', fontSize: 13 }}
                tickFormatter={(value) => `${value / 1000}k`}
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#0F766E"
                strokeWidth={3}
                dot={{ fill: '#0F766E', r: 4 }}
                fill="url(#revenueGradient)"
              />
              <Line
                type="monotone"
                dataKey="expense"
                stroke="#F59E0B"
                strokeWidth={3}
                dot={{ fill: '#F59E0B', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>

          <div className="flex items-center justify-center gap-8 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#0F766E]"></div>
              <span className="text-[#64748B] text-[13px] font-medium">Revenue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#F59E0B]"></div>
              <span className="text-[#64748B] text-[13px] font-medium">Expense</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <HiOutlineSparkles className="w-5 h-5 text-[#0F766E]" />
            <h2 className="text-[#111827] text-lg font-bold">AI Accounting Assistant</h2>
          </div>

          <div className="flex flex-col gap-3 mb-6">
            {quickQuestions.map((question, index) => (
              <button
                type="button"
                key={index}
                className="bg-[#CCFBF1] text-[#111827] text-[13px] px-4 py-2 rounded-[20px] min-h-[32px] hover:bg-[#CCFBF1]/70 transition-all text-left"
              >
                {question}
              </button>
            ))}
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Ask me anything about your finances..."
              className="w-full h-11 px-4 pr-12 border border-[#E5E7EB] rounded-xl text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#0F766E]"
            />
            <button
              type="button"
              className="absolute right-1 top-1 w-9 h-9 bg-[#0F766E] rounded-lg flex items-center justify-center hover:bg-[#0F766E]/90 transition-all"
            >
              <HiOutlinePaperAirplane className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="mt-4 text-center">
            <span className="text-[#9CA3AF] text-[11px]">Powered by AI</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
