import { useState, useEffect } from 'react'
import { api } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { FaPrint, FaDownload } from 'react-icons/fa'

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
    <div className="bg-white rounded-2xl p-7 shadow-sm">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h2 className="text-[#111827] text-[18px] font-bold">Profit & Loss Statement</h2>
          <p className="text-sm text-[#64748B] mt-1">Income and expenses over a selected period</p>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="border border-[#E5E7EB] rounded-xl px-3 py-2 text-[13px] text-[#111827] bg-white focus:outline-none focus:border-[#0F766E]"
          />
          <span className="text-[#9CA3AF]">to</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="border border-[#E5E7EB] rounded-xl px-3 py-2 text-[13px] text-[#111827] bg-white focus:outline-none focus:border-[#0F766E]"
          />
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
          <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
        </div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : data ? (
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Period: {data.period}</span>
            <div className="flex gap-2">
              <button className="text-slate-500 hover:text-blue-600 transition-colors"><FaPrint /></button>
              <button className="text-slate-500 hover:text-blue-600 transition-colors"><FaDownload /></button>
            </div>
          </div>
          
          <div className="p-0">
            {/* Revenue Section */}
            <div className="bg-emerald-50/50 dark:bg-emerald-900/10 px-4 py-2 font-bold text-emerald-800 dark:text-emerald-400 border-b border-slate-200 dark:border-slate-700">
              Operating Revenue
            </div>
            {data.revenueAccounts.map(acc => (
              <div key={acc.accountId} className="flex justify-between px-6 py-2 border-b border-slate-100 dark:border-slate-700/50 text-sm">
                <span className="text-slate-600 dark:text-slate-300">{acc.accountCode} - {acc.accountName}</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{formatMoney(acc.balance)}</span>
              </div>
            ))}
            <div className="flex justify-between px-4 py-3 font-bold text-slate-800 dark:text-slate-200 border-b-2 border-slate-200 dark:border-slate-700">
              <span>Total Revenue</span>
              <span>{formatMoney(data.totalRevenue)}</span>
            </div>

            {/* Expenses Section */}
            <div className="bg-rose-50/50 dark:bg-rose-900/10 px-4 py-2 font-bold text-rose-800 dark:text-rose-400 border-b border-slate-200 dark:border-slate-700 mt-4">
              Operating Expenses
            </div>
            {data.expenseAccounts.map(acc => (
              <div key={acc.accountId} className="flex justify-between px-6 py-2 border-b border-slate-100 dark:border-slate-700/50 text-sm">
                <span className="text-slate-600 dark:text-slate-300">{acc.accountCode} - {acc.accountName}</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{formatMoney(acc.balance)}</span>
              </div>
            ))}
            <div className="flex justify-between px-4 py-3 font-bold text-slate-800 dark:text-slate-200 border-b-2 border-slate-200 dark:border-slate-700">
              <span>Total Expenses</span>
              <span>{formatMoney(data.totalExpenses)}</span>
            </div>

            {/* Net Income */}
            <div className={`flex justify-between px-4 py-4 text-lg font-black mt-6 ${data.netProfit >= 0 ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-900 dark:bg-rose-900/30 dark:text-rose-400'}`}>
              <span>NET PROFIT / (LOSS)</span>
              <span>{formatMoney(data.netProfit)}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
