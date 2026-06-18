import React, { useState, useRef, useEffect } from 'react'
import {
  HiOutlinePaperAirplane,
  HiOutlineSparkles,
  HiOutlineXMark,
  HiOutlineDocumentArrowUp,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlinePencilSquare,
  HiOutlineChatBubbleLeftRight,
  HiOutlineArrowPath,
  HiOutlineArrowsPointingOut,
} from 'react-icons/hi2'
import { useAuth } from '../context/AuthContext'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabase'

const QUICK_PROMPTS = [
  { emoji: '📊', text: 'What was my revenue last month?' },
  { emoji: '📋', text: 'Show overdue invoices' },
  { emoji: '🔮', text: 'Forecast next 3 months expenses' },
  { emoji: '📄', text: 'Create an invoice for $500' },
]

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080'

function formatMarkdown(text) {
  if (!text) return ''
  return text
    // Bold: **text** → <strong>text</strong>
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Inline code: `text` → <code>text</code>
    .replace(/`([^`]+)`/g, '<code style="background:#E5E7EB;padding:1px 5px;border-radius:4px;font-size:12px">$1</code>')
    // Bullet points: lines starting with * or • or -
    .replace(/^[\*•\-]\s+(.*)$/gm, '<div style="padding-left:12px;margin:4px 0">• $1</div>')
    // Line breaks
    .replace(/\n/g, '<br/>')
}

/* ─── Confirmation Card ────────────────────────────────────────────────────── */

function ConfirmationCard({ action, onConfirm, onCancel, onModify }) {
  if (!action) return null
  return (
    <div className="mx-1 my-2 overflow-hidden rounded-2xl border border-[#0F766E]/20 bg-gradient-to-b from-[#F0FDF4] to-white shadow-sm">
      <div className="flex items-center gap-2 bg-[#0F766E]/5 px-4 py-2.5 border-b border-[#0F766E]/10">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#0F766E]/10">
          <HiOutlineSparkles className="h-3.5 w-3.5 text-[#0F766E]" />
        </div>
        <span className="text-[12px] font-bold text-[#0F766E] tracking-wide uppercase">Proposed Action</span>
      </div>
      <div className="px-4 py-3">
        <p className="text-[13px] font-semibold text-[#111827] leading-snug">{action.summary}</p>
        {action.line_items?.length > 0 && (
          <div className="mt-3 space-y-1.5 rounded-xl bg-[#F9FAFB] p-3 border border-[#E5E7EB]">
            {action.line_items.map((item, i) => (
              <div key={i} className="flex justify-between text-[12px] text-[#374151]">
                <span className="truncate mr-3">{item.description}</span>
                <span className="font-semibold shrink-0 tabular-nums">${(item.amount || 0).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-[#E5E7EB] pt-2 mt-2 flex justify-between text-[13px] font-bold text-[#111827]">
              <span>Total</span>
              <span className="tabular-nums">${(action.total_amount || 0).toFixed(2)}</span>
            </div>
          </div>
        )}
        <div className="flex gap-2 mt-3">
          <button
            onClick={onConfirm}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0F766E] px-3 py-2.5 text-[12px] font-bold text-white shadow-sm shadow-[#0F766E]/20 hover:bg-[#0d6d66] active:scale-[0.98] transition-all"
          >
            <HiOutlineCheckCircle className="h-4 w-4" /> Confirm
          </button>
          <button
            onClick={() => onModify('chat')}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border border-[#E5E7EB] px-3 py-2.5 text-[12px] font-bold text-[#374151] shadow-sm hover:bg-[#F9FAFB] active:scale-[0.98] transition-all"
          >
            <HiOutlineChatBubbleLeftRight className="h-4 w-4" /> Modify via Chat
          </button>
          <button
            onClick={() => onModify('manual')}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border border-[#E5E7EB] px-3 py-2.5 text-[12px] font-bold text-[#374151] shadow-sm hover:bg-[#F9FAFB] active:scale-[0.98] transition-all"
          >
            <HiOutlinePencilSquare className="h-4 w-4" /> Modify Manually
          </button>
          <button
            onClick={onCancel}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border border-[#FEE2E2] px-3 py-2.5 text-[12px] font-bold text-[#DC2626] shadow-sm hover:bg-[#FEF2F2] active:scale-[0.98] transition-all"
          >
            <HiOutlineXCircle className="h-4 w-4" /> Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Component ───────────────────────────────────────────────────────── */

export default function FloatingAiChat() {
  const { idToken: token, me, getFreshToken, firebaseUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hi! I'm your AI Accounting Assistant. I can help create invoices, manage expenses, analyze finances, and forecast trends.\n\nHow can I help you today?",
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState(() => {
    // Clean up old separate threadId key from localStorage (no longer used)
    localStorage.removeItem('ai_thread_id')
    return localStorage.getItem('ai_conversation_id') || null
  })
  const [pendingAction, setPendingAction] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [activeChat, setActiveChat] = useState(false) // Track if chat is active in ChatsPage
  const listRef = useRef(null)
  const fileInputRef = useRef(null)
  const inputRef = useRef(null)

  const companyId = me?.company?.id || me?.companyId || 1
  const userId = me?.userId  // Firebase UID string — must match ChatsPage

  // Check if we're on ChatsPage with an active conversation
  const isOnChatsPage = location.pathname === '/chats'
  // Check both URL param and sessionStorage for active chat
  const hasActiveChat = Boolean(searchParams.get('conversation')) || activeChat

  // Poll sessionStorage to detect changes (since storage event doesn't fire in same tab)
  useEffect(() => {
    if (!isOnChatsPage) {
      setActiveChat(false)
      return
    }
    const interval = setInterval(() => {
      const hasActive = Boolean(sessionStorage.getItem('chatspage_active_conv'))
      setActiveChat(hasActive)
    }, 300) // Check every 300ms
    return () => clearInterval(interval)
  }, [isOnChatsPage])

  // Listen for external open events (for ChatsPage button)
  useEffect(() => {
    const handleOpenAiChat = () => setOpen(true)
    window.addEventListener('openAiChat', handleOpenAiChat)
    return () => window.removeEventListener('openAiChat', handleOpenAiChat)
  }, [])

  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    // Auto-focus input when opening
    setTimeout(() => inputRef.current?.focus(), 100)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!open || !listRef.current) return
    listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [open, messages, isLoading])

  // Load conversation history from Supabase on mount
  useEffect(() => {
    async function loadHistory() {
      if (!userId || !conversationId) return
      try {
        const { data, error } = await supabase
          .from('message')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
        
        if (!error && data && data.length > 0) {
          const formattedMsgs = data.map((m, i) => ({
            id: m.id || `hist-${i}`,
            role: m.role,
            text: m.content
          }))
          setMessages([
            {
              id: 'welcome',
              role: 'assistant',
              text: "Hi! I'm your AI Accounting Assistant. I can help create invoices, manage expenses, analyze finances, and forecast trends.\n\nHow can I help you today?",
            },
            ...formattedMsgs
          ])
        }
      } catch (err) {
        console.error("Failed to load chat history from Supabase", err)
      }
    }
    loadHistory()
  }, [userId, conversationId])

  async function send(text) {
    const trimmed = (text ?? input).trim()
    if (!trimmed && !selectedFile) return
    if (isLoading) return
    const freshToken = await getFreshToken()
    if (!freshToken) return

    // Ensure we have a conversation in Supabase
    let convId = conversationId
    if (!convId && userId) {
      try {
        const { data, error } = await supabase
          .from('conversation')
          .insert([{ user_id: userId }])
          .select()
          .single()
        if (!error && data) {
          convId = data.id
          setConversationId(convId)
          localStorage.setItem('ai_conversation_id', convId)
        }
      } catch (err) {
        console.error('Failed to create conversation', err)
      }
    }

    const userText = trimmed || `[Uploaded: ${selectedFile?.name}]`
    // First message = only the welcome bubble exists (length === 1)
    const isFirstMessage = messages.length === 1 && messages[0]?.id === 'welcome'
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text: userText }])
    setInput('')
    setIsLoading(true)

    try {
      // Save user message to Supabase
      if (convId) {
        await supabase.from('message').insert([{ conversation_id: convId, role: 'user', content: userText }])
      }

      const formData = new FormData()
      formData.append('message', userText)
      formData.append('company_id', companyId.toString())
      formData.append('auth_token', freshToken)
      // conversation_id IS the agent thread_id — satisfies conversation_state FK
      if (convId) formData.append('thread_id', convId)
      if (selectedFile) formData.append('file', selectedFile)
      const res = await fetch(`${API_BASE}/api/agent/chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${freshToken}`, 'X-Company-Id': String(companyId) },
        body: formData,
      })
      const data = await res.json()
      // No need to store data.thread_id separately — it echoes back convId
      const aiText = data.response || 'I processed your request.'
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: aiText }])

      // Save assistant message to Supabase
      if (convId) {
        await supabase.from('message').insert([{ conversation_id: convId, role: 'assistant', content: aiText }])
      }

      // Generate title after first exchange — fire-and-forget
      if (isFirstMessage && convId) {
        generateTitle(convId, userText, freshToken)
      }

      if (data.requires_confirmation && data.proposed_action) setPendingAction(data.proposed_action)
    } catch (err) {
      const errText = `Sorry, an error occurred: ${err.message}`
      setMessages((prev) => [...prev, { id: `e-${Date.now()}`, role: 'assistant', text: errText }])
      if (convId) {
        await supabase.from('message').insert([{ conversation_id: convId, role: 'assistant', content: errText }])
      }
    } finally {
      setIsLoading(false)
      setSelectedFile(null)
    }
  }

  async function generateTitle(convId, userText, freshToken) {
    try {
      const formData = new FormData()
      formData.append('message',
        `Generate a very short chat title (4-6 words max) for a conversation that starts with this message. Reply with ONLY the title, no quotes, no punctuation at the end:\n\n"${userText}"`
      )
      formData.append('company_id', companyId.toString())
      formData.append('auth_token', freshToken)
      const res = await fetch(`${API_BASE}/api/agent/chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${freshToken}`, 'X-Company-Id': String(companyId) },
        body: formData,
      })
      const data = await res.json()
      const raw = (data.response || '').trim()
      const title = raw.replace(/^["']|["']$/g, '').trim().slice(0, 60) || userText.slice(0, 50)
      await supabase.from('conversation').update({ title }).eq('id', convId)
    } catch (err) {
      console.error('Failed to generate title:', err)
    }
  }

  async function handleConfirm() {
    if (!conversationId) return
    const freshToken = await getFreshToken()
    setIsLoading(true)
    setPendingAction(null)
    try {
      const res = await fetch(`${API_BASE}/api/agent/confirm/${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freshToken}` },
        body: JSON.stringify({ action: 'confirm' }),
      })
      const data = await res.json()
      const text = data.response || 'Action confirmed.'
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text }])
      if (conversationId) {
        await supabase.from('message').insert([{ conversation_id: conversationId, role: 'assistant', content: text }])
      }
    } catch (err) {
      const errText = `Error: ${err.message}`
      setMessages((prev) => [...prev, { id: `e-${Date.now()}`, role: 'assistant', text: errText }])
      if (conversationId) {
        await supabase.from('message').insert([{ conversation_id: conversationId, role: 'assistant', content: errText }])
      }
    } finally { setIsLoading(false) }
  }

  async function handleCancel() {
    if (!conversationId) return
    const freshToken = await getFreshToken()
    setIsLoading(true)
    setPendingAction(null)
    try {
      const res = await fetch(`${API_BASE}/api/agent/cancel/${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freshToken}` },
      })
      const data = await res.json()
      const text = data.response || 'Action cancelled.'
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text }])
      if (conversationId) {
        await supabase.from('message').insert([{ conversation_id: conversationId, role: 'assistant', content: text }])
      }
    } catch (err) {
      const text = 'Action cancelled.'
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text }])
      if (conversationId) {
        await supabase.from('message').insert([{ conversation_id: conversationId, role: 'assistant', content: text }])
      }
    } finally { setIsLoading(false) }
  }

  function handleModify(mode) {
    if (mode === 'manual') {
      const summary = (pendingAction?.summary || '').toLowerCase()
      const type = pendingAction?.action_type || ''
      if (summary.includes('invoice') || type.includes('invoice')) {
        navigate('/invoice/new', { state: { prefill: pendingAction } })
      } else if (summary.includes('bill') || type.includes('bill')) {
        navigate('/bill/new', { state: { prefill: pendingAction } })
      } else {
        navigate('/invoice/new', { state: { prefill: pendingAction } })
      }
      setOpen(false)
      setPendingAction(null)
    } else {
      setPendingAction(null)
      setInput('I want to modify: ')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  function handleNewChat() {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      text: "Hi! I'm your AI Accounting Assistant. I can help create invoices, manage expenses, analyze finances, and forecast trends.\n\nHow can I help you today?",
    }])
    setConversationId(null)
    localStorage.removeItem('ai_conversation_id')
    setPendingAction(null)
    setInput('')
  }

  function handleOpenInChats() {
    // Read from localStorage directly — state update may still be in-flight if
    // the user clicks enlarge while a message is still being generated
    const convId = conversationId || localStorage.getItem('ai_conversation_id')
    if (convId) {
      // Set sessionStorage so FloatingAiChat knows a chat is active
      sessionStorage.setItem('chatspage_active_conv', convId)
      navigate(`/chats?conversation=${convId}`)
    } else {
      navigate('/chats')
    }
    setOpen(false)
  }

  // Hide floating button only when on ChatsPage AND a chat is selected
  const shouldHideFloatingButton = isOnChatsPage && hasActiveChat
  
  // Debug logging - remove after testing
  console.log('FloatingAiChat Hide Check:', {
    shouldHide: shouldHideFloatingButton,
    isOnChatsPage,
    hasActiveChat,
    pathname: location.pathname,
    activeChat,
    sessionVal: sessionStorage.getItem('chatspage_active_conv')
  })

  return (
    <>
      {/* ── Floating Action Button ───────────── */}
      {!shouldHideFloatingButton && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`fixed bottom-6 right-6 z-[80] group flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#0F766E] to-[#14B8A6] text-white shadow-xl shadow-[#0F766E]/30 transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-[#0F766E]/40 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0F766E]/30 ${
            open ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
          }`}
          title="Open AI assistant"
        >
          <HiOutlineSparkles className="h-6 w-6 transition-transform duration-300 group-hover:rotate-12" />
          <span className="absolute inset-0 rounded-full animate-ping bg-[#0F766E]/20 pointer-events-none" style={{ animationDuration: '3s' }} />
        </button>
      )}

      {/* ── Chat Drawer Backdrop ────────────────────────────────────────── */}
      <div
        className={`fixed inset-0 z-[90] bg-[#111827]/20 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
      />

      {/* ── Chat Drawer ──────────────────────────────────────────────────── */}
      <div
        id="ai-chat-panel"
        role="dialog"
        aria-label="AI accounting assistant"
        className={`fixed top-0 right-0 bottom-0 z-[100] flex w-[420px] max-w-full flex-col overflow-hidden bg-white shadow-2xl ring-1 ring-black/[0.05] transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="relative shrink-0 overflow-hidden shadow-sm z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0F766E] via-[#0d6d66] to-[#14B8A6]" />
          <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/[0.08]" />
          <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-white/[0.06]" />

          <div className="relative flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md ring-1 ring-white/30 shadow-inner">
                <HiOutlineSparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-white tracking-tight">AI Assistant</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {/*<span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />*/}
                  {/*<p className="text-[12px] font-medium text-white/80">Gemini 2.5 Flash</p>*/}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleOpenInChats}
                className="rounded-lg p-2 text-white/70 hover:bg-white/20 hover:text-white transition-all active:scale-95"
                title="Open in Chats page"
              >
                <HiOutlineArrowsPointingOut className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleNewChat}
                className="rounded-lg p-2 text-white/70 hover:bg-white/20 hover:text-white transition-all active:scale-95"
                title="New conversation"
              >
                <HiOutlineArrowPath className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-white/70 hover:bg-white/20 hover:text-white transition-all active:scale-95"
                aria-label="Close chat"
              >
                <HiOutlineXMark className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Messages ────────────────────────────────────────────────── */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto bg-[#FAFBFC] px-5 py-5"
          style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(15,118,110,0.03) 0%, transparent 50%)' }}
        >
          <div className="space-y-4">
            {messages.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="flex justify-end animate-[fadeSlideUp_0.25s_ease-out]">
                  <div className="max-w-[85%] rounded-2xl rounded-br-lg bg-gradient-to-br from-[#0F766E] to-[#0d6d66] px-4 py-3 text-[14px] font-medium text-white shadow-md shadow-[#0F766E]/20">
                    {m.text}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex justify-start gap-3 animate-[fadeSlideUp_0.25s_ease-out]">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F766E]/10 to-[#14B8A6]/10 ring-1 ring-[#0F766E]/20 shadow-sm">
                    <HiOutlineSparkles className="h-4 w-4 text-[#0F766E]" />
                  </div>
                  <div className="max-w-[85%] rounded-2xl rounded-bl-lg bg-white px-4 py-3 text-[14px] leading-relaxed text-[#374151] shadow-sm ring-1 ring-black/[0.06]">
                    <div dangerouslySetInnerHTML={{ __html: formatMarkdown(m.text) }} />
                  </div>
                </div>
              )
            )}

            {/* Quick prompts */}
            {messages.length === 1 && (
              <div className="grid grid-cols-2 gap-3 pt-3">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q.text}
                    type="button"
                    onClick={() => send(q.text)}
                    className="flex flex-col items-start gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-4 text-left text-[13px] font-medium text-[#374151] shadow-sm ring-1 ring-black/[0.02] hover:border-[#0F766E]/40 hover:bg-[#F0FDF4] hover:text-[#0F766E] hover:shadow-md active:scale-[0.98] transition-all duration-200"
                  >
                    <span className="text-[20px] leading-none bg-[#F9FAFB] p-2 rounded-xl border border-[#E5E7EB]">{q.emoji}</span>
                    <span className="leading-snug mt-1">{q.text}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex justify-start gap-3 animate-[fadeSlideUp_0.2s_ease-out]">
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F766E]/10 to-[#14B8A6]/10 ring-1 ring-[#0F766E]/20 shadow-sm">
                  <HiOutlineSparkles className="h-4 w-4 text-[#0F766E] animate-spin" style={{ animationDuration: '2s' }} />
                </div>
                <div className="rounded-2xl rounded-bl-lg bg-white px-4 py-3 shadow-sm ring-1 ring-black/[0.06] flex items-center gap-1.5 h-[46px]">
                  <span className="w-1.5 h-1.5 bg-[#0F766E]/50 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }} />
                  <span className="w-1.5 h-1.5 bg-[#0F766E]/50 rounded-full animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1s' }} />
                  <span className="w-1.5 h-1.5 bg-[#0F766E]/50 rounded-full animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1s' }} />
                </div>
              </div>
            )}

            {pendingAction && (
              <ConfirmationCard
                action={pendingAction}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                onModify={handleModify}
              />
            )}
          </div>
        </div>

        {/* ── File preview bar ─────────────────────────────────────────── */}
        {selectedFile && (
          <div className="flex items-center gap-3 border-t border-[#E5E7EB] bg-[#F9FAFB] px-5 py-3 shadow-inner">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F766E]/10 ring-1 ring-[#0F766E]/20">
              <HiOutlineDocumentArrowUp className="h-5 w-5 text-[#0F766E]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-[13px] font-bold text-[#374151]">{selectedFile.name}</p>
              <p className="text-[11px] font-medium text-[#6B7280]">File attached</p>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              className="rounded-xl p-2 text-[#9CA3AF] hover:bg-[#E5E7EB] hover:text-[#111827] transition-colors"
            >
              <HiOutlineXMark className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* ── Input bar ────────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-[#E5E7EB] bg-white px-5 py-4 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
          <div className="flex items-end gap-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#6B7280] bg-[#F3F4F6] hover:bg-[#E5E7EB] hover:text-[#0F766E] transition-colors"
              title="Upload invoice image or PDF"
            >
              <HiOutlineDocumentArrowUp className="h-5 w-5" />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder="Message AI Assistant…"
              rows={1}
              className="min-h-[46px] max-h-[140px] flex-1 resize-none rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-[14px] text-[#111827] placeholder-[#9CA3AF] focus:border-[#0F766E] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0F766E]/10 transition-all shadow-inner"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => send()}
              disabled={isLoading || (!input.trim() && !selectedFile)}
              className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0F766E] text-white shadow-md shadow-[#0F766E]/25 hover:bg-[#0d6d66] hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0 active:scale-95 transition-all"
              aria-label="Send message"
            >
              <HiOutlinePaperAirplane className="h-5 w-5 -ml-0.5" />
            </button>
          </div>
          <p className="mt-3 text-center text-[11px] font-medium text-[#9CA3AF]">
            {/*Powered by <span className="font-semibold">Gemini 2.5 Flash</span> · LangGraph*/}
          </p>
        </div>
      </div>

      {/* ── CSS animations ──────────────────────────────────────────────── */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
