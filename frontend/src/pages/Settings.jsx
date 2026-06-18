import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import DashboardLayout from '../components/DashboardLayout'
import { updatePassword } from 'firebase/auth'
import { auth } from '../firebase'
import {
  HiOutlineUser,
  HiOutlineBuildingOffice,
  HiOutlineUsers,
  HiOutlineTrash,
  HiOutlineKey,
  HiOutlineCheck,
  HiOutlinePlus,
  HiOutlineArrowPath,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineUserGroup,
  HiOutlinePencil,
  HiOutlineXMark,
  HiOutlineShieldCheck, HiOutlineMagnifyingGlass
} from 'react-icons/hi2'
import QuickCreateCustomerModal from '../components/QuickCreateCustomerModal'
import QuickCreateSupplierModal from '../components/QuickCreateSupplierModal'

export default function Settings() {
  const navigate = useNavigate()
  const location = useLocation()
  const { me, meError, getFreshToken, refreshMe } = useAuth()
  
  // Tab states: 'account' | 'company' | 'users' | 'contacts'
  const [activeTab, setActiveTab] = useState('account')
  
  // Load States
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Data States
  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    addr: '',
    role: 'STAFF'
  })
  
  const [companyProfile, setCompanyProfile] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    addr: '',
    registrationNumber: '',
    currency: 'USD',
    fiscalYearStart: 'January'
  })
  
  const [usersList, setUsersList] = useState([])
  const [customers, setCustomers] = useState([])
  const [suppliers, setSuppliers] = useState([])
  
  // Contacts Sub-tab: 'customers' | 'suppliers'
  const [contactsTab, setContactsTab] = useState('customers')
  const [searchContact, setSearchContact] = useState('')
  
  // Password change form state
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordState, setPasswordState] = useState({
    newPassword: '',
    confirmPassword: ''
  })
  
  // User creation (invite) form state
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteState, setInviteState] = useState({
    name: '',
    email: '',
    password: '',
    phoneNumber: '',
    addr: '',
    role: 'STAFF'
  })
  
  // Customer/Supplier Modal states
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false)

  // Fetch Settings Data
  async function loadSettingsData() {
    setLoading(true)
    setError('')
    try {
      const token = await getFreshToken()
      if (!token) throw new Error('Not logged in')
      
      // Load Settings (Profile, Company, Users)
      const data = await api('/settings', { token })
      if (data) {
        if (data.user) {
          setUserProfile(data.user)
        }
        if (data.company) {
          setCompanyProfile(data.company)
        }
        if (data.users) {
          setUsersList(data.users)
        }
      }
      
      // Load Customers & Suppliers
      const customerData = await api('/customer', { token })
      setCustomers(customerData || [])
      
      const supplierData = await api('/supplier', { token })
      setSuppliers(supplierData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not fetch settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (me) {
      loadSettingsData()
    }
  }, [me])

  // Restore tab state when returning from an edit page
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab)
    }
    if (location.state?.contactsTab) {
      setContactsTab(location.state.contactsTab)
    }
  }, [])

  // Save Account Profile
  async function handleSaveProfile(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setBusy(true)
    try {
      const token = await getFreshToken()
      if (!token) throw new Error('Authentication required')
      
      const updatedUser = await api('/settings/profile', {
        method: 'PUT',
        token,
        body: {
          name: userProfile.name,
          email: userProfile.email,
          phoneNumber: userProfile.phoneNumber,
          addr: userProfile.addr
        }
      })
      
      setSuccess('Profile updated successfully!')
      setUserProfile(updatedUser)
      // Refresh context profile details
      await refreshMe(token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setBusy(false)
    }
  }

  // Handle Password Change
  async function handlePasswordChange(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    if (passwordState.newPassword !== passwordState.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (passwordState.newPassword.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }
    
    setBusy(true)
    try {
      const currentUser = auth.currentUser
      if (!currentUser) throw new Error('No firebase user authenticated')
      
      await updatePassword(currentUser, passwordState.newPassword)
      setSuccess('Password updated successfully!')
      setPasswordState({ newPassword: '', confirmPassword: '' })
      setShowPasswordForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password. You may need to re-authenticate.')
    } finally {
      setBusy(false)
    }
  }

  // Save Company Profile
  async function handleSaveCompany(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setBusy(true)
    try {
      const token = await getFreshToken()
      if (!token) throw new Error('Authentication required')
      
      const updatedCompany = await api('/settings/company', {
        method: 'PUT',
        token,
        body: companyProfile
      })
      
      setSuccess('Company profile updated successfully!')
      setCompanyProfile(updatedCompany)
      await refreshMe(token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update company profile')
    } finally {
      setBusy(false)
    }
  }

  // User Management Actions
  async function handleInviteUser(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setBusy(true)
    try {
      const token = await getFreshToken()
      if (!token) throw new Error('Authentication required')
      
      await api('/auth/register-user', {
        method: 'POST',
        token,
        body: inviteState
      })
      
      setSuccess(`User ${inviteState.name} invited successfully!`)
      setShowInviteModal(false)
      setInviteState({
        name: '',
        email: '',
        password: '',
        phoneNumber: '',
        addr: '',
        role: 'STAFF'
      })
      // Reload lists
      loadSettingsData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite user')
    } finally {
      setBusy(false)
    }
  }

  async function handleRemoveUser(userId) {
    if (!window.confirm('Are you sure you want to remove this user? This will delete their Firebase authentication and company profile link.')) return
    setError('')
    setSuccess('')
    try {
      const token = await getFreshToken()
      if (!token) throw new Error('Authentication required')
      
      await api(`/settings/users/${userId}`, {
        method: 'DELETE',
        token
      })
      
      setSuccess('User removed successfully')
      loadSettingsData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove user')
    }
  }

  async function handleRoleChange(userId, currentRole) {
    const newRole = currentRole === 'ADMIN' ? 'STAFF' : 'ADMIN'
    if (!window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return
    setError('')
    setSuccess('')
    try {
      const token = await getFreshToken()
      if (!token) throw new Error('Authentication required')
      
      await api(`/settings/users/${userId}/role`, {
        method: 'PUT',
        token,
        body: { role: newRole }
      })
      
      setSuccess('User role updated successfully')
      loadSettingsData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user role')
    }
  }

  async function handleTransferAdmin(userId, userName) {
    if (!window.confirm(`WARNING: Are you sure you want to transfer Admin status to ${userName}? This will promote them to Admin and demote you to STAFF. You will lose access to settings pages.`)) return
    setError('')
    setSuccess('')
    try {
      const token = await getFreshToken()
      if (!token) throw new Error('Authentication required')
      
      await api(`/settings/users/${userId}/transfer-admin`, {
        method: 'PUT',
        token
      })
      
      setSuccess('Admin status transferred successfully!')
      // Refresh me
      await refreshMe(token)
      loadSettingsData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transfer admin status')
    }
  }

  // Customer / Supplier Management Actions
  async function handleDeleteContact(type, id) {
    if (!window.confirm(`Are you sure you want to delete this ${type === 'customers' ? 'customer' : 'supplier'}?`)) return
    setError('')
    setSuccess('')
    try {
      const token = await getFreshToken()
      if (!token) throw new Error('Authentication required')
      
      await api(`/${type === 'customers' ? 'customer' : 'supplier'}/${id}`, {
        method: 'DELETE',
        token
      })
      
      setSuccess(`${type === 'customers' ? 'Customer' : 'Supplier'} deleted successfully`)
      loadSettingsData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete contact')
    }
  }

  const isAdmin = userProfile.role === 'ADMIN' || userProfile.role === 'SUPER_ADMIN'

  // Filter contacts
  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(searchContact.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchContact.toLowerCase()) ||
    c.phone?.toLowerCase().includes(searchContact.toLowerCase())
  )

  const filteredSuppliers = suppliers.filter(s => 
    s.name?.toLowerCase().includes(searchContact.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchContact.toLowerCase()) ||
    s.phoneNum?.toLowerCase().includes(searchContact.toLowerCase())
  )

  return (
    <DashboardLayout activeNav="settings">
      <div className="w-full space-y-6">
        
        {/* Banner Headers */}
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-5">
          <div>
            <h1 className="text-[28px] font-bold text-[#111827]">Settings</h1>
            <p className="mt-1 text-sm text-[#6B7280]">
              Manage your personal profile, company details, team roles, and contact logs.
            </p>
          </div>
          <button 
            type="button" 
            onClick={loadSettingsData}
            className="flex items-center gap-2 rounded-xl bg-white border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#374151] shadow-sm hover:bg-[#F9FAFB] transition-all cursor-pointer"
          >
            <HiOutlineArrowPath className="w-4 h-4 text-[#6B7280]" />
            Refresh
          </button>
        </div>

        {/* Global Feedback Notifications */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 p-4 text-sm font-semibold text-[#B91C1C] transition-all">
            <HiOutlineExclamationTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')} className="p-1 hover:bg-red-100 rounded-md cursor-pointer">
              <HiOutlineXMark className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {success && (
          <div className="flex items-center gap-3 rounded-xl bg-teal-50 border border-teal-200 p-4 text-sm font-semibold text-[#0F766E] transition-all">
            <HiOutlineCheckCircle className="w-5 h-5 text-teal-600 shrink-0" />
            <span className="flex-1">{success}</span>
            <button onClick={() => setSuccess('')} className="p-1 hover:bg-teal-100 rounded-md cursor-pointer">
              <HiOutlineXMark className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tabs Bar */}
        <div className="flex border-b border-[#E5E7EB] gap-2 overflow-x-auto pb-px">
          {[
            { id: 'account', label: 'Account & Profile', icon: HiOutlineUser, show: true },
            { id: 'company', label: 'Company Profile', icon: HiOutlineBuildingOffice, show: isAdmin },
            { id: 'users', label: 'User Management', icon: HiOutlineUsers, show: isAdmin },
            { id: 'contacts', label: 'Manage Customers & Suppliers', icon: HiOutlineUserGroup, show: true },
          ].map(tab => {
            if (!tab.show) return null
            const isTabActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id)
                  setError('')
                  setSuccess('')
                }}
                className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isTabActive
                    ? 'border-[#0F766E] text-[#0F766E]'
                    : 'border-transparent text-[#6B7280] hover:text-[#111827] hover:border-[#E5E7EB]'
                }`}
              >
                <tab.icon className={`w-5 h-5 ${isTabActive ? 'text-[#0F766E]' : 'text-[#9CA3AF]'}`} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Main Content Area */}
        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl bg-white border border-[#E5E7EB] shadow-sm">
            <div className="text-center space-y-2">
              <HiOutlineArrowPath className="w-8 h-8 text-[#0F766E] animate-spin mx-auto" />
              <p className="text-[#6B7280] text-sm font-medium">Loading settings details...</p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-[#E5E7EB] shadow-sm overflow-hidden">
            
            {/* 1. Account & Profile Tab */}
            {activeTab === 'account' && (
              <form onSubmit={handleSaveProfile} className="divide-y divide-[#E5E7EB]">
                <div className="p-6 space-y-6">
                  <h3 className="text-lg font-bold text-[#111827]">Account Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <label className="block text-[13px] font-bold text-[#374151]">
                      Full Name *
                      <input
                        type="text"
                        value={userProfile.name}
                        onChange={e => setUserProfile({ ...userProfile, name: e.target.value })}
                        required
                        className="mt-1.5 h-11 w-full rounded-xl border border-[#E5E7EB] px-3 font-medium text-[#111827] transition-all focus:border-[#0F766E] focus:outline-none"
                      />
                    </label>

                    <label className="block text-[13px] font-bold text-[#374151]">
                      Email Address *
                      <input
                        type="email"
                        value={userProfile.email}
                        onChange={e => setUserProfile({ ...userProfile, email: e.target.value })}
                        required
                        className="mt-1.5 h-11 w-full rounded-xl border border-[#E5E7EB] px-3 font-medium text-[#111827] transition-all focus:border-[#0F766E] focus:outline-none"
                      />
                    </label>

                    <label className="block text-[13px] font-bold text-[#374151]">
                      Phone Number
                      <input
                        type="text"
                        value={userProfile.phoneNumber || ''}
                        onChange={e => setUserProfile({ ...userProfile, phoneNumber: e.target.value })}
                        className="mt-1.5 h-11 w-full rounded-xl border border-[#E5E7EB] px-3 font-medium text-[#111827] transition-all focus:border-[#0F766E] focus:outline-none"
                      />
                    </label>

                    <div>
                      <span className="block text-[13px] font-bold text-[#374151]">Role</span>
                      <div className="mt-1.5 flex h-11 items-center px-3 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] text-[#4B5563] text-sm font-semibold">
                        <HiOutlineShieldCheck className="w-5 h-5 text-[#6B7280] mr-2" />
                        {userProfile.role} (Read-only)
                      </div>
                    </div>
                  </div>

                  <label className="block text-[13px] font-bold text-[#374151]">
                    Street Address
                    <textarea
                      rows={2}
                      value={userProfile.addr || ''}
                      onChange={e => setUserProfile({ ...userProfile, addr: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-[#E5E7EB] p-3 font-medium text-[#111827] transition-all focus:border-[#0F766E] focus:outline-none"
                    />
                  </label>
                </div>

                {/* Password Section */}
                <div className="p-6 space-y-4 bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-[#111827] flex items-center gap-1.5">
                        <HiOutlineKey className="w-4 h-4 text-[#6B7280]" />
                        Password Settings
                      </h4>
                      <p className="text-xs text-[#6B7280] mt-0.5">•••••• (Hidden)</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPasswordForm(!showPasswordForm)}
                      className="text-sm font-semibold text-[#0F766E] hover:underline cursor-pointer"
                    >
                      {showPasswordForm ? 'Cancel change' : 'Change password'}
                    </button>
                  </div>

                  {showPasswordForm && (
                    <div className="max-w-md border border-[#E5E7EB] bg-white rounded-xl p-4 space-y-4 shadow-sm animate-fadeIn">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="block text-[13px] font-bold text-[#374151]">
                          New Password
                          <input
                            type="password"
                            value={passwordState.newPassword}
                            onChange={e => setPasswordState({ ...passwordState, newPassword: e.target.value })}
                            placeholder="At least 6 chars"
                            className="mt-1 h-10 w-full rounded-lg border border-[#E5E7EB] px-3 text-sm focus:border-[#0F766E] focus:outline-none"
                          />
                        </label>
                        <label className="block text-[13px] font-bold text-[#374151]">
                          Confirm Password
                          <input
                            type="password"
                            value={passwordState.confirmPassword}
                            onChange={e => setPasswordState({ ...passwordState, confirmPassword: e.target.value })}
                            placeholder="Confirm password"
                            className="mt-1 h-10 w-full rounded-lg border border-[#E5E7EB] px-3 text-sm focus:border-[#0F766E] focus:outline-none"
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handlePasswordChange}
                        className="rounded-lg bg-[#0F766E] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#0F766E]/90 disabled:opacity-60 cursor-pointer"
                      >
                        {busy ? 'Saving...' : 'Update Password'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Save Footer */}
                <div className="flex justify-end p-6 bg-white">
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex items-center gap-2 rounded-xl bg-[#0F766E] px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-[#0F766E]/90 disabled:opacity-60 transition-all cursor-pointer"
                  >
                    <HiOutlineCheck className="w-5 h-5 text-white" />
                    {busy ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            )}

            {/* 2. Company Profile Tab */}
            {activeTab === 'company' && isAdmin && (
              <form onSubmit={handleSaveCompany} className="divide-y divide-[#E5E7EB]">
                <div className="p-6 space-y-6">
                  <h3 className="text-lg font-bold text-[#111827]">Company Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <label className="block text-[13px] font-bold text-[#374151]">
                      Company Name *
                      <input
                        type="text"
                        value={companyProfile.name}
                        onChange={e => setCompanyProfile({ ...companyProfile, name: e.target.value })}
                        required
                        className="mt-1.5 h-11 w-full rounded-xl border border-[#E5E7EB] px-3 font-medium text-[#111827] focus:border-[#0F766E] focus:outline-none"
                      />
                    </label>

                    <label className="block text-[13px] font-bold text-[#374151]">
                      Company ID / Registration Number
                      <input
                        type="text"
                        value={companyProfile.registrationNumber || ''}
                        onChange={e => setCompanyProfile({ ...companyProfile, registrationNumber: e.target.value })}
                        placeholder="e.g. UEN, CRN"
                        className="mt-1.5 h-11 w-full rounded-xl border border-[#E5E7EB] px-3 font-medium text-[#111827] focus:border-[#0F766E] focus:outline-none"
                      />
                    </label>

                    <label className="block text-[13px] font-bold text-[#374151]">
                      Default Currency
                      <select
                        value={companyProfile.currency || 'USD'}
                        onChange={e => setCompanyProfile({ ...companyProfile, currency: e.target.value })}
                        className="mt-1.5 h-11 w-full rounded-xl border border-[#E5E7EB] px-3 bg-white font-medium text-[#111827] focus:border-[#0F766E] focus:outline-none"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="SGD">SGD (S$)</option>
                        <option value="MYR">MYR (RM)</option>
                        <option value="AUD">AUD (A$)</option>
                        <option value="CAD">CAD (C$)</option>
                        <option value="JPY">JPY (¥)</option>
                      </select>
                    </label>

                    <label className="block text-[13px] font-bold text-[#374151]">
                      Fiscal/Reporting Period Start
                      <select
                        value={companyProfile.fiscalYearStart || 'January'}
                        onChange={e => setCompanyProfile({ ...companyProfile, fiscalYearStart: e.target.value })}
                        className="mt-1.5 h-11 w-full rounded-xl border border-[#E5E7EB] px-3 bg-white font-medium text-[#111827] focus:border-[#0F766E] focus:outline-none"
                      >
                        <option value="January">January</option>
                        <option value="February">February</option>
                        <option value="March">March</option>
                        <option value="April">April</option>
                        <option value="May">May</option>
                        <option value="June">June</option>
                        <option value="July">July</option>
                        <option value="August">August</option>
                        <option value="September">September</option>
                        <option value="October">October</option>
                        <option value="November">November</option>
                        <option value="December">December</option>
                      </select>
                    </label>
                    
                    <label className="block text-[13px] font-bold text-[#374151]">
                      Company Email
                      <input
                        type="email"
                        value={companyProfile.email || ''}
                        onChange={e => setCompanyProfile({ ...companyProfile, email: e.target.value })}
                        className="mt-1.5 h-11 w-full rounded-xl border border-[#E5E7EB] px-3 font-medium text-[#111827] focus:border-[#0F766E] focus:outline-none"
                      />
                    </label>

                    <label className="block text-[13px] font-bold text-[#374151]">
                      Company Phone
                      <input
                        type="text"
                        value={companyProfile.phoneNumber || ''}
                        onChange={e => setCompanyProfile({ ...companyProfile, phoneNumber: e.target.value })}
                        className="mt-1.5 h-11 w-full rounded-xl border border-[#E5E7EB] px-3 font-medium text-[#111827] focus:border-[#0F766E] focus:outline-none"
                      />
                    </label>
                  </div>

                  <label className="block text-[13px] font-bold text-[#374151]">
                    Address
                    <textarea
                      rows={2}
                      value={companyProfile.addr || ''}
                      onChange={e => setCompanyProfile({ ...companyProfile, addr: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-[#E5E7EB] p-3 font-medium text-[#111827] focus:border-[#0F766E] focus:outline-none"
                    />
                  </label>
                </div>

                <div className="flex justify-end p-6 bg-white">
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex items-center gap-2 rounded-xl bg-[#0F766E] px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-[#0F766E]/90 disabled:opacity-60 transition-all cursor-pointer"
                  >
                    <HiOutlineCheck className="w-5 h-5 text-white" />
                    {busy ? 'Saving...' : 'Save Company Settings'}
                  </button>
                </div>
              </form>
            )}

            {/* 3. User Management Tab */}
            {activeTab === 'users' && isAdmin && (
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-[#111827]">Company Users</h3>
                    <p className="text-xs text-[#6B7280] mt-0.5">Manage team members, change user roles, or transfer administration.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-[#0F766E] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0F766E]/90 transition-all cursor-pointer"
                  >
                    <HiOutlinePlus className="w-4 h-4 text-white" />
                    Invite User
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm text-[#374151]">
                    <thead>
                      <tr className="border-b border-[#E5E7EB] text-[13px] font-bold uppercase text-[#6B7280]">
                        <th className="pb-3 pr-4 font-semibold">User Details</th>
                        <th className="pb-3 pr-4 font-semibold">Email</th>
                        <th className="pb-3 pr-4 font-semibold text-center">Role</th>
                        <th className="pb-3 pr-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {usersList.map(u => {
                        const isSelf = u.id === me?.userId
                        return (
                          <tr key={u.id} className="hover:bg-gray-50/50">
                            <td className="py-4 pr-4 align-middle">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-[#E5E7EB] flex items-center justify-center">
                                  <span className="text-xs font-semibold text-[#111827]">
                                    {(u.name?.[0] || 'U').toUpperCase()}
                                  </span>
                                </div>
                                <span className="font-semibold text-[#111827]">
                                  {u.name || '—'} {isSelf && <span className="ml-1 text-xs text-[#6B7280] font-normal">(You)</span>}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 pr-4 align-middle font-medium text-[#4B5563]">{u.email || '—'}</td>
                            <td className="py-4 pr-4 align-middle text-center">
                              <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${
                                u.role === 'ADMIN' || u.role === 'SUPER_ADMIN'
                                  ? 'bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-600/20'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="py-4 pr-4 align-middle text-right">
                              {!isSelf && (
                                <div className="flex items-center justify-end gap-3.5">
                                  {/* Role Toggle */}
                                  <button
                                    type="button"
                                    onClick={() => handleRoleChange(u.id, u.role)}
                                    className="text-xs font-bold text-[#0F766E] hover:underline cursor-pointer"
                                    title="Toggle between ADMIN and STAFF"
                                  >
                                    Change role
                                  </button>
                                  
                                  {/* Transfer Admin */}
                                  {isAdmin && u.role !== 'ADMIN' && (
                                    <button
                                      type="button"
                                      onClick={() => handleTransferAdmin(u.id, u.name)}
                                      className="text-xs font-bold text-amber-600 hover:underline cursor-pointer"
                                      title="Transfer administrative ownership to this user"
                                    >
                                      Transfer Admin
                                    </button>
                                  )}

                                  {/* Remove */}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveUser(u.id)}
                                    className="text-[#B91C1C] hover:text-[#991B1B] p-1 rounded hover:bg-red-50 cursor-pointer"
                                    title="Remove user"
                                  >
                                    <HiOutlineTrash className="w-4.5 h-4.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Invite Modal */}
                {showInviteModal && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111827]/40 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-xl animate-scaleIn">
                      <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
                        <h2 className="text-lg font-bold text-[#111827]">Invite New User</h2>
                        <button 
                          onClick={() => setShowInviteModal(false)} 
                          className="rounded-xl p-2 text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] cursor-pointer"
                        >
                          <HiOutlineXMark className="w-5 h-5" />
                        </button>
                      </div>
                      <form onSubmit={handleInviteUser} className="px-6 py-6 space-y-4">
                        <label className="block text-[13px] font-bold text-[#374151]">
                          Full Name *
                          <input
                            type="text"
                            value={inviteState.name}
                            onChange={e => setInviteState({ ...inviteState, name: e.target.value })}
                            required
                            className="mt-1 h-11 w-full rounded-xl border border-[#E5E7EB] px-3 focus:border-[#0F766E] focus:outline-none"
                          />
                        </label>
                        <label className="block text-[13px] font-bold text-[#374151]">
                          Email Address *
                          <input
                            type="email"
                            value={inviteState.email}
                            onChange={e => setInviteState({ ...inviteState, email: e.target.value })}
                            required
                            className="mt-1 h-11 w-full rounded-xl border border-[#E5E7EB] px-3 focus:border-[#0F766E] focus:outline-none"
                          />
                        </label>
                        <label className="block text-[13px] font-bold text-[#374151]">
                          Temporary Password *
                          <input
                            type="password"
                            value={inviteState.password}
                            onChange={e => setInviteState({ ...inviteState, password: e.target.value })}
                            required
                            placeholder="At least 6 characters"
                            className="mt-1 h-11 w-full rounded-xl border border-[#E5E7EB] px-3 focus:border-[#0F766E] focus:outline-none"
                          />
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          <label className="block text-[13px] font-bold text-[#374151]">
                            Phone
                            <input
                              type="text"
                              value={inviteState.phoneNumber}
                              onChange={e => setInviteState({ ...inviteState, phoneNumber: e.target.value })}
                              className="mt-1 h-11 w-full rounded-xl border border-[#E5E7EB] px-3 focus:border-[#0F766E] focus:outline-none"
                            />
                          </label>
                          <label className="block text-[13px] font-bold text-[#374151]">
                            Initial Role
                            <select
                              value={inviteState.role}
                              onChange={e => setInviteState({ ...inviteState, role: e.target.value })}
                              className="mt-1 h-11 w-full rounded-xl border border-[#E5E7EB] px-3 bg-white focus:border-[#0F766E] focus:outline-none"
                            >
                              <option value="STAFF">STAFF</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                          </label>
                        </div>
                        <label className="block text-[13px] font-bold text-[#374151]">
                          Address
                          <textarea
                            rows={2}
                            value={inviteState.addr}
                            onChange={e => setInviteState({ ...inviteState, addr: e.target.value })}
                            className="mt-1 w-full rounded-xl border border-[#E5E7EB] p-3 focus:border-[#0F766E] focus:outline-none"
                          />
                        </label>
                        <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
                          <button
                            type="button"
                            onClick={() => setShowInviteModal(false)}
                            className="h-11 rounded-xl bg-[#F3F4F6] px-5 text-sm font-semibold text-[#374151] hover:bg-[#E5E7EB] cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={busy}
                            className="h-11 rounded-xl bg-[#0F766E] px-6 text-sm font-semibold text-white hover:bg-[#0F766E]/90 disabled:opacity-60 cursor-pointer"
                          >
                            {busy ? 'Registering...' : 'Invite User'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. Customers & Suppliers Management Tab */}
            {activeTab === 'contacts' && (
              <div className="p-6 space-y-6">
                
                {/* Contacts Header & Sub-selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
                  <div className="flex bg-[#F3F4F6] p-1 rounded-xl w-fit">
                    <button
                      type="button"
                      onClick={() => setContactsTab('customers')}
                      className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                        contactsTab === 'customers' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#111827]'
                      }`}
                    >
                      Customers ({customers.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setContactsTab('suppliers')}
                      className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                        contactsTab === 'suppliers' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#111827]'
                      }`}
                    >
                      Suppliers ({suppliers.length})
                    </button>
                  </div>
                  
                  {/* Actions & Search */}
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]"/>
                      <input
                          type="text"
                          placeholder={`Search ${contactsTab}...`}
                          value={searchContact}
                          onChange={e => setSearchContact(e.target.value)}
                          className="h-10 w-64 rounded-xl border border-[#E5E7EB] pl-9 pr-3.5 text-sm transition-all focus:border-[#0F766E] focus:outline-none"
                      />
                    </div>
                    <button
                        type="button"
                        onClick={() => contactsTab === 'customers' ? setIsCustomerModalOpen(true) : setIsSupplierModalOpen(true)}
                        className="flex items-center gap-1.5 rounded-xl bg-[#0F766E] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0F766E]/90 transition-all cursor-pointer"
                    >
                      <HiOutlinePlus className="w-4 h-4 text-white"/>
                      Add {contactsTab === 'customers' ? 'Customer' : 'Supplier'}
                    </button>
                  </div>
                </div>

                {/* Table for Customers */}
                {contactsTab === 'customers' && (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-sm text-[#374151]">
                        <thead>
                        <tr className="border-b border-[#E5E7EB] text-[13px] font-bold uppercase text-[#6B7280]">
                          <th className="pb-3 pr-4 font-semibold">Name</th>
                          <th className="pb-3 pr-4 font-semibold">Email</th>
                          <th className="pb-3 pr-4 font-semibold">Phone</th>
                          <th className="pb-3 pr-4 font-semibold">Address</th>
                          <th className="pb-3 pr-4 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB]">
                        {filteredCustomers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-[#6B7280] font-medium">
                              No customers found. Click &quot;Add Customer&quot; to register one.
                            </td>
                          </tr>
                        ) : (
                          filteredCustomers.map(c => (
                            <tr key={c.id} className="hover:bg-gray-50/50">
                              <td className="py-4 pr-4 align-middle font-semibold text-[#111827]">{c.name || '—'}</td>
                              <td className="py-4 pr-4 align-middle text-[#4B5563]">{c.email || '—'}</td>
                              <td className="py-4 pr-4 align-middle text-[#4B5563]">{c.phone || '—'}</td>
                              <td className="py-4 pr-4 align-middle text-[#6B7280] max-w-[240px] truncate">{c.addr || '—'}</td>
                              <td className="py-4 pr-4 align-middle text-right">
                                <div className="flex items-center justify-end gap-3.5">
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/customer/edit/${c.id}`, { state: { returnTo: '/settings', activeTab: 'contacts', contactsTab: 'customers' } })}
                                    className="p-1 text-[#0F766E] hover:bg-teal-50 rounded cursor-pointer"
                                    title="Edit customer"
                                  >
                                    <HiOutlinePencil className="w-4.5 h-4.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteContact('customers', c.id)}
                                    className="p-1 text-[#B91C1C] hover:bg-red-50 rounded cursor-pointer"
                                    title="Delete customer"
                                  >
                                    <HiOutlineTrash className="w-4.5 h-4.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Table for Suppliers */}
                {contactsTab === 'suppliers' && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm text-[#374151]">
                      <thead>
                        <tr className="border-b border-[#E5E7EB] text-[13px] font-bold uppercase text-[#6B7280]">
                          <th className="pb-3 pr-4 font-semibold">Name</th>
                          <th className="pb-3 pr-4 font-semibold">Email</th>
                          <th className="pb-3 pr-4 font-semibold">Phone</th>
                          <th className="pb-3 pr-4 font-semibold">Address</th>
                          <th className="pb-3 pr-4 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB]">
                        {filteredSuppliers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-[#6B7280] font-medium">
                              No suppliers found. Click &quot;Add Supplier&quot; to register one.
                            </td>
                          </tr>
                        ) : (
                          filteredSuppliers.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50/50">
                              <td className="py-4 pr-4 align-middle font-semibold text-[#111827]">{s.name || '—'}</td>
                              <td className="py-4 pr-4 align-middle text-[#4B5563]">{s.email || '—'}</td>
                              <td className="py-4 pr-4 align-middle text-[#4B5563]">{s.phoneNum || '—'}</td>
                              <td className="py-4 pr-4 align-middle text-[#6B7280] max-w-[240px] truncate">{s.addr || '—'}</td>
                              <td className="py-4 pr-4 align-middle text-right">
                                <div className="flex items-center justify-end gap-3.5">
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/supplier/edit/${s.id}`, { state: { returnTo: '/settings', activeTab: 'contacts', contactsTab: 'suppliers' } })}
                                    className="p-1 text-[#0F766E] hover:bg-teal-50 rounded cursor-pointer"
                                    title="Edit supplier"
                                  >
                                    <HiOutlinePencil className="w-4.5 h-4.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteContact('suppliers', s.id)}
                                    className="p-1 text-[#B91C1C] hover:bg-red-50 rounded cursor-pointer"
                                    title="Delete supplier"
                                  >
                                    <HiOutlineTrash className="w-4.5 h-4.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            
          </div>
        )}
      </div>

      {/* Integrate Modals */}
      <QuickCreateCustomerModal 
        isOpen={isCustomerModalOpen} 
        onClose={() => setIsCustomerModalOpen(false)}
        onSuccess={() => loadSettingsData()}
      />
      <QuickCreateSupplierModal 
        isOpen={isSupplierModalOpen} 
        onClose={() => setIsSupplierModalOpen(false)}
        onSuccess={() => loadSettingsData()}
      />
    </DashboardLayout>
  )
}
