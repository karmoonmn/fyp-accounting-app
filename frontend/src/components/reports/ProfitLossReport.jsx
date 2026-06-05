import { useState, useEffect } from 'react'
import { api } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { FaPrint, FaDownload } from 'react-icons/fa'
import {
  HiOutlineArrowTrendingUp,
  HiOutlineArrowTrendingDown,
  HiOutlineCalendarDays,
  HiOutlineBanknotes,
} from 'react-icons/hi2'

export default function ProfitLossReport() {
  const { idToken: token } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setMonth(0, 1)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await api(`/api/reports/profit-loss?startDate=${startDate}&endDate=${endDate}`, { token })
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
  }, [token, startDate, endDate])

  const formatMoney = (val) => {
    if (val == null) return '$0.00'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 px-7 py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-200">
              <HiOutlineBanknotes className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <h2 className="text-[#111827] text-[18px] font-bold">Profit & Loss Statement</h2>
              <p className="text-[13px] text-[#64748B] mt-0.5">Income and expenses over a selected period</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white rounded-xl border border-emerald-200 px-3 py-2 shadow-sm">
              <HiOutlineCalendarDays className="w-4 h-4 text-[#0F766E]" />
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="text-[13px] text-[#111827] bg-transparent focus:outline-none font-medium"
              />
              <span className="text-[#9CA3AF] text-xs font-semibold">→</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="text-[13px] text-[#111827] bg-transparent focus:outline-none font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-7">
        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="h-4 bg-slate-100 rounded-lg animate-pulse" style={{ width: `${200 + i * 30}px` }} />
                <div className="h-4 bg-slate-100 rounded-lg animate-pulse w-20" />
              </div>
            ))}
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
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/60 p-5">
                <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-200/30 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                  <div className="flex items-center gap-2 text-emerald-700 mb-2">
                    <HiOutlineArrowTrendingUp className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Total Revenue</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-800">{formatMoney(data.totalRevenue)}</div>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-50 to-rose-100/50 border border-rose-200/60 p-5">
                <div className="absolute top-0 right-0 w-20 h-20 bg-rose-200/30 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                  <div className="flex items-center gap-2 text-rose-700 mb-2">
                    <HiOutlineArrowTrendingDown className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Total Expenses</span>
                  </div>
                  <div className="text-2xl font-black text-rose-800">{formatMoney(data.totalExpenses)}</div>
                </div>
              </div>
              <div className={`relative overflow-hidden rounded-xl p-5 border ${
                data.netProfit >= 0 
                  ? 'bg-gradient-to-br from-teal-50 to-cyan-100/50 border-teal-200/60'
                  : 'bg-gradient-to-br from-orange-50 to-red-100/50 border-orange-200/60'
              }`}>
                <div className={`absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-1/2 translate-x-1/2 ${
                  data.netProfit >= 0 ? 'bg-teal-200/30' : 'bg-orange-200/30'
                }`} />
                <div className="relative">
                  <div className={`flex items-center gap-2 mb-2 ${data.netProfit >= 0 ? 'text-teal-700' : 'text-orange-700'}`}>
                    <HiOutlineBanknotes className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Net Profit</span>
                  </div>
                  <div className={`text-2xl font-black ${data.netProfit >= 0 ? 'text-teal-800' : 'text-orange-800'}`}>
                    {formatMoney(data.netProfit)}
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Statement */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              {/* Period Header */}
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <span className="font-semibold text-slate-600 text-sm">Period: {data.period}</span>
                <div className="flex gap-1.5">
                  <button className="p-2 rounded-lg text-slate-400 hover:text-[#0F766E] hover:bg-emerald-50 transition-all duration-200" title="Print">
                    <FaPrint className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-2 rounded-lg text-slate-400 hover:text-[#0F766E] hover:bg-emerald-50 transition-all duration-200" title="Export">
                    <FaDownload className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Revenue Section */}
              <div className="bg-emerald-50/60 px-5 py-2.5 font-bold text-emerald-800 border-b border-slate-200 flex items-center gap-2 text-[13px] uppercase tracking-wider">
                <div className="w-1.5 h-4 rounded-full bg-emerald-500" />
                Operating Revenue
              </div>
              {data.revenueAccounts.map((acc, i) => (
                <div
                  key={acc.accountId}
                  className={`flex justify-between px-5 py-2.5 border-b border-slate-100 text-sm transition-colors duration-200 hover:bg-emerald-50/30 ${
                    i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                  }`}
                >
                  <span className="text-slate-600 font-medium">{acc.accountCode} — {acc.accountName}</span>
                  <span className="font-semibold text-slate-800 tabular-nums">{formatMoney(acc.balance)}</span>
                </div>
              ))}
              <div className="flex justify-between px-5 py-3 font-bold text-slate-800 border-b-2 border-emerald-200 bg-emerald-50/30">
                <span>Total Revenue</span>
                <span className="tabular-nums">{formatMoney(data.totalRevenue)}</span>
              </div>

              {/* Expenses Section */}
              <div className="bg-rose-50/60 px-5 py-2.5 font-bold text-rose-800 border-b border-slate-200 flex items-center gap-2 text-[13px] uppercase tracking-wider mt-1">
                <div className="w-1.5 h-4 rounded-full bg-rose-500" />
                Operating Expenses
              </div>
              {data.expenseAccounts.map((acc, i) => (
                <div
                  key={acc.accountId}
                  className={`flex justify-between px-5 py-2.5 border-b border-slate-100 text-sm transition-colors duration-200 hover:bg-rose-50/30 ${
                    i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                  }`}
                >
                  <span className="text-slate-600 font-medium">{acc.accountCode} — {acc.accountName}</span>
                  <span className="font-semibold text-slate-800 tabular-nums">{formatMoney(acc.balance)}</span>
                </div>
              ))}
              <div className="flex justify-between px-5 py-3 font-bold text-slate-800 border-b-2 border-rose-200 bg-rose-50/30">
                <span>Total Expenses</span>
                <span className="tabular-nums">{formatMoney(data.totalExpenses)}</span>
              </div>

              {/* Net Income */}
              <div className={`flex justify-between items-center px-5 py-5 text-lg font-black ${
                data.netProfit >= 0
                  ? 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-900 border-t-2 border-emerald-300'
                  : 'bg-gradient-to-r from-rose-50 to-orange-50 text-rose-900 border-t-2 border-rose-300'
              }`}>
                <span className="flex items-center gap-2">
                  {data.netProfit >= 0 ? (
                    <HiOutlineArrowTrendingUp className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <HiOutlineArrowTrendingDown className="w-5 h-5 text-rose-600" />
                  )}
                  NET PROFIT / (LOSS)
                </span>
                <span className="tabular-nums">{formatMoney(data.netProfit)}</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
