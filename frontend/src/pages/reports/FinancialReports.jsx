import { useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import ProfitLossReport from '../../components/reports/ProfitLossReport'
import BalanceSheetReport from '../../components/reports/BalanceSheetReport'
import AgingReport from '../../components/reports/AgingReport'
import ExpenseDashboard from '../../components/reports/ExpenseDashboard'
import ForecastingDashboard from '../../components/reports/ForecastingDashboard'

export default function FinancialReports() {
  const [activeTab, setActiveTab] = useState('pl')

  const tabs = [
    { id: 'pl', label: 'Profit & Loss' },
    { id: 'bs', label: 'Balance Sheet' },
    { id: 'ar', label: 'A/R Aging' },
    { id: 'ap', label: 'A/P Aging' },
    { id: 'exp', label: 'Expense Analysis' },
    { id: 'forecast', label: 'Forecasting' },
  ]

  return (
    <DashboardLayout activeNav="reports">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-[#111827] text-[28px] font-bold tracking-tight">Financial Reports</h2>
            <p className="mt-1 text-[15px] font-medium text-[#64748B]">Comprehensive financial statements and predictive analytics.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm overflow-x-auto">
          <nav className="flex space-x-2" aria-label="Tabs">
            {[
              { id: 'pl', label: 'Profit & Loss' },
              { id: 'bs', label: 'Balance Sheet' },
              { id: 'ar', label: 'A/R Aging' },
              { id: 'ap', label: 'A/P Aging' },
              { id: 'exp', label: 'Expense Analysis' },
              { id: 'forecast', label: 'Forecasting' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 text-sm font-bold rounded-xl whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#0F766E] text-white shadow-sm'
                    : 'text-[#64748B] hover:text-[#111827] hover:bg-[#F3F4F6]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="pt-2">
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
