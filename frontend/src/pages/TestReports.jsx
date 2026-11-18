import React, { useState } from 'react'
import { AuthContext } from '../context/AuthContext'
import ProfitLossReport from '../components/reports/ProfitLossReport'
import BalanceSheetReport from '../components/reports/BalanceSheetReport'
import AgingReport from '../components/reports/AgingReport'
import ExpenseDashboard from '../components/reports/ExpenseDashboard'
import ForecastingDashboard from '../components/reports/ForecastingDashboard'

const mockAuthValue = {
  firebaseUser: { email: 'admin@finflow.ai', uid: 'test-admin-uid' },
  idToken: 'mock-jwt-test-token',
  me: { companyId: 1, companyName: 'FinFlow AI Global', role: 'ADMIN' },
  loading: false,
  signOut: async () => {},
  getFreshToken: async () => 'mock-jwt-test-token',
  resetPassword: async () => {}
}

export default function TestReports() {
  const [activeTab, setActiveTab] = useState('pl')

  return (
    <AuthContext.Provider value={mockAuthValue}>
      <div className="p-8 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-2.5">
          <button
            id="tab-pl"
            type="button"
            onClick={() => setActiveTab('pl')}
            className={`px-4 py-2 font-bold text-sm rounded-xl transition-all ${
              activeTab === 'pl' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Profit & Loss
          </button>
          <button
            id="tab-bs"
            type="button"
            onClick={() => setActiveTab('bs')}
            className={`px-4 py-2 font-bold text-sm rounded-xl transition-all ${
              activeTab === 'bs' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Balance Sheet
          </button>
          <button
            id="tab-ar"
            type="button"
            onClick={() => setActiveTab('ar')}
            className={`px-4 py-2 font-bold text-sm rounded-xl transition-all ${
              activeTab === 'ar' ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            A/R Aging
          </button>
          <button
            id="tab-ap"
            type="button"
            onClick={() => setActiveTab('ap')}
            className={`px-4 py-2 font-bold text-sm rounded-xl transition-all ${
              activeTab === 'ap' ? 'bg-rose-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            A/P Aging
          </button>
          <button
            id="tab-exp"
            type="button"
            onClick={() => setActiveTab('exp')}
            className={`px-4 py-2 font-bold text-sm rounded-xl transition-all ${
              activeTab === 'exp' ? 'bg-violet-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Expense Analysis
          </button>
          <button
            id="tab-forecast"
            type="button"
            onClick={() => setActiveTab('forecast')}
            className={`px-4 py-2 font-bold text-sm rounded-xl transition-all ${
              activeTab === 'forecast' ? 'bg-cyan-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Forecasting
          </button>
        </div>

        <div id="report-view-container">
          {activeTab === 'pl' && <ProfitLossReport />}
          {activeTab === 'bs' && <BalanceSheetReport />}
          {activeTab === 'ar' && <AgingReport type="AR" />}
          {activeTab === 'ap' && <AgingReport type="AP" />}
          {activeTab === 'exp' && <ExpenseDashboard />}
          {activeTab === 'forecast' && <ForecastingDashboard />}
        </div>
      </div>
    </AuthContext.Provider>
  )
}
