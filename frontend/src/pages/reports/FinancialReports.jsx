import { useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import ProfitLossReport from '../../components/reports/ProfitLossReport'
import BalanceSheetReport from '../../components/reports/BalanceSheetReport'
import AgingReport from '../../components/reports/AgingReport'
import ExpenseDashboard from '../../components/reports/ExpenseDashboard'
import ForecastingDashboard from '../../components/reports/ForecastingDashboard'
import {
  HiOutlineChartBar,
  HiOutlineBanknotes,
  HiOutlineClock,
  HiOutlineReceiptPercent,
  HiOutlinePresentationChartLine,
  HiOutlineArrowTrendingUp,
} from 'react-icons/hi2'

export default function FinancialReports() {
  const [activeTab, setActiveTab] = useState('pl')

  const tabs = [
    { id: 'pl', label: 'Profit & Loss', icon: HiOutlineChartBar, color: 'from-emerald-500 to-teal-600' },
    { id: 'bs', label: 'Balance Sheet', icon: HiOutlineBanknotes, color: 'from-blue-500 to-indigo-600' },
    { id: 'ar', label: 'A/R Aging', icon: HiOutlineClock, color: 'from-amber-500 to-orange-600' },
    { id: 'ap', label: 'A/P Aging', icon: HiOutlineReceiptPercent, color: 'from-rose-500 to-pink-600' },
    { id: 'exp', label: 'Expense Analysis', icon: HiOutlinePresentationChartLine, color: 'from-violet-500 to-purple-600' },
    { id: 'forecast', label: 'Forecasting', icon: HiOutlineArrowTrendingUp, color: 'from-cyan-500 to-blue-600' },
  ]

  const activeTabData = tabs.find(t => t.id === activeTab)

  return (
    <DashboardLayout activeNav="reports">
      <div className="space-y-6">
        {/* Header with gradient accent */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F766E] to-[#0E4F4A] p-8 shadow-lg">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10">
            <h2 className="text-white text-[28px] font-bold tracking-tight">Financial Reports</h2>
            <p className="mt-2 text-[15px] font-medium text-white/70">
              Comprehensive financial statements and predictive analytics for your business.
            </p>
          </div>
        </div>

        {/* Tab Navigation — pill style with icons */}
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 overflow-x-auto">
          <nav className="flex gap-1.5" aria-label="Report tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    group relative flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl whitespace-nowrap
                    transition-all duration-300 ease-out
                    ${isActive
                      ? `bg-gradient-to-r ${tab.color} text-white shadow-md shadow-black/10`
                      : 'text-[#64748B] hover:text-[#111827] hover:bg-[#F3F4F6]'
                    }
                  `}
                >
                  <Icon className={`w-4.5 h-4.5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                  {tab.label}
                  {isActive && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-white/60" />
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Report Content — with smooth transition */}
        <div
          className="pt-1 transition-opacity duration-300 ease-in-out animate-[fadeIn_0.3s_ease-out]"
          key={activeTab}
        >
          {activeTab === 'pl' && <ProfitLossReport />}
          {activeTab === 'bs' && <BalanceSheetReport />}
          {activeTab === 'ar' && <AgingReport type="AR" />}
          {activeTab === 'ap' && <AgingReport type="AP" />}
          {activeTab === 'exp' && <ExpenseDashboard />}
          {activeTab === 'forecast' && <ForecastingDashboard />}
        </div>
      </div>
    </DashboardLayout>
  )
}
