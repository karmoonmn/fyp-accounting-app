import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { HiOutlineMagnifyingGlass } from 'react-icons/hi2'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

function formatMoney(n) {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 2,
  }).format(n || 0)
}

export default function GlobalTransactionSearch() {
  const navigate = useNavigate()
  const { getFreshToken } = useAuth()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const query = (q || '').trim()
    if (!query) {
      setResults([])
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const token = await getFreshToken()
        if (!token || cancelled) return
        const data = await api(`/transaction/filter?page=0&size=8`, {
          method: 'POST',
          token,
          body: { docNumber: query }
        })
        if (!cancelled) {
          const content = data?.content || []
          const mapped = content.map((t) => {
            let type = 'Unknown'
            let counterparty = '—'
            let amount = 0
            let route = ''

            if (t.customer) {
              type = 'Invoice'
              counterparty = t.customer.name
              amount = t.totalAmt
              route = `/invoice/edit/${t.id}`
            } else if (t.supplier) {
              type = 'Bill'
              counterparty = t.supplier.name
              amount = t.totalAmt
              route = `/bill/edit/${t.id}`
            } else if (t.depositTo || t.paymentType) {
              type = 'Payment'
              counterparty = t.depositTo || 'Bank'
              amount = t.totalAmount
              route = `/payments` // No specific payment edit page yet
            }

            return {
              id: t.id,
              no: t.docNumber || `TXN-${t.id}`,
              source: 'Accounting',
              type,
              counterparty,
              date: t.txnDate,
              amount,
              route,
            }
          })
          setResults(mapped)
          setActive(0)
        }
      } catch (err) {
        console.error('Search failed', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [q, getFreshToken])

  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (!wrapRef.current) return
      if (e.key === 'Escape') {
        setOpen(false)
        inputRef.current?.blur()
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActive((v) => Math.min(v + 1, Math.max(0, results.length - 1)))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActive((v) => Math.max(v - 1, 0))
      }
      if (e.key === 'Enter') {
        if (!results.length) return
        e.preventDefault()
        const hit = results[active] || results[0]
        if (hit?.route) navigate(hit.route)
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onDown)
    return () => window.removeEventListener('keydown', onDown)
  }, [open, results, active, navigate])

  useEffect(() => {
    function onClick(e) {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target)) setOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div ref={wrapRef} className="relative w-full max-w-[520px]">
      <div className="relative">
        <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          type="search"
          placeholder="Search transactions"
          className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] pl-10 pr-4 text-[13px] font-medium text-[#111827] placeholder-[#9CA3AF] shadow-sm focus:border-[#0F766E] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
        />
        {loading && q && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0F766E] border-t-transparent" />
          </div>
        )}
      </div>

      {open ? (
        <div className="absolute left-0 right-0 top-[52px] z-50 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl">
          <div className="border-b border-[#E5E7EB] bg-[#FAFAFA] px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">
            {q.trim() ? (loading ? 'Searching...' : `${results.length} result(s)`) : 'Type to search'}
          </div>
          {q.trim() ? (
            results.length ? (
              <div className="max-h-[360px] overflow-y-auto p-2">
                {results.map((t, idx) => (
                  <button
                    key={t.id}
                    type="button"
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => {
                      if (t.route) navigate(t.route)
                      setOpen(false)
                    }}
                    className={`w-full rounded-xl px-3 py-2 text-left transition-colors ${idx === active ? 'bg-[#CCFBF1]' : 'hover:bg-[#F9FAFB]'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-[13px] font-bold text-[#111827]">{t.no}</span>
                          <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[11px] font-bold text-[#64748B]">
                            {t.source}
                          </span>
                          <span className="text-[12px] font-semibold text-[#64748B]">{t.type}</span>
                        </div>
                        <div className="mt-0.5 truncate text-[13px] font-medium text-[#111827]">
                          {t.counterparty}
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] font-medium text-[#64748B]">
                          <span>{t.date}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[13px] font-bold tabular-nums text-[#111827]">
                          {formatMoney(t.amount)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              !loading && (
                <div className="px-4 py-6 text-center text-[13px] font-medium text-[#64748B]">
                  No matches. Try invoice number, vendor/customer, or amount.
                </div>
              )
            )
          ) : (
            <div className="px-4 py-5 text-[13px] font-medium text-[#64748B]">
              Search by invoice/bill number, customer/vendor, or amount.
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
