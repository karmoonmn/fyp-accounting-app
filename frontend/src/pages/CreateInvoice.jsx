import React, { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { HiOutlinePlus, HiOutlineTrash, HiOutlineXMark } from 'react-icons/hi2'
import CustomSelect from '../components/CustomSelect'
import FormSkeleton from '../components/FormSkeleton'
import QuickCreateCustomerModal from '../components/QuickCreateCustomerModal'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function emptyLine(num) {
  return {
    lineNum: num,
    description: '',
    quantity: '1',
    unitPrice: '0',
  }
}

export default function CreateInvoice() {
  const { me, meError, getFreshToken } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const isEdit = !!id

  const prefill = location.state?.prefill || null

  const [docNumber, setDocNumber] = useState(prefill?.doc_number || '')
  const [txnDate, setTxnDate] = useState(prefill?.txn_date || todayISO())
  const [customerId, setCustomerId] = useState('')
  const [shipAddr, setShipAddr] = useState('')
  const [shipDate, setShipDate] = useState('')
  const [dueDate, setDueDate] = useState(prefill?.due_date || '')
  const [lines, setLines] = useState(() => {
    if (prefill?.line_items?.length) {
      return prefill.line_items.map((l, i) => ({
        lineNum: i + 1,
        description: l.description || '',
        quantity: l.quantity != null ? l.quantity.toString() : '1',
        unitPrice: l.amount != null ? l.amount.toString() : (l.unit_price != null ? l.unit_price.toString() : '0'),
      }))
    }
    return [emptyLine(1), emptyLine(2)]
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [sendLater, setSendLater] = useState(false)
  const [customers, setCustomers] = useState([])
  const [balance, setBalance] = useState(0)
  const [paymentsAllocations, setPaymentsAllocations] = useState([])
  const [showCustomerModal, setShowCustomerModal] = useState(false)

  useEffect(() => {
    if (!me || meError) return
    let cancelled = false
    ;(async () => {
      setBusy(true)
      try {
        const token = await getFreshToken()
        if (!token || cancelled) return
        
        const [customersData, invoiceData] = await Promise.all([
          api('/customer', { token }).catch(() => []),
          isEdit ? api(`/invoice/${id}`, { token }) : Promise.resolve(null)
        ])
        
        if (!cancelled) {
          setCustomers(customersData || [])
          if (invoiceData) {
            setDocNumber(invoiceData.docNumber || '')
            setTxnDate(invoiceData.txnDate || todayISO())
            setCustomerId(invoiceData.customer ? invoiceData.customer.id.toString() : '')
            setShipAddr(invoiceData.shipAddr || '')
            setShipDate(invoiceData.shipDate || '')
            setDueDate(invoiceData.dueDate || '')
            if (invoiceData.lines && invoiceData.lines.length > 0) {
              setLines(
                invoiceData.lines.map((l) => ({
                  lineNum: l.lineNum,
                  description: l.description || '',
                  quantity: l.quantity != null ? l.quantity.toString() : '1',
                  unitPrice: l.unitPrice != null ? l.unitPrice.toString() : '0',
                })),
              )
            }
            if (invoiceData.balance != null) {
              setBalance(Number.parseFloat(invoiceData.balance))
            } else {
              setBalance(Number.parseFloat(invoiceData.totalAmt) || 0)
            }
            if (invoiceData.payments && invoiceData.payments.length > 0) {
              setPaymentsAllocations(invoiceData.payments)
            }
          } else if (prefill) {
            // Match customer from prefill if possible
            const name = prefill.customer_name || prefill.vendor_name || prefill.customer || ''
            if (name && customersData) {
              const match = customersData.find(c => c.name.toLowerCase() === name.toLowerCase())
              if (match) setCustomerId(match.id.toString())
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not fetch details')
        }
      } finally {
        if (!cancelled) {
          setBusy(false)
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
      const q = Number.parseFloat(row.quantity) || 0
      const p = Number.parseFloat(row.unitPrice) || 0
      return sum + q * p
    }, 0)
  }, [lines])

  const displayBalance = isEdit ? balance : lineTotal

  function updateLine(index, patch) {
    setLines((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    )
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
      setError('Sign in and complete registration before creating invoices.')
      return
    }
    setBusy(true)
    try {
      // Filter out line items with 0 price
      const validLines = lines.filter(row => {
        const unitPrice = Number.parseFloat(row.unitPrice)
        return Number.isFinite(unitPrice) && unitPrice !== 0
      })

      const parsedLines = validLines.map((row, i) => {
        const quantity = Number.parseFloat(row.quantity)
        const unitPrice = Number.parseFloat(row.unitPrice)
        if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
          throw new Error(`Line ${row.lineNum || i + 1}: invalid quantity or unit price`)
        }
        return {
          lineNum: i + 1,
          description: row.description || `Line ${i + 1}`,
          quantity,
          unitPrice,
        }
      })

      if (parsedLines.length === 0) {
        throw new Error('Cannot create invoice without any valid line items (price must not be 0)')
      }

      const totalAmount = parsedLines.reduce((sum, row) => sum + (row.quantity * row.unitPrice), 0)
      if (totalAmount === 0) {
        throw new Error('Cannot create an invoice with a total amount of 0')
      }

      const token = await getFreshToken()
      if (!token) throw new Error('Not signed in')
      const body = {
        docNumber: docNumber.trim(),
        txnDate,
        shipAddr: shipAddr.trim() || undefined,
        shipDate: shipDate || undefined,
        dueDate: dueDate || undefined,
        lines: parsedLines,
      }
      if (customerId.trim() !== '') {
        const cid = Number.parseInt(customerId, 10)
        if (Number.isNaN(cid)) throw new Error('Customer ID must be a number')
        body.customerId = cid
      }
      if (!body.docNumber) throw new Error('Document number is required')
      const url = isEdit ? `/invoice/${id}` : '/invoice'
      const method = isEdit ? 'PUT' : 'POST'
      const created = await api(url, {
        method,
        token,
        body,
      })
      navigate('/invoices', { replace: false, state: { createdInvoiceId: created.id } })
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${isEdit ? 'update' : 'create'} invoice`)
    } finally {
      setBusy(false)
    }
  }

  function closeEditor() {
    navigate('/invoices')
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#F9FAFB] px-6 py-4">
        <div className="min-w-0">
          <h2 className="truncate text-[18px] font-bold text-[#111827]">
            {isEdit ? 'Edit Invoice' : 'Invoice'} {docNumber?.trim() ? `no.${docNumber.trim()}` : ''}
          </h2>
        </div>
        <div className="flex items-center gap-3">
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
      </div>

      <div className="px-6 py-6">
        {!me || meError ? (
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <p className="text-[14px] font-semibold text-[#111827]">
              Sign in and complete registration before creating invoices.
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
          <form id="create-invoice-form" onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
                <div className="grid grid-cols-3 gap-4">
                  <label className="text-[12px] font-bold text-[#6B7280]">
                    Customer
                    <CustomSelect
                      value={customerId}
                      onChange={(val) => {
                        setCustomerId(val)
                        const c = customers.find((x) => x.id.toString() === String(val))
                        if (c) {
                          if (c.addr) setShipAddr(c.addr)
                        }
                      }}
                      options={[
                        { value: '', label: 'Select a customer' },
                        ...customers.map((c) => ({ value: c.id, label: c.name }))
                      ]}
                      placeholder="Select a customer"
                      className="mt-1"
                      buttonClassName="h-10"
                      onCreateNew={() => setShowCustomerModal(true)}
                    />
                  </label>
                  <label className="text-[12px] font-bold text-[#6B7280]">
                    Customer email
                    <input
                      type="text"
                      placeholder="Separate emails with a comma"
                      className="mt-1 h-10 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#111827] placeholder-[#9CA3AF] focus:border-[#0F766E] focus:outline-none"
                    />
                    <span className="mt-2 inline-flex items-center gap-2 text-[12px] font-semibold text-[#64748B]">
                      <input
                        type="checkbox"
                        checked={sendLater}
                        onChange={(e) => setSendLater(e.target.checked)}
                        className="h-4 w-4 rounded border border-[#D1D5DB] bg-white accent-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/30"
                      />
                      Send later
                    </span>
                  </label>
                  <div className="flex items-start justify-end">
                    <div className="text-right">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">Balance due</p>
                      <p className="mt-1 text-[28px] font-bold tabular-nums text-[#111827]">
                        S${displayBalance.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-4">
                  <label className="col-span-1 text-[12px] font-bold text-[#6B7280]">
                    Billing address
                    <textarea
                      rows={3}
                      placeholder="Address"
                      className="mt-1 w-full resize-none rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] font-medium text-[#111827] placeholder-[#9CA3AF] focus:border-[#0F766E] focus:outline-none"
                    />
                  </label>
                  <label className="col-span-1 text-[12px] font-bold text-[#6B7280]">
                    Terms
                    <input
                      type="text"
                      defaultValue="Net 30"
                      className="mt-1 h-10 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#111827] focus:border-[#0F766E] focus:outline-none"
                    />
                  </label>
                  <label className="col-span-1 text-[12px] font-bold text-[#6B7280]">
                    Invoice date
                    <input
                      type="date"
                      value={txnDate}
                      onChange={(e) => setTxnDate(e.target.value)}
                      required
                      className="mt-1 h-10 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#111827] focus:border-[#0F766E] focus:outline-none"
                    />
                  </label>
                  <label className="col-span-1 text-[12px] font-bold text-[#6B7280]">
                    Due date
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="mt-1 h-10 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#111827] focus:border-[#0F766E] focus:outline-none"
                    />
                  </label>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-4">
                  <label className="col-span-1 text-[12px] font-bold text-[#6B7280]">
                    Invoice no.
                    <input
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.target.value)}
                      placeholder="260403"
                      required
                      className="mt-1 h-10 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#111827] placeholder-[#9CA3AF] focus:border-[#0F766E] focus:outline-none"
                    />
                  </label>
                  <div className="col-span-1" />
                  <label className="col-span-2 text-[12px] font-bold text-[#6B7280]">
                    Ship-to address (optional)
                    <input
                      value={shipAddr}
                      onChange={(e) => setShipAddr(e.target.value)}
                      placeholder="Optional"
                      className="mt-1 h-10 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#111827] placeholder-[#9CA3AF] focus:border-[#0F766E] focus:outline-none"
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

                <div className="mt-4 overflow-x-auto rounded-xl border border-[#E5E7EB]">
                  <table className="w-full min-w-[860px] border-collapse text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA] text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">
                        <th className="px-4 py-3 w-12">#</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3 w-24 text-right">Qty</th>
                        <th className="px-4 py-3 w-32 text-right">Unit price</th>
                        <th className="px-4 py-3 w-32 text-right">Line total</th>
                        <th className="px-4 py-3 w-16" />
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((row, index) => {
                        const q = Number.parseFloat(row.quantity) || 0
                        const p = Number.parseFloat(row.unitPrice) || 0
                        const sub = q * p
                        return (
                          <tr key={index} className={index % 2 === 1 ? 'bg-[#F9FAFB]/80' : 'bg-white'}>
                            <td className="border-b border-[#F3F4F6] px-4 py-3 font-semibold text-[#64748B]">
                              {index + 1}
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
                                value={row.quantity}
                                onChange={(e) => updateLine(index, { quantity: e.target.value })}
                                className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-right text-[13px] font-medium text-[#111827] focus:border-[#0F766E] focus:outline-none"
                              />
                            </td>
                            <td className="border-b border-[#F3F4F6] px-4 py-3">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={row.unitPrice}
                                onChange={(e) => updateLine(index, { unitPrice: e.target.value })}
                                className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-right text-[13px] font-medium text-[#111827] focus:border-[#0F766E] focus:outline-none"
                              />
                            </td>
                            <td className="border-b border-[#F3F4F6] px-4 py-3 text-right font-bold tabular-nums text-[#111827]">
                              {sub.toFixed(2)}
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

              {isEdit && paymentsAllocations.length > 0 && (
                <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
                  <h3 className="text-[#111827] text-[16px] font-bold">Payments Received</h3>
                  <div className="mt-4 overflow-x-auto rounded-xl border border-[#E5E7EB]">
                    <table className="w-full min-w-[600px] border-collapse text-left text-[13px]">
                      <thead>
                        <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA] text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Reference No.</th>
                          <th className="px-4 py-3">Deposit To</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentsAllocations.map((alloc, idx) => (
                          <tr key={alloc.id || idx} className={idx % 2 === 1 ? 'bg-[#F9FAFB]/80' : 'bg-white'}>
                            <td className="border-b border-[#F3F4F6] px-4 py-3 font-medium text-[#111827]">
                              {alloc.payment?.txnDate || '—'}
                            </td>
                            <td className="border-b border-[#F3F4F6] px-4 py-3 font-semibold text-[#0F766E]">
                              {alloc.payment?.id ? (
                                <button
                                  type="button"
                                  onClick={(e) => { e.preventDefault(); navigate(`/payment/edit/${alloc.payment.id}`); }}
                                  className="hover:underline"
                                >
                                  {alloc.payment?.docNumber || '—'}
                                </button>
                              ) : (
                                alloc.payment?.docNumber || '—'
                              )}
                            </td>
                            <td className="border-b border-[#F3F4F6] px-4 py-3 text-[#64748B]">
                              {alloc.payment?.depositTo || 'Bank'}
                            </td>
                            <td className="border-b border-[#F3F4F6] px-4 py-3 text-right font-bold tabular-nums text-[#111827]">
                              {Number.parseFloat(alloc.amount || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <div className="w-full max-w-[420px] space-y-2 text-[13px]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#64748B]">Total</span>
                    <span className="font-bold tabular-nums text-[#111827]">{lineTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#64748B]">Balance due</span>
                    <span className="font-bold tabular-nums text-[#111827]">{displayBalance.toFixed(2)}</span>
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
              type="button"
              onClick={() => navigate('/invoice/payment')}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[#374151] px-5 text-[14px] font-bold text-white hover:bg-[#4B5563]"
              title="Record payment for one or more invoices"
            >
              Receive payment
            </button>
            {/*<button*/}
            {/*  type="button"*/}
            {/*  className="inline-flex h-10 items-center justify-center rounded-xl bg-[#374151] px-5 text-[14px] font-bold text-white hover:bg-[#4B5563]"*/}
            {/*>*/}
            {/*  Print or Preview*/}
            {/*</button>*/}
            <button
              type="submit"
              form="create-invoice-form"
              disabled={busy}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[#0F766E] px-5 text-[14px] font-bold text-white hover:bg-[#0F766E]/90 disabled:opacity-60"
            >
              {busy ? 'Saving…' : (isEdit ? 'Update' : 'Save')}
            </button>
            {/*<button*/}
            {/*  type="submit"*/}
            {/*  form="create-invoice-form"*/}
            {/*  disabled={busy || sendLater}*/}
            {/*  className="inline-flex h-10 items-center justify-center rounded-xl bg-[#0F766E] px-5 text-[14px] font-bold text-white hover:bg-[#0F766E]/90 disabled:opacity-60"*/}
            {/*>*/}
            {/*  {busy ? 'Saving…' : (isEdit ? 'Update and send' : 'Save and send')}*/}
            {/*</button>*/}
          </div>
        </div>
      </div>

      <QuickCreateCustomerModal 
        isOpen={showCustomerModal} 
        onClose={() => setShowCustomerModal(false)}
        onSuccess={(newCustomer) => {
          setCustomers(prev => [...prev, newCustomer])
          setCustomerId(newCustomer.id.toString())
          if (newCustomer.addr) setShipAddr(newCustomer.addr)
        }}
      />
    </div>
  )
}
