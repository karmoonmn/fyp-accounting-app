import React from 'react'
import { useNavigate } from 'react-router-dom'
import { HiOutlineMagnifyingGlass } from 'react-icons/hi2'
import { getDemoTransactionIndex } from '../data/demoTransactions'

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function scoreMatch(q, t) {
  if (!q) return 0
  const hay = norm(
    [t.no, t.type, t.counterparty, t.memo, t.source, t.date].filter(Boolean).join(' '),
  )
  if (!hay) return 0
  if (hay.startsWith(q)) return 100
  if (hay.includes(q)) return 60
  // prefer exact id/number hits
  if (norm(t.no) === q) return 120
  return 0
}

function formatMoney(n) {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 2,
  }).format(n)
}

export default function GlobalTransactionSearch() {
  const navigate = useNavigate()
  const index = React.useMemo(() => getDemoTransactionIndex(), [])
  const [open, setOpen] = React.useState(false)
  const [q, setQ] = React.useState('')
  const [active, setActive] = React.useState(0)
  const wrapRef = React.useRef(null)
  const inputRef = React.useRef(null)

  const results = React.useMemo(() => {
    const query = norm(q)
    if (!query) return []
    return index
      .map((t) => ({ t, s: scoreMatch(query, t) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 8)
      .map((x) => x.t)
  }, [index, q])

  React.useEffect(() => {
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

  React.useEffect(() => {
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
            setActive(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          type="search"
          placeholder="Search transactions"
          className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] pl-10 pr-4 text-[13px] font-medium text-[#111827] placeholder-[#9CA3AF] shadow-sm focus:border-[#0F766E] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
        />
      </div>

      {open ? (
        <div className="absolute left-0 right-0 top-[52px] z-50 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl">
          <div className="border-b border-[#E5E7EB] bg-[#FAFAFA] px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">
            {q.trim() ? `${results.length} result(s)` : 'Type to search'}
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
                    className={`w-full rounded-xl px-3 py-2 text-left transition-colors ${
                      idx === active ? 'bg-[#CCFBF1]' : 'hover:bg-[#F9FAFB]'
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
                          {t.memo ? <span className="truncate">{t.memo}</span> : null}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[13px] font-bold tabular-nums text-[#111827]">
                          {formatMoney(t.amount)}
                        </div>
                        <div className="text-[11px] font-semibold text-[#0F766E]">Open</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-[13px] font-medium text-[#64748B]">
                No matches. Try invoice number, vendor/customer, or memo.
              </div>
            )
          ) : (
            <div className="px-4 py-5 text-[13px] font-medium text-[#64748B]">
              Search by invoice/bill number, customer/vendor, amount, or memo.
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

