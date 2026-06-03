import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  HiOutlineBars3,
  HiOutlineBell,
  HiOutlineChartBar,
  HiOutlineChevronDown,
  HiOutlineCog6Tooth,
  HiOutlineCreditCard,
  HiOutlineDocumentText,
  HiOutlineHome,
  HiOutlinePresentationChartLine,
  HiOutlineQuestionMarkCircle,
  HiOutlineReceiptPercent,
  HiOutlineSparkles,
  HiOutlineUsers,
  HiOutlineBookOpen,
} from 'react-icons/hi2'
import { useAuth } from '../context/AuthContext'
import FloatingAiChat from './FloatingAiChat'
import GlobalTransactionSearch from './GlobalTransactionSearch'

/**
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {'dashboard' | 'analytics' | 'invoices' | 'bills' | 'reports' | 'bank' | 'quick'} [props.activeNav]
 */
export default function DashboardLayout({ children, activeNav = 'dashboard' }) {
  const navigate = useNavigate()
  const { firebaseUser, loading, me, meError, signOut } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)

  const [expandedNav, setExpandedNav] = React.useState({ invoices: true })

  const navItems = [
    { key: 'dashboard', icon: HiOutlineHome, label: 'Dashboard', onClick: () => navigate('/') },
    {
      key: 'analytics',
      icon: HiOutlinePresentationChartLine,
      label: 'Analytics',
      onClick: () => navigate('/analytics'),
    },
    { 
      key: 'bills', 
      icon: HiOutlineReceiptPercent, 
      label: 'Bills', 
      onClick: () => {
        navigate('/bills')
        setExpandedNav(prev => ({ ...prev, bills: true }))
      },
      subItems: [
        { key: 'suppliers', label: 'Suppliers', onClick: () => navigate('/suppliers') },
      ]
    },
    { 
      key: 'invoices', 
      icon: HiOutlineDocumentText, 
      label: 'Invoices', 
      onClick: () => {
        navigate('/invoices')
        setExpandedNav(prev => ({ ...prev, invoices: true }))
      },
      subItems: [
        { key: 'customers', label: 'Customers', onClick: () => navigate('/customers') },
        { key: 'payments', label: 'Payments', onClick: () => navigate('/payments') },
      ]
    },
    { key: 'reports', icon: HiOutlineChartBar, label: 'Reports', onClick: () => navigate('/reports') },
    { key: 'bank', icon: HiOutlineCreditCard, label: 'Bank Account', onClick: () => navigate('/bank') },
    { key: 'accounts', icon: HiOutlineBookOpen, label: 'Chart of Accounts', onClick: () => navigate('/accounts') },
    { key: 'quick', icon: HiOutlineSparkles, label: 'Quick Action', onClick: () => navigate('/quick') },
  ]

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <p className="text-[#6B7280] text-sm font-medium">Loading session…</p>
      </div>
    )
  }

  if (!firebaseUser) {
    navigate('/login', { replace: true })
    return null
  }

  const companyTitle = me?.companyId ? `Company #${me.companyId}` : 'Company'
  const userName = me?.userId ? `User #${me.userId}` : 'User'
  const userEmail = firebaseUser.email || '—'

  return (
    <div className="w-full h-screen min-w-[1200px] flex bg-[#F9FAFB] overflow-hidden">
      <div
        className="h-full bg-white flex flex-col transition-all duration-300 shadow-[0px_2px_8px_rgba(0,0,0,0.08)] z-10 shrink-0"
        style={{ width: sidebarCollapsed ? '88px' : '280px' }}
      >
        {!sidebarCollapsed ? (
          <div className="px-5 py-6">
            <div className="bg-[#F3F4F6] rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-[#E5E7EB] transition-all">
              <div className="w-10 h-10 rounded-full bg-[#9CA3AF] flex items-center justify-center shrink-0">
                <span className="text-white text-sm font-semibold">
                  {(companyTitle[0] || 'C').toUpperCase()}
                </span>
              </div>
              <span className="text-[#111827] text-[15px] font-semibold flex-1">{companyTitle}</span>
              <HiOutlineChevronDown className="w-4 h-4 text-[#6B7280]" />
            </div>
            {meError ? (
              <p className="mt-3 text-xs font-medium text-[#B91C1C]">
                Backend profile not linked yet: {meError}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="px-6 py-6 flex justify-center">
            <div className="w-10 h-10 rounded-full bg-[#9CA3AF] flex items-center justify-center cursor-pointer">
              <span className="text-white text-base font-semibold">
                {(companyTitle[0] || 'C').toUpperCase()}
              </span>
            </div>
          </div>
        )}

        <nav className="flex-1 px-4 py-2 overflow-y-auto">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <div key={item.key} className="relative group">
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={item.onClick}
                    className={`w-full flex items-center gap-3 rounded-lg cursor-pointer transition-all ${
                      sidebarCollapsed ? 'justify-center min-h-[48px]' : 'px-5 py-3'
                    } ${
                      item.key === activeNav
                        ? 'bg-[#CCFBF1]'
                        : 'hover:bg-[#F9FAFB]'
                    }`}
                  >
                    <item.icon
                      className={`w-5 h-5 ${item.key === activeNav ? 'text-[#0F766E]' : 'text-[#111827]'}`}
                    />
                    {!sidebarCollapsed && (
                      <>
                        <span
                          className={`text-[15px] font-semibold flex-1 text-left ${
                            item.key === activeNav ? 'text-[#0F766E]' : 'text-[#111827]'
                          }`}
                        >
                          {item.label}
                        </span>
                        {item.subItems && (
                          <HiOutlineChevronDown
                            className={`w-4 h-4 text-[#6B7280] transition-transform ${
                              expandedNav[item.key] ? 'rotate-180' : ''
                            }`}
                          />
                        )}
                      </>
                    )}
                  </button>
                  {item.subItems && expandedNav[item.key] && !sidebarCollapsed && (
                    <div className="flex flex-col ml-9 mt-1 gap-1">
                      {item.subItems.map(sub => (
                        <button
                          key={sub.key}
                          type="button"
                          onClick={sub.onClick}
                          className={`text-left w-full px-3 py-2 text-[14px] font-medium rounded-lg transition-all ${
                            sub.key === activeNav
                              ? 'text-[#0F766E] bg-[#CCFBF1]/50'
                              : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB]'
                          }`}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-[#374151] text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                    {item.label}
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>

        <div className="px-4 py-4 border-t border-[#E5E7EB]">
          <div className="flex flex-col gap-1">
            {[
              { icon: HiOutlineCog6Tooth, label: 'Settings', onClick: () => {} },
              { icon: HiOutlineQuestionMarkCircle, label: 'Support', onClick: () => {} },
            ].map((item, index) => (
              <div key={index} className="relative group">
                <button
                  type="button"
                  onClick={item.onClick}
                  className={`w-full flex items-center gap-3 rounded-lg cursor-pointer hover:bg-[#F9FAFB] transition-all ${
                    sidebarCollapsed ? 'justify-center min-h-[48px]' : 'px-5 py-3'
                  }`}
                >
                  <item.icon className="w-5 h-5 text-[#111827]" />
                  {!sidebarCollapsed && (
                    <span className="text-[15px] font-medium text-[#111827] text-left">{item.label}</span>
                  )}
                </button>
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-[#374151] text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                    {item.label}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {!sidebarCollapsed ? (
          <div className="px-5 py-5 border-t border-[#E5E7EB]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-full bg-[#E5E7EB] flex items-center justify-center shrink-0">
                  <span className="text-[#111827] text-sm font-semibold">
                    {(userName[0] || 'U').toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[#111827] text-[15px] font-semibold truncate">{userName}</span>
                  <span className="text-[#6B7280] text-[13px] font-medium truncate">{userEmail}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-sm font-semibold text-[#0F766E] hover:underline"
              >
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 py-5 border-t border-[#E5E7EB] flex justify-center">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-10 h-10 rounded-full bg-[#E5E7EB] flex items-center justify-center cursor-pointer"
              title="Sign out"
            >
              <span className="text-[#111827] text-sm font-semibold">U</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col h-full min-w-0 bg-[#F9FAFB]">
        <header className="min-h-[72px] bg-white flex items-center justify-between px-6 shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 hover:bg-[#F9FAFB] rounded-lg transition-all"
              type="button"
            >
              <HiOutlineBars3 className="w-6 h-6 text-[#111827]" />
            </button>
            <h1 className="text-[#111827] text-[28px] font-bold truncate">{companyTitle}</h1>
          </div>
          <div className="flex flex-1 justify-center px-6">
            <GlobalTransactionSearch />
          </div>
          <div className="flex items-center gap-4">
            <HiOutlineBell className="w-6 h-6 text-[#111827] cursor-pointer" />
            <HiOutlineChevronDown className="w-5 h-5 text-[#111827] cursor-pointer" />
          </div>
        </header>

        <main className="flex-1 p-6 min-w-0 overflow-y-auto">{children}</main>
      </div>

      <FloatingAiChat />
    </div>
  )
}
