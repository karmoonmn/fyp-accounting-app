import React from 'react'
import { HiOutlinePaperAirplane, HiOutlinePaperClip, HiOutlineSparkles, HiOutlineXMark } from 'react-icons/hi2'
import DashboardLayout from '../components/DashboardLayout'

const SUGGESTED_ACTIONS = [
  { title: 'Summarize cash position', prompt: 'Summarize my cash position for this month.' },
  { title: 'Find overdue invoices', prompt: 'Show overdue invoices and total amount outstanding.' },
  { title: 'Prepare bill payments', prompt: 'Which bills should I pay this week to avoid overdue?' },
  { title: 'Explain net cash flow', prompt: 'Explain why my net cash flow changed vs last period.' },
  { title: 'Draft invoice email', prompt: 'Draft a polite invoice reminder email for an overdue invoice.' },
  { title: 'Forecast next 6 months', prompt: 'Give a simple forecast for the next 6 months and key risks.' },
]

function bytesLabel(n) {
  if (!Number.isFinite(n)) return '—'
  const kb = 1024
  const mb = 1024 * 1024
  if (n >= mb) return `${(n / mb).toFixed(1)} MB`
  if (n >= kb) return `${Math.round(n / kb)} KB`
  return `${n} B`
}

export default function QuickAction() {
  const [input, setInput] = React.useState('')
  const [messages, setMessages] = React.useState(() => [
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hi — drop a document or ask me about invoices, bills, payments, or reports.',
    },
  ])
  const [files, setFiles] = React.useState([])
  const listRef = React.useRef(null)
  const fileInputRef = React.useRef(null)

  React.useEffect(() => {
    if (!listRef.current) return
    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  function addFiles(fileList) {
    const incoming = Array.from(fileList || [])
    if (!incoming.length) return
    setFiles((prev) => {
      const next = [...prev]
      for (const f of incoming) {
        next.push({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, file: f })
      }
      return next
    })
  }

  function removeFile(id) {
    setFiles((prev) => prev.filter((x) => x.id !== id))
  }

  function send(text) {
    const trimmed = (text ?? input).trim()
    if (!trimmed) return
    const userId = `u-${Date.now()}`
    setMessages((prev) => [...prev, { id: userId, role: 'user', text: trimmed }])
    setInput('')
    window.setTimeout(() => {
      const docNote = files.length
        ? `I can see ${files.length} uploaded file(s). When you connect an AI backend, you can send these documents for extraction/classification.`
        : 'Upload a receipt, invoice PDF, or bank statement to help me answer with evidence.'
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: `This is a UI preview. ${docNote}`,
        },
      ])
    }, 450)
  }

  const checkboxClass =
    'h-4 w-4 rounded border border-[#D1D5DB] bg-white accent-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/30'

  return (
    <DashboardLayout activeNav="quick">
      <div className="space-y-5">
        <div>
          <h2 className="text-[#111827] text-[28px] font-bold tracking-tight">Quick Action</h2>
          <p className="mt-1 text-[14px] font-medium text-[#64748B]">
            Chat with the assistant and upload documents for faster accounting workflows.
          </p>
        </div>

        {/*<div className="grid grid-cols-[1.6fr_1fr] gap-6">*/}
        <div className="w-full">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#CCFBF1] px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F766E] text-white">
                  <HiOutlineSparkles className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[15px] font-bold text-[#0F766E]">AI Assistant</p>
                  <p className="text-[11px] font-medium text-[#64748B]">Suggested actions + document inbox</p>
                </div>
              </div>
              <label className="flex items-center gap-2 text-[12px] font-semibold text-[#64748B]">
                <input type="checkbox" className={checkboxClass} defaultChecked />
                Use documents in answers
              </label>
            </div>

            <div ref={listRef} className="h-[520px] overflow-y-auto bg-[#F9FAFB] px-5 py-4 space-y-3">
              {messages.map((m) =>
                m.role === 'user' ? (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-md bg-[#0F766E] px-3 py-2 text-[13px] font-medium text-white">
                      {m.text}
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] leading-relaxed text-[#374151]">
                      {m.text}
                    </div>
                  </div>
                ),
              )}
            </div>

            <div className="border-t border-[#E5E7EB] bg-white px-5 py-4">
              <div className="flex flex-wrap gap-2 pb-3">
                {SUGGESTED_ACTIONS.slice(0, 6).map((a) => (
                  <button
                    key={a.title}
                    type="button"
                    onClick={() => send(a.prompt)}
                    className="rounded-full border border-[#0F766E]/30 bg-white px-3 py-1.5 text-[12px] font-semibold text-[#0F766E] hover:bg-[#CCFBF1]"
                  >
                    {a.title}
                  </button>
                ))}
              </div>

              <div className="relative flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#0F766E] hover:bg-[#F9FAFB]"
                  title="Upload documents"
                  aria-label="Upload documents"
                >
                  <HiOutlinePaperClip className="h-5 w-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                />

                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      send()
                    }
                  }}
                  placeholder="Ask anything…"
                  rows={2}
                  className="min-h-[44px] flex-1 resize-none rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5 text-[13px] text-[#111827] placeholder-[#9CA3AF] focus:border-[#0F766E] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                />
                <button
                  type="button"
                  onClick={() => send()}
                  className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0F766E] text-white hover:bg-[#0F766E]/90"
                  aria-label="Send message"
                >
                  <HiOutlinePaperAirplane className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-2 text-center text-[10px] text-[#9CA3AF]">Powered by AI · Preview</p>
            </div>
          </div>

          {/*<div className="space-y-6">*/}
          {/*  <div*/}
          {/*    onDragOver={(e) => e.preventDefault()}*/}
          {/*    onDrop={(e) => {*/}
          {/*      e.preventDefault()*/}
          {/*      addFiles(e.dataTransfer.files)*/}
          {/*    }}*/}
          {/*    className="rounded-2xl border border-dashed border-[#0F766E]/30 bg-white p-6 shadow-sm"*/}
          {/*  >*/}
          {/*    <p className="text-[#111827] text-[16px] font-bold">Documents</p>*/}
          {/*    <p className="mt-1 text-[13px] font-medium text-[#64748B]">*/}
          {/*      Drag & drop receipts, invoices, or statements here.*/}
          {/*    </p>*/}
          {/*    <button*/}
          {/*      type="button"*/}
          {/*      onClick={() => fileInputRef.current?.click()}*/}
          {/*      className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[#0F766E] px-4 text-[13px] font-bold text-white hover:bg-[#0F766E]/90"*/}
          {/*    >*/}
          {/*      Upload files*/}
          {/*    </button>*/}

          {/*    {files.length ? (*/}
          {/*      <div className="mt-5 space-y-2">*/}
          {/*        {files.map((x) => (*/}
          {/*          <div*/}
          {/*            key={x.id}*/}
          {/*            className="flex items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2"*/}
          {/*          >*/}
          {/*            <div className="min-w-0">*/}
          {/*              <p className="truncate text-[13px] font-semibold text-[#111827]">{x.file.name}</p>*/}
          {/*              <p className="text-[11px] font-semibold text-[#64748B]">*/}
          {/*                {bytesLabel(x.file.size)} · {x.file.type || 'file'}*/}
          {/*              </p>*/}
          {/*            </div>*/}
          {/*            <button*/}
          {/*              type="button"*/}
          {/*              onClick={() => removeFile(x.id)}*/}
          {/*              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#64748B] hover:bg-white hover:text-[#111827]"*/}
          {/*              aria-label="Remove file"*/}
          {/*              title="Remove"*/}
          {/*            >*/}
          {/*              <HiOutlineXMark className="h-5 w-5" />*/}
          {/*            </button>*/}
          {/*          </div>*/}
          {/*        ))}*/}
          {/*      </div>*/}
          {/*    ) : (*/}
          {/*      <div className="mt-5 rounded-xl bg-[#F9FAFB] px-3 py-3 text-[12px] font-medium text-[#64748B]">*/}
          {/*        No files uploaded yet.*/}
          {/*      </div>*/}
          {/*    )}*/}
          {/*  </div>*/}

          {/*  <div className="rounded-2xl bg-[#CCFBF1] p-6">*/}
          {/*    <p className="text-[13px] font-bold text-[#0F766E]">Suggested workflows</p>*/}
          {/*    <ul className="mt-3 space-y-2 text-[13px] font-medium text-[#0F766E]">*/}
          {/*      <li>- Upload a receipt → categorize to chart of accounts</li>*/}
          {/*      <li>- Upload an invoice PDF → extract line items</li>*/}
          {/*      <li>- Upload a bank statement → reconcile transactions</li>*/}
          {/*    </ul>*/}
          {/*  </div>*/}
          {/*</div>*/}
        </div>
      </div>
    </DashboardLayout>
  )
}

