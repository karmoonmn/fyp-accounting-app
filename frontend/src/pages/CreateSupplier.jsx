import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import DashboardLayout from '../components/DashboardLayout'
import { HiOutlineXMark } from 'react-icons/hi2'

export default function CreateSupplier() {
  const { me, meError, getFreshToken } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const isEdit = !!id
  const returnTo = location.state?.returnTo || '/suppliers'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNum, setPhoneNum] = useState('')
  const [addr, setAddr] = useState('')

  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isEdit || !me || meError) return
    let cancelled = false
      ; (async () => {
        setBusy(true)
        try {
          const token = await getFreshToken()
          if (!token || cancelled) return
          const supplier = await api(`/supplier/${id}`, { token })
          if (!cancelled && supplier) {
            setName(supplier.name || '')
            setEmail(supplier.email || '')
            setPhoneNum(supplier.phoneNum || '')
            setAddr(supplier.addr || '')
          }
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Could not fetch supplier details')
          }
        } finally {
          if (!cancelled) {
            setBusy(false)
          }
        }
      })()
    return () => {
      cancelled = true
    }
  }, [id, isEdit, me, meError, getFreshToken])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!me || meError) {
      setError('Sign in to manage suppliers.')
      return
    }
    setBusy(true)
    try {
      const token = await getFreshToken()
      if (!token) throw new Error('Not signed in')
      const body = { name, email, phoneNum, addr }
      const url = isEdit ? `/supplier/${id}` : '/supplier'
      const method = isEdit ? 'PUT' : 'POST'
      await api(url, { method, token, body })
      navigate(returnTo, { state: location.state })
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${isEdit ? 'update' : 'create'} supplier`)
    } finally {
      setBusy(false)
    }
  }

  function closeEditor() {
    navigate(returnTo, { state: location.state })
  }

  return (
    <DashboardLayout activeNav="bills">
      <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4">
          <h2 className="text-[18px] font-bold text-[#111827]">
            {isEdit ? 'Edit Supplier' : 'New Supplier'}
          </h2>
          <button
            type="button"
            onClick={closeEditor}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] hover:bg-white hover:text-[#111827]"
            title="Close"
          >
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <form id="supplier-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <label className="block text-[13px] font-bold text-[#374151]">
                Supplier Name *
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Company or Individual Name"
                  className="mt-1.5 h-10 w-full rounded-xl border border-[#E5E7EB] px-3 text-[13px] font-medium text-[#111827] focus:border-[#0F766E] focus:outline-none"
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block text-[13px] font-bold text-[#374151]">
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@example.com"
                    className="mt-1.5 h-10 w-full rounded-xl border border-[#E5E7EB] px-3 text-[13px] font-medium text-[#111827] focus:border-[#0F766E] focus:outline-none"
                  />
                </label>
                <label className="block text-[13px] font-bold text-[#374151]">
                  Phone Number
                  <input
                    type="text"
                    value={phoneNum}
                    onChange={(e) => setPhoneNum(e.target.value)}
                    placeholder="+60123456789"
                    className="mt-1.5 h-10 w-full rounded-xl border border-[#E5E7EB] px-3 text-[13px] font-medium text-[#111827] focus:border-[#0F766E] focus:outline-none"
                  />
                </label>
              </div>

              <label className="block text-[13px] font-bold text-[#374151]">
                Address
                <textarea
                  rows={3}
                  value={addr}
                  onChange={(e) => setAddr(e.target.value)}
                  placeholder="Full billing or shipping address"
                  className="mt-1.5 w-full rounded-xl border border-[#E5E7EB] px-3 py-2 text-[13px] font-medium text-[#111827] focus:border-[#0F766E] focus:outline-none resize-none"
                />
              </label>
            </div>

            {error && (
              <div className="rounded-xl border border-[#FEE2E2] bg-[#FEF2F2] px-4 py-3 text-[13px] font-semibold text-[#B91C1C]">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={closeEditor}
                className="inline-flex h-10 items-center justify-center rounded-xl px-5 text-[14px] font-bold text-[#64748B] hover:bg-[#F3F4F6]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-[#0F766E] px-5 text-[14px] font-bold text-white hover:bg-[#0F766E]/90 disabled:opacity-60"
              >
                {busy ? 'Saving...' : (isEdit ? 'Update Supplier' : 'Save Supplier')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}
