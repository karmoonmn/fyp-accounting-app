import React from 'react'
import { HiOutlinePaperAirplane, HiOutlineSparkles, HiOutlineXMark } from 'react-icons/hi2'

const QUICK_PROMPTS = ['Summarize my cash position', 'What bills are due?', 'Explain net cash flow']

export default function FloatingAiChat() {
  const [open, setOpen] = React.useState(false)
  const [input, setInput] = React.useState('')
  const [messages, setMessages] = React.useState(() => [
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hi — I’m your accounting assistant. Ask about invoices, cash flow, or reports.',
    },
  ])
  const listRef = React.useRef(null)

  React.useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  React.useEffect(() => {
    if (!open || !listRef.current) return
    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [open, messages])

  function send(text) {
    const trimmed = (text ?? input).trim()
    if (!trimmed) return
    const userId = `u-${Date.now()}`
    setMessages((prev) => [...prev, { id: userId, role: 'user', text: trimmed }])
    setInput('')
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: 'Thanks for your message. Connect a backend AI service here to return real answers. For now this is a UI preview.',
        },
      ])
    }, 450)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-6 right-6 z-100 flex h-14 w-14 items-center justify-center rounded-full bg-[#0F766E] text-white shadow-lg shadow-[#0F766E]/35 transition-transform hover:scale-105 hover:bg-[#0d6d66] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2 ${
          open ? 'scale-95 opacity-90' : ''
        }`}
        aria-expanded={open}
        aria-controls="ai-chat-panel"
        title={open ? 'Close assistant' : 'Open AI assistant'}
      >
        {open ? (
          <HiOutlineXMark className="h-7 w-7" aria-hidden />
        ) : (
          <HiOutlineSparkles className="h-7 w-7" aria-hidden />
        )}
      </button>

      {open ? (
        <div
          id="ai-chat-panel"
          role="dialog"
          aria-label="AI accounting assistant"
          className="fixed bottom-24 right-6 z-100 flex h-[min(520px,calc(100vh-7rem))] w-[min(100vw-1.5rem,400px)] flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#CCFBF1] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F766E] text-white">
                <HiOutlineSparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[15px] font-bold text-[#0F766E]">AI Assistant</p>
                <p className="text-[11px] font-medium text-[#64748B]">Accounting &amp; finance help</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-2 text-[#64748B] hover:bg-white/80 hover:text-[#111827]"
              aria-label="Close chat"
            >
              <HiOutlineXMark className="h-5 w-5" />
            </button>
          </div>

          <div
            ref={listRef}
            className="flex-1 space-y-3 overflow-y-auto bg-[#F9FAFB] p-4"
          >
            {messages.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#0F766E] px-3 py-2 text-[13px] font-medium text-white">
                    {m.text}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex justify-start">
                  <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] leading-relaxed text-[#374151]">
                    {m.text}
                  </div>
                </div>
              ),
            )}
            {messages.length === 1 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => send(q)}
                    className="rounded-full border border-[#0F766E]/30 bg-white px-3 py-1.5 text-left text-[12px] font-semibold text-[#0F766E] hover:bg-[#CCFBF1]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="border-t border-[#E5E7EB] bg-white p-3">
            <div className="relative flex items-end gap-2">
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
      ) : null}
    </>
  )
}
