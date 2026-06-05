import { useState, useEffect } from 'react'
import { api } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { FaPrint, FaDownload } from 'react-icons/fa'
import {
  HiOutlineCalendarDays,
  HiOutlineScale,
} from 'react-icons/hi2'

const formatMoney = (val) => {
  if (val == null) return '$0.00'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
}

const BalanceSheetNode = ({ node, depth = 0 }) => {
  if (node.balance === 0 && (!node.children || node.children.length === 0)) return null;
  const isParent = node.children?.length > 0

  return (
    <div className="text-sm">
      <div 
        className={`flex justify-between py-2.5 border-b border-slate-100 transition-colors duration-200 hover:bg-slate-50 ${
          isParent ? 'font-semibold' : ''
        }`}
        style={{ paddingLeft: `${depth * 1.5 + 1.25}rem`, paddingRight: '1.25rem' }}
      >
        <span className={isParent ? 'text-slate-800' : 'text-slate-600'}>
          {node.accountCode ? `${node.accountCode} — ` : ''}{node.accountName}
        </span>
        <span className={`tabular-nums ${isParent ? 'text-slate-800' : 'text-slate-700'}`}>
          {formatMoney(node.balance)}
        </span>
      </div>
      {node.children?.map(child => (
        <BalanceSheetNode key={child.accountId} node={child} depth={depth + 1} />
      ))}
    </div>
  )
}

export default function BalanceSheetReport() {
  const { idToken: token } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().split('T')[0])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await api(`/api/reports/balance-sheet?asOfDate=${asOfDate}`, { token })
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
  }, [token, asOfDate])

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 px-7 py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-200">
              <HiOutlineScale className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <h2 className="text-[#111827] text-[18px] font-bold">Balance Sheet</h2>
              <p className="text-[13px] text-[#64748B] mt-0.5">Snapshot of balances as of a specific date</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-xl border border-blue-200 px-3 py-2 shadow-sm">
            <HiOutlineCalendarDays className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-slate-500">As of</span>
            <input
              type="date"
              value={asOfDate}
              onChange={e => setAsOfDate(e.target.value)}
              className="text-[13px] text-[#111827] bg-transparent focus:outline-none font-medium"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-7">
        {loading ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="h-4 bg-slate-100 rounded-lg animate-pulse" style={{ width: `${180 + i * 25}px` }} />
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
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            {/* Print/Export Bar */}
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex justify-end gap-1.5">
              <button className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200" title="Print">
                <FaPrint className="w-3.5 h-3.5" />
              </button>
              <button className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200" title="Export">
                <FaDownload className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col md:flex-row">
              {/* ASSETS SIDE */}
              <div className="flex-1 md:border-r border-slate-200 flex flex-col">
                <div className="bg-emerald-50/60 px-5 py-3 font-bold text-emerald-800 border-b border-slate-200 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <div className="w-1.5 h-4 rounded-full bg-emerald-500" />
                  Assets
                </div>
                <div className="flex-1">
                  {data.assets.map(node => <BalanceSheetNode key={node.accountId} node={node} />)}
                </div>
                <div className="flex justify-between px-5 py-4 font-black text-slate-800 border-t-2 border-emerald-300 bg-gradient-to-r from-emerald-50/60 to-emerald-50/30 mt-auto">
                  <span>TOTAL ASSETS</span>
                  <span className="tabular-nums">{formatMoney(data.totalAssets)}</span>
                </div>
              </div>

              {/* LIABILITIES & EQUITY SIDE */}
              <div className="flex-1 flex flex-col">
                {/* Liabilities */}
                <div className="bg-rose-50/60 px-5 py-3 font-bold text-rose-800 border-b border-slate-200 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <div className="w-1.5 h-4 rounded-full bg-rose-500" />
                  Liabilities
                </div>
                <div>
                  {data.liabilities.map(node => <BalanceSheetNode key={node.accountId} node={node} />)}
                </div>
                <div className="flex justify-between px-5 py-3 font-bold text-slate-700 border-t border-slate-200 bg-rose-50/30">
                  <span>Total Liabilities</span>
                  <span className="tabular-nums">{formatMoney(data.totalLiabilities)}</span>
                </div>

                {/* Equity */}
                <div className="bg-blue-50/60 px-5 py-3 font-bold text-blue-800 border-y border-slate-200 flex items-center gap-2 text-sm uppercase tracking-wider mt-1">
                  <div className="w-1.5 h-4 rounded-full bg-blue-500" />
                  Equity
                </div>
                <div>
                  {data.equity.map(node => <BalanceSheetNode key={node.accountId} node={node} />)}
                </div>
                <div className="flex justify-between px-5 py-3 font-bold text-slate-700 border-t border-slate-200 bg-blue-50/30">
                  <span>Total Equity</span>
                  <span className="tabular-nums">{formatMoney(data.totalEquity)}</span>
                </div>

                {/* Total L&E */}
                <div className="flex justify-between px-5 py-4 font-black text-slate-800 border-t-2 border-blue-300 bg-gradient-to-r from-blue-50/60 to-indigo-50/30 mt-auto">
                  <span>TOTAL LIABILITIES & EQUITY</span>
                  <span className="tabular-nums">{formatMoney(data.totalLiabilities + data.totalEquity)}</span>
                </div>
              </div>
            </div>

            {/* Balance Check Footer */}
            {data.totalAssets === (data.totalLiabilities + data.totalEquity) ? (
              <div className="px-5 py-3 bg-emerald-50 border-t border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Balance sheet is in balance — Assets equal Liabilities + Equity
              </div>
            ) : (
              <div className="px-5 py-3 bg-amber-50 border-t border-amber-200 text-amber-700 text-xs font-semibold flex items-center gap-2">
                ⚠️ Imbalance detected — Assets ({formatMoney(data.totalAssets)}) ≠ Liabilities + Equity ({formatMoney(data.totalLiabilities + data.totalEquity)})
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
