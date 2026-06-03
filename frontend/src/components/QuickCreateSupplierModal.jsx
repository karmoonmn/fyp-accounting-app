import React, { useState } from 'react'
import { HiOutlineXMark } from 'react-icons/hi2'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

export default function QuickCreateSupplierModal({ isOpen, onClose, onSuccess }) {
  const { getFreshToken } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
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
        email: email.trim() || undefined,
        phoneNum: phone.trim() || undefined,
        addr: address.trim() || undefined,
      }
      const created = await api('/supplier', { method: 'POST', token, body })
      onSuccess(created)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create supplier')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111827]/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
          <h2 className="text-[18px] font-bold text-[#111827]">Quick add supplier</h2>
          <button onClick={onClose} className="rounded-xl p-2 text-[#64748B] hover:bg-[#F3F4F6] hover:text-[#111827]">
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-6">
          <div className="space-y-4">
            <label className="block text-[13px] font-semibold text-[#374151]">
              Name *
              <input value={name} onChange={e => setName(e.target.value)} required className="mt-1 h-11 w-full rounded-xl border border-[#E5E7EB] px-3 focus:border-[#0F766E] focus:outline-none" />
            </label>
            <label className="block text-[13px] font-semibold text-[#374151]">
              Email
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-[#E5E7EB] px-3 focus:border-[#0F766E] focus:outline-none" />
            </label>
            <label className="block text-[13px] font-semibold text-[#374151]">
              Phone
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-[#E5E7EB] px-3 focus:border-[#0F766E] focus:outline-none" />
            </label>
            <label className="block text-[13px] font-semibold text-[#374151]">
              Address
              <textarea rows={2} value={address} onChange={e => setAddress(e.target.value)} className="mt-1 w-full rounded-xl border border-[#E5E7EB] p-3 focus:border-[#0F766E] focus:outline-none" />
            </label>
          </div>
          {error && <p className="mt-4 text-[13px] font-bold text-[#B91C1C]">{error}</p>}
          <div className="mt-8 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="h-10 rounded-xl bg-[#F3F4F6] px-5 text-[14px] font-bold text-[#374151] hover:bg-[#E5E7EB]">Cancel</button>
            <button type="submit" disabled={busy} className="h-10 rounded-xl bg-[#0F766E] px-5 text-[14px] font-bold text-white hover:bg-[#0F766E]/90 disabled:opacity-60">{busy ? 'Saving...' : 'Save supplier'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
