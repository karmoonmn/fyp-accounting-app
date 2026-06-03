import React, { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { HiOutlinePlus, HiOutlineTrash, HiOutlineXMark } from 'react-icons/hi2'
import CustomSelect from '../components/CustomSelect'
import FormSkeleton from '../components/FormSkeleton'
import QuickCreateSupplierModal from '../components/QuickCreateSupplierModal'
import QuickCreateAccountModal from '../components/QuickCreateAccountModal'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function emptyLine(num) {
  return {
    lineNum: num,
    accountId: '',
    description: '',
    amount: '0',
  }
}

export default function CreateBill() {
  const { me, meError, getFreshToken } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [docNumber, setDocNumber] = useState('')
  const [txnDate, setTxnDate] = useState(todayISO())
  const [dueDate, setDueDate] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [memo, setMemo] = useState('')
  const [lines, setLines] = useState([emptyLine(1), emptyLine(2)])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [accounts, setAccounts] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [activeLineIndex, setActiveLineIndex] = useState(null)

  useEffect(() => {
    if (!me || meError) return
    let cancelled = false
      ; (async () => {
        try {
          const token = await getFreshToken()
          if (!token || cancelled) return

          const [accs, supps, billData] = await Promise.all([
            api('/account/tree', { token }).catch(() => []),
            api('/supplier', { token }).catch(() => []),
            isEdit ? api(`/bill/${id}`, { token }).catch(() => null) : Promise.resolve(null)
          ])

          if (!cancelled) {
            // Only show Expense and Equity accounts for Bills
            const validTypes = ['EXPENSE', 'EQUITY']
            const flattened = []

            const processAccount = (acc) => {
              if (validTypes.includes(acc.accountType) && (!acc.children || acc.children.length === 0)) {
                flattened.push(acc)
              }
              if (acc.children && acc.children.length > 0) {
                acc.children.forEach(processAccount)
              }
            }

            if (Array.isArray(accs)) {
              accs.forEach(processAccount)
            }

            setAccounts(flattened)
            setSuppliers(supps || [])

            if (billData) {
              setDocNumber(billData.docNumber || '')
              setTxnDate(billData.txnDate || todayISO())
              setDueDate(billData.dueDate || '')
              setSupplierId(billData.supplier ? billData.supplier.id.toString() : '')
              
              if (billData.lines && billData.lines.length > 0) {
                setLines(
                  billData.lines.map((l) => ({
                    lineNum: l.lineNum,
                    accountId: l.account ? l.account.id.toString() : '',
                    description: l.description || '',
                    amount: l.amount != null ? l.amount.toString() : '0',
                  }))
                )
              }
            }
          }
        } catch (err) {
          console.error(err)
        } finally {
          if (!cancelled) {
            setInitialLoading(false)
          }
        }
      })()
    return () => {
      cancelled = true
    }
  }, [id, isEdit, me, meError, getFreshToken])

  const lineTotal = useMemo(() => {
    return lines.reduce((sum, row) => {
      const a = Number.parseFloat(row.amount) || 0
      return sum + a
    }, 0)
  }, [lines])

  function updateLine(index, patch) {
    setLines((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine(prev.length + 1)])
  }

  function removeLine(index) {
    setLines((prev) =>
      prev.length <= 1
        ? prev
        : prev.filter((_, i) => i !== index).map((row, i) => ({ ...row, lineNum: i + 1 })),
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!me || meError) {
      setError('Sign in and complete registration before creating bills.')
      return
    }
    setBusy(true)
    try {
      const token = await getFreshToken()
      if (!token) throw new Error('Not signed in')

      const payload = {
        docNumber: docNumber || undefined,
        txnDate,
        dueDate: dueDate || undefined,
        supplierId: supplierId ? parseInt(supplierId, 10) : undefined,
        memo,
        lines: lines
          .filter(l => l.accountId && Number.parseFloat(l.amount) > 0)
          .map(l => ({
            accountId: parseInt(l.accountId, 10),
            description: l.description,
            amount: Number.parseFloat(l.amount),
          }))
      }

      if (payload.lines.length === 0) {
        throw new Error('Please add at least one line with an account and amount > 0.')
      }

      await api('/bill', { method: 'POST', token, body: payload })
      navigate('/bills')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create bill')
    } finally {
      setBusy(false)
    }
  }

  function closeEditor() {
    navigate('/bills')
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4">
        <div className="min-w-0">
          <h2 className="truncate text-[18px] font-bold text-[#111827]">
            {isEdit ? 'Edit Bill' : 'Bill'} {docNumber?.trim() ? `no.${docNumber.trim()}` : ''}
          </h2>
        </div>
        <button
          type="button"
          onClick={closeEditor}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#64748B] hover:bg-white hover:text-[#111827]"
          aria-label="Close"
          title="Close"
        >
          <HiOutlineXMark className="h-5 w-5" />
        </button>
      </div>

      <div className="px-6 py-6">
        {!me || meError ? (
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <p className="text-[14px] font-semibold text-[#111827]">
              Sign in and complete registration before creating bills.
            </p>
            <p className="mt-2 text-[13px] font-medium text-[#64748B]">
              {meError ? `Fix your session first: ${meError}` : 'Your backend profile is not linked yet.'}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Link
                to="/login"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-[#0F766E] px-4 text-[13px] font-bold text-white hover:bg-[#0F766E]/90"
              >
                Sign in
              </Link>
              <Link
                to="/"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-4 text-[13px] font-bold text-[#111827] hover:bg-[#F9FAFB]"
              >
                Dashboard
              </Link>
            </div>
          </div>
        ) : initialLoading ? (
          <FormSkeleton />
        ) : (
          <form id="create-bill-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
              <h3 className="text-[#111827] text-[16px] font-bold">Bill details</h3>
              <div className="mt-4 grid grid-cols-3 gap-4">
                <label className="text-[13px] font-semibold text-[#374151]">
                  Bill no.
                  <input
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    placeholder="BILL-2001"
                    required
                    className="mt-1 h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#111827] placeholder-[#9CA3AF] focus:border-[#0F766E] focus:outline-none"
                  />
                </label>
                <label className="text-[13px] font-semibold text-[#374151]">
                  Bill date
                  <input
                    type="date"
                    value={txnDate}
                    onChange={(e) => setTxnDate(e.target.value)}
                    required
                    className="mt-1 h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#111827] focus:border-[#0F766E] focus:outline-none"
                  />
                </label>
                <label className="text-[13px] font-semibold text-[#374151]">
                  Due date
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="mt-1 h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#111827] focus:border-[#0F766E] focus:outline-none"
                  />
                </label>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4">
                <label className="text-[13px] font-semibold text-[#374151]">
                  Supplier
                  <CustomSelect
                    value={supplierId}
                    onChange={(val) => setSupplierId(val)}
                    options={[
                      { value: '', label: '(None)' },
                      ...suppliers.map(s => ({
                        value: s.id,
                        label: `${s.name} ${s.email ? `(${s.email})` : ''}`
                      }))
                    ]}
                    placeholder="Select a supplier"
                    className="mt-1"
                    buttonClassName="h-11"
                    onCreateNew={() => setShowSupplierModal(true)}
                  />
                </label>
                <label className="col-span-2 text-[13px] font-semibold text-[#374151]">
                  Memo
                  <input
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="Optional"
                    className="mt-1 h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#111827] placeholder-[#9CA3AF] focus:border-[#0F766E] focus:outline-none"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[#111827] text-[16px] font-bold">Line items</h3>
                <button
                  type="button"
                  onClick={addLine}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 text-[13px] font-bold text-[#0F766E] hover:bg-[#F9FAFB]"
                >
                  <HiOutlinePlus className="h-4 w-4" />
                  Add line
                </button>
              </div>

              <div className="mt-4 overflow-visible rounded-xl border border-[#E5E7EB]">
                <table className="w-full min-w-[860px] border-collapse text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA] text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">
                      <th className="px-4 py-3 w-12 rounded-tl-xl">#</th>
                      <th className="px-4 py-3 w-[360px]">Account</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 w-40 text-right">Amount</th>
                      <th className="px-4 py-3 w-16 rounded-tr-xl" />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((row, index) => {
                      return (
                        <tr key={index} className={index % 2 === 1 ? 'bg-[#F9FAFB]/80' : 'bg-white'}>
                          <td className="border-b border-[#F3F4F6] px-4 py-3 font-semibold text-[#64748B]">
                            {index + 1}
                          </td>
                          <td className="border-b border-[#F3F4F6] px-4 py-3">
                            <CustomSelect
                              value={row.accountId}
                              onChange={(val) => updateLine(index, { accountId: val })}
                              options={accounts.map((acc) => ({
                                value: acc.id,
                                label: acc.name
                              }))}
                              placeholder="Choose an account"
                              className=""
                              buttonClassName="h-10"
                              onCreateNew={() => {
                                setActiveLineIndex(index)
                                setShowAccountModal(true)
                              }}
                            />
                          </td>
                          <td className="border-b border-[#F3F4F6] px-4 py-3">
                            <input
                              type="text"
                              value={row.description}
                              onChange={(e) => updateLine(index, { description: e.target.value })}
                              placeholder="Description"
                              className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#111827] placeholder-[#9CA3AF] focus:border-[#0F766E] focus:outline-none"
                            />
                          </td>
                          <td className="border-b border-[#F3F4F6] px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={row.amount}
                              onChange={(e) => updateLine(index, { amount: e.target.value })}
                              className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-right text-[13px] font-medium text-[#111827] focus:border-[#0F766E] focus:outline-none"
                            />
                          </td>
                          <td className="border-b border-[#F3F4F6] px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => removeLine(index)}
                              disabled={lines.length <= 1}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#64748B] hover:bg-[#F9FAFB] hover:text-[#111827] disabled:opacity-40"
                              title="Remove line"
                            >
                              <HiOutlineTrash className="h-5 w-5" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {error ? (
                <div className="mt-4 rounded-xl border border-[#FEE2E2] bg-[#FEF2F2] px-4 py-3 text-[13px] font-semibold text-[#B91C1C]">
                  {error}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              {/*<button*/}
              {/*  type="button"*/}
              {/*  onClick={() => setMakePayment((v) => !v)}*/}
              {/*  className={`inline-flex h-10 items-center justify-center rounded-xl border px-4 text-[13px] font-bold ${*/}
              {/*    makePayment*/}
              {/*      ? 'border-[#0F766E] bg-[#CCFBF1] text-[#0F766E]'*/}
              {/*      : 'border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#F9FAFB]'*/}
              {/*  }`}*/}
              {/*>*/}
              {/*  Make payment after saving*/}
              {/*</button>*/}
              <div>

              </div>
              <div className="w-full max-w-[420px] space-y-2 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#64748B]">Total</span>
                  <span className="font-bold tabular-nums text-[#111827]">{lineTotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#64748B]">Balance due</span>
                  <span className="font-bold tabular-nums text-[#111827]">{lineTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#E5E7EB] bg-[#111827]">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-3">
          <button
            type="button"
            onClick={closeEditor}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#374151] px-5 text-[14px] font-bold text-white hover:bg-[#4B5563]"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              form="create-bill-form"
              disabled={busy}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[#0F766E] px-5 text-[14px] font-bold text-white hover:bg-[#0F766E]/90 disabled:opacity-60"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/bill/payment')}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[#0F766E] px-5 text-[14px] font-bold text-white hover:bg-[#0F766E]/90"
              title="After the bill is saved"
            >
              Make payment
            </button>
          </div>
        </div>
      </div>

      <QuickCreateSupplierModal 
        isOpen={showSupplierModal} 
        onClose={() => setShowSupplierModal(false)}
        onSuccess={(newSupplier) => {
          setSuppliers(prev => [...prev, newSupplier])
          setSupplierId(newSupplier.id.toString())
        }}
      />
      
      <QuickCreateAccountModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        onSuccess={(newAccount) => {
          setAccounts(prev => [...prev, newAccount])
          if (activeLineIndex !== null) {
            updateLine(activeLineIndex, { accountId: newAccount.id.toString() })
          }
        }}
      />
    </div>
  )
}

