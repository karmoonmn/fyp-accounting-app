import { useState, useEffect } from 'react'
import { api } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { FaPrint, FaDownload } from 'react-icons/fa'

const formatMoney = (val) => {
  if (val == null) return '$0.00'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
}

const BalanceSheetNode = ({ node, depth = 0 }) => {
  if (node.balance === 0 && (!node.children || node.children.length === 0)) return null;

  return (
    <div className="text-sm">
      <div 
        className={`flex justify-between py-2 border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/20`}
        style={{ paddingLeft: `${depth * 1.5 + 1}rem`, paddingRight: '1rem' }}
      >
        <span className={`${node.children?.length > 0 ? 'font-semibold text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>
          {node.accountCode ? `${node.accountCode} - ` : ''}{node.accountName}
        </span>
        <span className={`${node.children?.length > 0 ? 'font-semibold text-slate-800 dark:text-slate-200' : 'text-slate-800 dark:text-slate-300'}`}>
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
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Balance Sheet</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Snapshot of balances as of a specific date</p>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <label className="text-sm text-slate-500 font-medium">As of:</label>
          <input
            type="date"
            value={asOfDate}
            onChange={e => setAsOfDate(e.target.value)}
            className="border border-slate-300 dark:border-slate-600 rounded px-3 py-1.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-200"
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
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden flex flex-col md:flex-row">
          
          {/* ASSETS SIDE */}
          <div className="flex-1 border-r border-slate-200 dark:border-slate-700">
            <div className="bg-emerald-50/50 dark:bg-emerald-900/10 px-4 py-3 font-bold text-emerald-800 dark:text-emerald-400 border-b border-slate-200 dark:border-slate-700 text-lg">
              ASSETS
            </div>
            <div className="p-0">
              {data.assets.map(node => <BalanceSheetNode key={node.accountId} node={node} />)}
            </div>
            <div className="flex justify-between px-4 py-4 font-black text-slate-800 dark:text-slate-200 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 mt-auto">
              <span>TOTAL ASSETS</span>
              <span>{formatMoney(data.totalAssets)}</span>
            </div>
          </div>

          {/* LIABILITIES & EQUITY SIDE */}
          <div className="flex-1 flex flex-col">
            <div className="bg-rose-50/50 dark:bg-rose-900/10 px-4 py-3 font-bold text-rose-800 dark:text-rose-400 border-b border-slate-200 dark:border-slate-700 text-lg">
              LIABILITIES
            </div>
            <div className="p-0">
              {data.liabilities.map(node => <BalanceSheetNode key={node.accountId} node={node} />)}
            </div>
            <div className="flex justify-between px-4 py-3 font-bold text-slate-700 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
              <span>Total Liabilities</span>
              <span>{formatMoney(data.totalLiabilities)}</span>
            </div>

            <div className="bg-blue-50/50 dark:bg-blue-900/10 px-4 py-3 font-bold text-blue-800 dark:text-blue-400 border-y border-slate-200 dark:border-slate-700 text-lg mt-4">
              EQUITY
            </div>
            <div className="p-0">
              {data.equity.map(node => <BalanceSheetNode key={node.accountId} node={node} />)}
            </div>
            <div className="flex justify-between px-4 py-3 font-bold text-slate-700 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
              <span>Total Equity</span>
              <span>{formatMoney(data.totalEquity)}</span>
            </div>

            <div className="flex justify-between px-4 py-4 font-black text-slate-800 dark:text-slate-200 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 mt-auto">
              <span>TOTAL LIABILITIES & EQUITY</span>
              <span>{formatMoney(data.totalLiabilities + data.totalEquity)}</span>
            </div>
          </div>
          
        </div>
      ) : null}
    </div>
  )
}
