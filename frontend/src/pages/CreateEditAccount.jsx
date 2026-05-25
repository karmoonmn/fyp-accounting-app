import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import DashboardLayout from '../components/DashboardLayout'
import { HiArrowLeft } from 'react-icons/hi'

export default function CreateEditAccount() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { idToken, me } = useAuth()

  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    accountCode: '',
    accountType: 'ASSET',
    parentId: '',
  })

  // List of potential parent accounts for the dropdown
  const [parentOptions, setParentOptions] = useState([])

  useEffect(() => {
    if (!idToken || !me) return
    const init = async () => {
      try {
        setError('')
        // Fetch accounts for parent dropdown (flat list, fetch all by looping pages if necessary, or just rely on a search. For now, fetch first page of 100)
        const parentData = await api('/account?size=100', { token: idToken })
        const options = (parentData.content || []).filter(a => a.id !== Number(id))
        setParentOptions(options)

        if (isEdit) {
          const acc = await api(`/account/${id}`, { token: idToken })
          setFormData({
            name: acc.name || '',
            accountCode: acc.accountCode || '',
            accountType: acc.accountType || 'ASSET',
            parentId: acc.parentId ? String(acc.parentId) : '',
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [idToken, me, id, isEdit])

  // Automatically update accountType if a parent is selected, based on parent's type
  const handleParentChange = (e) => {
    const parentId = e.target.value
    let newType = formData.accountType
    
    if (parentId) {
      const selectedParent = parentOptions.find(p => String(p.id) === parentId)
      if (selectedParent) {
        newType = selectedParent.accountType
      }
    }
    
    setFormData(prev => ({
      ...prev,
      parentId,
      accountType: newType,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!idToken) return
    
    setSubmitting(true)
    setError('')
    
    try {
      const payload = {
        name: formData.name.trim(),
        accountType: formData.accountType,
        accountCode: formData.accountCode.trim() || undefined,
        parentId: formData.parentId ? Number(formData.parentId) : null,
      }
      
      if (isEdit) {
        await api(`/account/${id}`, {
          method: 'PUT',
          token: idToken,
          body: payload,
        })
      } else {
        await api('/account', {
          method: 'POST',
          token: idToken,
          body: payload,
        })
      }
      
      navigate('/accounts')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout activeNav="accounts">
        <div className="p-8 text-center text-[#6B7280] font-medium">Loading...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeNav="accounts">
      <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/accounts')}
          className="p-2.5 bg-white border border-[#E5E7EB] rounded-xl hover:bg-[#F9FAFB] text-[#6B7280] hover:text-[#111827] transition-all shadow-sm"
        >
          <HiArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-[28px] font-bold text-[#111827]">
            {isEdit ? 'Edit Account' : 'New Account'}
          </h1>
          <p className="text-sm text-[#6B7280]">
            {isEdit ? 'Update account details.' : 'Add a new financial account to your COA.'}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-[#FEE2E2] text-[#B91C1C] p-4 rounded-xl border border-[#F87171]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
        <div className="p-7 space-y-6">
          
          <div>
            <label className="block text-[15px] font-semibold text-[#111827] mb-2">
              Account Name <span className="text-[#EF4444]">*</span>
            </label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Travel Expense"
              className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] text-[#111827] placeholder-[#9CA3AF] transition-colors"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[15px] font-semibold text-[#111827] mb-2">
                Account Code <span className="text-[#9CA3AF] font-medium text-sm">(Optional)</span>
              </label>
              <input
                type="text"
                value={formData.accountCode}
                onChange={(e) => setFormData(p => ({ ...p, accountCode: e.target.value }))}
                placeholder="Auto-generated if left blank"
                className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] text-[#111827] placeholder-[#9CA3AF] transition-colors font-mono"
              />
              <p className="text-xs text-[#6B7280] mt-2 leading-relaxed">
                Must match type prefix (1=Asset, 2=Liability, 3=Equity, 4=Revenue, 5=Expense)
              </p>
            </div>
            
            <div>
              <label className="block text-[15px] font-semibold text-[#111827] mb-2">
                Parent Account <span className="text-[#9CA3AF] font-medium text-sm">(Optional)</span>
              </label>
              <select
                value={formData.parentId}
                onChange={handleParentChange}
                className="w-full px-4 py-3 border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] text-[#111827] transition-colors bg-white"
              >
                <option value="">-- None (Root Account) --</option>
                {parentOptions.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.accountCode} - {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[15px] font-semibold text-[#111827] mb-2">
              Account Type <span className="text-[#EF4444]">*</span>
            </label>
            <select
              required
              value={formData.accountType}
              onChange={(e) => setFormData(p => ({ ...p, accountType: e.target.value }))}
              disabled={Boolean(formData.parentId)} // Disabled if parent is selected
              className={`w-full px-4 py-3 border rounded-xl transition-colors focus:outline-none ${
                formData.parentId 
                  ? 'bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280] cursor-not-allowed' 
                  : 'bg-white border-[#E5E7EB] focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] text-[#111827]'
              }`}
            >
              <option value="ASSET">Asset</option>
              <option value="LIABILITY">Liability</option>
              <option value="EQUITY">Equity</option>
              <option value="REVENUE">Revenue</option>
              <option value="EXPENSE">Expense</option>
            </select>
            {formData.parentId && (
              <p className="text-xs text-[#0F766E] font-medium mt-2">
                Account type is inherited from the parent account.
              </p>
            )}
          </div>

        </div>
        
        <div className="p-5 border-t border-[#E5E7EB] bg-[#F9FAFB] flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/accounts')}
            className="px-6 py-2.5 text-[15px] font-semibold text-[#6B7280] hover:text-[#111827] hover:bg-[#E5E7EB] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-[#0F766E] text-white text-[15px] font-semibold rounded-xl hover:bg-[#0F766E]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0F766E] transition-all disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Account'}
          </button>
        </div>
      </form>
    </div>
  </DashboardLayout>
  )
}
