import React, { useState } from 'react'
import { HiOutlineXMark } from 'react-icons/hi2'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import CustomSelect from './CustomSelect'

const ACCOUNT_TYPES = [
  'ASSET',
  'LIABILITY',
  'EQUITY',
  'REVENUE',
  'EXPENSE',
]

export default function QuickCreateAccountModal({ isOpen, onClose, onSuccess }) {
  const { getFreshToken } = useAuth()
  const [name, setName] = useState('')
  const [accountCode, setAccountCode] = useState('')
  const [accountType, setAccountType] = useState('EXPENSE')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const token = await getFreshToken()
      if (!token) throw new Error('Not signed in')

      const body = {
        name: name.trim(),
        accountCode: accountCode.trim() || undefined,
        accountType,
        description: description.trim() || undefined,
      }
      
      const created = await api('/account', { method: 'POST', token, body })
      onSuccess(created)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111827]/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
          <h2 className="text-[18px] font-bold text-[#111827]">Quick add account</h2>
          <button onClick={onClose} className="rounded-xl p-2 text-[#64748B] hover:bg-[#F3F4F6] hover:text-[#111827]">
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-6">
          <div className="space-y-4">
            <label className="block text-[13px] font-semibold text-[#374151]">
              Account Name *
              <input value={name} onChange={e => setName(e.target.value)} required className="mt-1 h-11 w-full rounded-xl border border-[#E5E7EB] px-3 focus:border-[#0F766E] focus:outline-none" />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block text-[13px] font-semibold text-[#374151]">
                Account Code
                <input type="text" value={accountCode} onChange={e => setAccountCode(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-[#E5E7EB] px-3 focus:border-[#0F766E] focus:outline-none" />
              </label>
              <label className="block text-[13px] font-semibold text-[#374151]">
                Account Type *
                <CustomSelect
                  value={accountType}
                  onChange={(val) => setAccountType(val)}
                  options={ACCOUNT_TYPES.map(type => ({ value: type, label: type }))}
                  className="mt-1"
                  buttonClassName="h-11"
                />
              </label>
            </div>
            <label className="block text-[13px] font-semibold text-[#374151]">
              Description
              <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} className="mt-1 w-full rounded-xl border border-[#E5E7EB] p-3 focus:border-[#0F766E] focus:outline-none" />
            </label>
          </div>
          {error && <p className="mt-4 text-[13px] font-bold text-[#B91C1C]">{error}</p>}
          <div className="mt-8 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="h-10 rounded-xl bg-[#F3F4F6] px-5 text-[14px] font-bold text-[#374151] hover:bg-[#E5E7EB]">Cancel</button>
            <button type="submit" disabled={busy} className="h-10 rounded-xl bg-[#0F766E] px-5 text-[14px] font-bold text-white hover:bg-[#0F766E]/90 disabled:opacity-60">{busy ? 'Saving...' : 'Save account'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
