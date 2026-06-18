import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  HiOutlinePlusCircle,
  HiOutlineSparkles,
  HiOutlinePaperAirplane,
  HiOutlineTrash,
  HiOutlineChatBubbleLeftRight,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlinePencilSquare,
  HiOutlineDocumentArrowUp,
  HiOutlineArrowPath,
  HiOutlineClock,
} from 'react-icons/hi2'
import DashboardLayout from '../components/DashboardLayout'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useNavigate, useSearchParams } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080'

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function formatMarkdown(text) {
  if (!text) return ''
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code style="background:#E5E7EB;padding:1px 5px;border-radius:4px;font-size:12px">$1</code>')
    .replace(/^[\*•\-]\s+(.*)$/gm, '<div style="padding-left:12px;margin:4px 0">• $1</div>')
    .replace(/\n/g, '<br/>')
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  })
}

/* ─── Confirmation Card ────────────────────────────────────────────────────── */

function ConfirmationCard({ action, onConfirm, onCancel, onModify }) {
  if (!action) return null
  return (
    <div className="mx-1 my-2 overflow-hidden rounded-2xl border border-[#0F766E]/20 bg-gradient-to-b from-[#F0FDF4] to-white shadow-sm">
      <div className="flex items-center gap-2 bg-[#0F766E]/5 px-4 py-2.5 border-b border-[#0F766E]/10">
        <HiOutlineSparkles className="h-3.5 w-3.5 text-[#0F766E]" />
        <span className="text-[12px] font-bold text-[#0F766E] tracking-wide uppercase">Proposed Action</span>
      </div>
      <div className="px-4 py-3">
        <p className="text-[13px] font-semibold text-[#111827] leading-snug">{action.summary}</p>
        {action.line_items?.length > 0 && (
          <div className="mt-3 space-y-1.5 rounded-xl bg-[#F9FAFB] p-3 border border-[#E5E7EB]">
            {action.line_items.map((item, i) => (
              <div key={i} className="flex justify-between text-[12px] text-[#374151] items-start mb-1.5 last:mb-0">
                <div className="flex flex-col mr-3">
                  <span className="truncate">{item.description} {item.account_name && <span className="text-[#9CA3AF] text-[11px] ml-1">({item.account_name})</span>}</span>
                  {(item.quantity != null && item.unit_price != null && item.quantity !== 1 && item.unit_price !== 0) && (
                    <span className="text-[#6B7280] text-[11px]">{item.quantity} × ${item.unit_price.toFixed(2)}</span>
                  )}
                </div>
                <span className="font-semibold shrink-0 mt-0.5">${(item.amount || 0).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-[#E5E7EB] pt-2 mt-2 flex justify-between text-[13px] font-bold text-[#111827]">
              <span>Total</span>
              <span>${(action.total_amount || 0).toFixed(2)}</span>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button disabled={action.status === 'completed' || action.status === 'cancelled'} onClick={onConfirm} className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0F766E] px-3 py-2.5 text-[12px] font-bold text-white transition-all ${action.status === 'completed' || action.status === 'cancelled' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#0d6d66] active:scale-[0.98]'}`}>
            <HiOutlineCheckCircle className="h-4 w-4" /> {action.status === 'completed' ? 'Saved' : 'Confirm'}
          </button>
          <button disabled={action.status === 'completed' || action.status === 'cancelled'} onClick={onCancel} className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border border-[#FEE2E2] px-3 py-2.5 text-[12px] font-bold text-[#DC2626] transition-all ${action.status === 'completed' || action.status === 'cancelled' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#FEF2F2] active:scale-[0.98]'}`}>
            <HiOutlineXCircle className="h-4 w-4" /> {action.status === 'cancelled' ? 'Cancelled' : 'Cancel'}
          </button>
          <button disabled={action.status === 'completed' || action.status === 'cancelled'} onClick={() => onModify('chat')} className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border border-[#E5E7EB] px-3 py-2.5 text-[12px] font-bold text-[#374151] transition-all ${action.status === 'completed' || action.status === 'cancelled' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#F9FAFB] active:scale-[0.98]'}`}>
            <HiOutlineChatBubbleLeftRight className="h-4 w-4" /> Modify via Chat
          </button>
          <button disabled={action.status === 'completed' || action.status === 'cancelled'} onClick={() => onModify('manual')} className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border border-[#E5E7EB] px-3 py-2.5 text-[12px] font-bold text-[#374151] transition-all ${action.status === 'completed' || action.status === 'cancelled' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#F9FAFB] active:scale-[0.98]'}`}>
            <HiOutlinePencilSquare className="h-4 w-4" /> Modify Manually
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Page ────────────────────────────────────────────────────────────── */

export default function ChatsPage() {
  const { me, getFreshToken, idToken: token } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Conversations list
  const [conversations, setConversations] = useState([])
  const [convsLoading, setConvsLoading] = useState(true)

  // Active conversation
  const [activeConvId, setActiveConvId] = useState(null)
  const [messages, setMessages] = useState([])
  const [msgsLoading, setMsgsLoading] = useState(false)
  const [isComposing, setIsComposing] = useState(false)

  // Send state
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)

  const listRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)
  // When a fresh response just arrived (activeConvId just set from null), skip the
  // DB message reload so we don't wipe optimistic UI / confirmation card.
  const skipNextLoadRef = useRef(false)
  const isSendingRef = useRef(false)

  const companyId = me?.company?.id || me?.companyId || 1

  /* ── Load conversations from backend ────────────────────────────────────── */

  const loadConversations = useCallback(async () => {
    if (!token) return
    setConvsLoading(true)
    try {
      const data = await api('/api/conversations', { token })
      if (data) setConversations(data)
    } catch (e) {
      console.error('Failed to load conversations:', e)
    }
    setConvsLoading(false)
  }, [token])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  /* ── Auto-select conversation from query param ──────────────────────────── */

  useEffect(() => {
    const convIdFromUrl = searchParams.get('conversation')
    if (!convIdFromUrl || !token) return
    // Already active — no need to re-fetch and re-trigger effects
    if (convIdFromUrl === activeConvId) return

    api(`/api/conversations/${convIdFromUrl}`, { token })
      .then((data) => {
        if (!data) return
        setConversations((prev) => {
          if (prev.find(c => c.id === data.id)) return prev
          return [data, ...prev]
        })
        setActiveConvId(convIdFromUrl)
        sessionStorage.setItem('chatspage_active_conv', convIdFromUrl)
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, token])

  /* ── Load messages for active conversation ──────────────────────────────── */

  const fetchMessages = useCallback(async (convId) => {
    if (!convId || !token) return []
    try {
      const data = await api(`/api/conversations/${convId}/messages`, { token })
      return data || []
    } catch {
      return []
    }
  }, [token])

  const loadMessages = useCallback(async (convId) => {
    if (!convId) return
    setMsgsLoading(true)
    const data = await fetchMessages(convId)
    setMessages(data)
    setMsgsLoading(false)
  }, [fetchMessages])

  useEffect(() => {
    if (!activeConvId) {
      setMessages([])
      setPendingAction(null)
      sessionStorage.removeItem('chatspage_active_conv')
      return
    }
    setIsComposing(false)
    sessionStorage.setItem('chatspage_active_conv', activeConvId)
    
    // Restore pendingAction from sessionStorage if it exists
    const savedAction = sessionStorage.getItem(`pending_action_${activeConvId}`)
    if (savedAction) {
      try {
        setPendingAction(JSON.parse(savedAction))
      } catch (e) {
        setPendingAction(null)
      }
    } else {
      setPendingAction(null)
    }

    // Skip DB reload if we just set activeConvId from a fresh send() response
    // (the optimistic UI is already correct and the confirmation card is live)
    if (skipNextLoadRef.current) {
      skipNextLoadRef.current = false
      return
    }

    loadMessages(activeConvId)
  }, [activeConvId, loadMessages])

  /* ── Auto-scroll ────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!listRef.current) return
    listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, isSending])

  /* ── New chat ───────────────────────────────────────────────────────────── */

  async function handleNewChat() {
    if (!token) return
    setActiveConvId(null)
    setMessages([])
    setPendingAction(null)
    setInput('')
    setIsComposing(true)
    sessionStorage.removeItem('chatspage_active_conv')
    // Don't pre-create conversation — it will be created by the backend
    // when the first message is sent
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  /* ── Delete conversation ────────────────────────────────────────────────── */

  async function handleDeleteConversation(convId, e) {
    e.stopPropagation()
    try {
      await api(`/api/conversations/${convId}`, { method: 'DELETE', token })
      setConversations((prev) => prev.filter((c) => c.id !== convId))
      if (activeConvId === convId) {
        setActiveConvId(null)
        setMessages([])
        setPendingAction(null)
        sessionStorage.removeItem(`pending_action_${convId}`)
        setIsComposing(false)
        sessionStorage.removeItem('chatspage_active_conv')
      }
    } catch (e) {
      console.error('Failed to delete conversation:', e)
    }
  }

  /* ── Generate conversation title (first message only) ──────────────────── */

  async function generateAndSaveTitle(convId, userText, freshToken) {
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

      // Save title via API
      await api(`/api/conversations/${convId}`, {
        method: 'PATCH',
        body: { title },
        token: freshToken,
      })

      // Update sidebar immediately
      setConversations((prev) =>
        prev.map((c) => c.id === convId ? { ...c, title } : c)
      )
    } catch (err) {
      console.error('Failed to generate title:', err)
    }
  }

  /* ── Send message ───────────────────────────────────────────────────────── */

  async function send(textOverride) {
    if (isSendingRef.current) return
    const trimmed = (textOverride ?? input).trim()
    if (!trimmed && !selectedFile) return
    if (isSending) return

    isSendingRef.current = true
    const freshToken = await getFreshToken()
    if (!freshToken) {
      isSendingRef.current = false
      return
    }

    const userText = trimmed || `[Uploaded: ${selectedFile?.name}]`
    const isFirstMessage = messages.length === 0

    // Optimistic insert user message into UI
    const tempUserId = `temp-u-${Date.now()}`
    setMessages((prev) => [...prev, { id: tempUserId, role: 'user', content: userText, createdAt: new Date().toISOString() }])
    setInput('')
    
    // Clear the old card if it's already finished
    if (pendingAction && (pendingAction.status === 'completed' || pendingAction.status === 'cancelled')) {
      setPendingAction(null)
      if (activeConvId) sessionStorage.removeItem(`pending_action_${activeConvId}`)
    }
    
    setIsSending(true)
    setIsComposing(false)

    try {
      // Call AI agent — the backend saves both user + AI messages to SQL
      const formData = new FormData()
      formData.append('message', userText)
      formData.append('company_id', companyId.toString())
      formData.append('auth_token', freshToken)

      if (activeConvId) formData.append('conversation_id', activeConvId)
      if (selectedFile) formData.append('file', selectedFile)

      const res = await fetch(`${API_BASE}/api/agent/chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${freshToken}`, 'X-Company-Id': String(companyId) },
        body: formData,
      })
      const data = await res.json()
      const resolvedConvId = data.conversation_id || activeConvId

      // ── Save pendingAction to sessionStorage BEFORE setActiveConvId ──────
      // This ensures the useEffect that fires on activeConvId change can
      // immediately restore it from sessionStorage (avoiding the race condition
      // where useEffect fires before we reach setPendingAction below).
      if (data.requires_confirmation && data.proposed_action && resolvedConvId) {
        sessionStorage.setItem(`pending_action_${resolvedConvId}`, JSON.stringify(data.proposed_action))
      }

      // If this was the first message, the backend created a conversation
      if (data.conversation_id && !activeConvId) {
        const newConvId = data.conversation_id
        // Skip the DB message reload — our optimistic UI is already correct
        skipNextLoadRef.current = true
        setActiveConvId(newConvId)
        sessionStorage.setItem('chatspage_active_conv', newConvId)
        setSearchParams({ conversation: newConvId })

        // Add to sidebar with the new threadId
        setConversations((prev) => {
          if (prev.find(c => c.id === newConvId)) return prev
          return [{ id: newConvId, title: null, threadId: data.thread_id, createdAt: new Date().toISOString() }, ...prev]
        })

        // Generate title from first message
        generateAndSaveTitle(newConvId, userText, freshToken)
      } else if (isFirstMessage && activeConvId) {
        generateAndSaveTitle(activeConvId, userText, freshToken)
      }

      const aiText = data.response || 'I processed your request.'

      // Add AI response to UI
      const tempAiId = `temp-a-${Date.now()}`
      setMessages((prev) => [...prev, { id: tempAiId, role: 'assistant', content: aiText, createdAt: new Date().toISOString() }])

      if (data.requires_confirmation && data.proposed_action) {
        setPendingAction(data.proposed_action)
      }
    } catch (err) {
      const errText = `Sorry, an error occurred: ${err.message}`
      setMessages((prev) => [...prev, { id: `e-${Date.now()}`, role: 'assistant', content: errText }])
    } finally {
      setIsSending(false)
      isSendingRef.current = false
      setSelectedFile(null)
    }
  }

  /* ── Confirm / Cancel agent actions ────────────────────────────────────── */

  async function handleConfirm() {
    const activeConv = conversations.find((c) => c.id === activeConvId)
    const agentThreadId = activeConv?.threadId
    if (!agentThreadId) return
    const freshToken = await getFreshToken()
    setIsSending(true)
    
    setPendingAction(prev => ({ ...prev, status: 'completed' }))
    
    try {
      const res = await fetch(`${API_BASE}/api/agent/confirm/${agentThreadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freshToken}` },
        body: JSON.stringify({ action: 'confirm' }),
      })
      const data = await res.json()
      const text = data.response || 'Action confirmed.'
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: text }])
      // Clean sessionStorage so stale data doesn't interfere with the next invoice
      if (activeConvId) sessionStorage.removeItem(`pending_action_${activeConvId}`)
    } catch (err) {
      setMessages((prev) => [...prev, { id: `e-${Date.now()}`, role: 'assistant', content: `Error: ${err.message}` }])
    } finally { setIsSending(false) }
  }

  async function handleCancel() {
    const activeConv = conversations.find((c) => c.id === activeConvId)
    const agentThreadId = activeConv?.threadId
    if (!agentThreadId) return
    const freshToken = await getFreshToken()
    setIsSending(true)
    setPendingAction(prev => ({ ...prev, status: 'cancelled' }))
    try {
      const res = await fetch(`${API_BASE}/api/agent/cancel/${agentThreadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freshToken}` },
      })
      const data = await res.json()
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: data.response || 'Action cancelled.' }])
      // Clean sessionStorage so stale data doesn't interfere with the next invoice
      if (activeConvId) sessionStorage.removeItem(`pending_action_${activeConvId}`)
    } catch {
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: 'Action cancelled.' }])
    } finally { setIsSending(false) }
  }

  function handleModify(mode) {
    if (mode === 'manual') {
      const summary = (pendingAction?.summary || '').toLowerCase()
      const type = pendingAction?.action_type || ''
      if (summary.includes('invoice') || type.includes('invoice')) navigate('/invoice/new', { state: { prefill: pendingAction } })
      else if (summary.includes('bill') || type.includes('bill')) navigate('/bill/new', { state: { prefill: pendingAction } })
      else navigate('/invoice/new', { state: { prefill: pendingAction } })
    } else {
      // Build a helpful pre-fill so the user knows exactly what to change
      const a = pendingAction
      let prefill = 'Please modify the invoice'
      if (a) {
        const itemsDesc = a.line_items?.map(li => `${li.description} x${li.quantity} @$${li.unit_price}`).join(', ') || ''
        prefill = `Please modify the invoice: doc #${a.doc_number || ''}, customer: ${a.customer_name || 'unknown'}, items: ${itemsDesc}, total: $${(a.total_amount || 0).toFixed(2)}. Change: `
      }
      setInput(prefill)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  /* ── Derived state ──────────────────────────────────────────────────────── */

  const activeConv = conversations.find((c) => c.id === activeConvId)
  const hasMessages = messages.length > 0

  /* ── Render ─────────────────────────────────────────────────────────────── */

  return (
    <DashboardLayout activeNav="chats">
      <div className="flex h-full -m-6 overflow-hidden rounded-none" style={{ height: 'calc(100vh - 72px)' }}>

        {/* ── Left Panel: Conversation List ─────────────────────────────── */}
        <div className="w-[300px] shrink-0 flex flex-col border-r border-[#E5E7EB] bg-white">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2">
              <HiOutlineChatBubbleLeftRight className="h-5 w-5 text-[#0F766E]" />
              <h2 className="text-[16px] font-bold text-[#111827]">Chats</h2>
            </div>
            <button
              type="button"
              onClick={handleNewChat}
              className="flex items-center gap-1.5 rounded-xl bg-[#0F766E] px-3 py-2 text-[13px] font-bold text-white hover:bg-[#0d6d66] active:scale-[0.97] transition-all shadow-sm"
              title="New conversation"
            >
              <HiOutlinePlusCircle className="h-4 w-4" />
              New
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {convsLoading ? (
              <div className="flex items-center justify-center py-12">
                <HiOutlineArrowPath className="h-5 w-5 text-[#9CA3AF] animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3F4F6] mb-3">
                  <HiOutlineChatBubbleLeftRight className="h-7 w-7 text-[#9CA3AF]" />
                </div>
                <p className="text-[14px] font-semibold text-[#374151]">No chats yet</p>
                <p className="text-[13px] text-[#6B7280] mt-1">Start a new conversation with the AI Assistant</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  isActive={conv.id === activeConvId}
                  onClick={() => {
                    setActiveConvId(conv.id)
                    // Do NOT clear pending action here; the useEffect will restore it.
                    sessionStorage.setItem('chatspage_active_conv', conv.id)
                  }}
                  onDelete={(e) => handleDeleteConversation(conv.id, e)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Right Panel: Message Thread ───────────────────────────────── */}
        <div className="flex-1 flex flex-col bg-[#FAFBFC] min-w-0">
          {!activeConvId && !isComposing ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#0F766E]/10 to-[#14B8A6]/10 ring-1 ring-[#0F766E]/20">
                <HiOutlineSparkles className="h-10 w-10 text-[#0F766E]" />
              </div>
              <div className="text-center">
                <h3 className="text-[20px] font-bold text-[#111827]">AI Accounting Assistant</h3>
                <p className="mt-2 text-[14px] text-[#6B7280] max-w-sm">
                  Select a conversation from the left, or start a new chat to ask about invoices, expenses, forecasts and more.
                </p>
              </div>
              <button
                type="button"
                onClick={handleNewChat}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0F766E] px-5 py-3 text-[14px] font-bold text-white hover:bg-[#0d6d66] active:scale-[0.97] transition-all shadow-md shadow-[#0F766E]/20"
              >
                <HiOutlinePlusCircle className="h-5 w-5" />
                Start New Chat
              </button>
            </div>
          ) : (
            <>
              {/* Thread Header */}
              <div className="shrink-0 flex items-center justify-between border-b border-[#E5E7EB] bg-white px-6 py-3.5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F766E] to-[#14B8A6]">
                    <HiOutlineSparkles className="h-4.5 w-4.5 text-white h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-[#111827]">AI Accounting Assistant</p>
                    {activeConv && (
                      <p className="text-[12px] text-[#6B7280] flex items-center gap-1">
                        <HiOutlineClock className="h-3.5 w-3.5" />
                        {formatDate(activeConv.createdAt || activeConv.created_at)}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] font-semibold text-[#374151] hover:bg-[#F9FAFB] active:scale-[0.97] transition-all"
                  title="New conversation"
                >
                  <HiOutlinePlusCircle className="h-4 w-4" />
                  New Chat
                </button>
              </div>

              {/* Messages */}
              <div
                ref={listRef}
                className="flex-1 overflow-y-auto px-6 py-5"
                style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(15,118,110,0.03) 0%, transparent 50%)' }}
              >
                {msgsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <HiOutlineArrowPath className="h-5 w-5 text-[#9CA3AF] animate-spin" />
                  </div>
                ) : !hasMessages ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 py-12">
                    <p className="text-[14px] font-semibold text-[#374151]">New conversation started</p>
                    <p className="text-[13px] text-[#6B7280]">Ask me anything about your finances</p>
                    {/* Quick prompts */}
                    <div className="grid grid-cols-2 gap-3 mt-2 w-full max-w-md">
                      {[
                        { emoji: '📊', text: "What was my revenue last month?" },
                        { emoji: '📋', text: 'Show overdue invoices' },
                        { emoji: '🔮', text: 'Forecast next 3 months expenses' },
                        { emoji: '📄', text: 'Create an invoice for $500' },
                      ].map((q) => (
                        <button
                          key={q.text}
                          type="button"
                          onClick={() => send(q.text)}
                          className="flex flex-col items-start gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-4 text-left text-[13px] font-medium text-[#374151] shadow-sm hover:border-[#0F766E]/40 hover:bg-[#F0FDF4] hover:text-[#0F766E] hover:shadow-md active:scale-[0.98] transition-all"
                        >
                          <span className="text-[20px]">{q.emoji}</span>
                          <span>{q.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((m) =>
                      m.role === 'user' ? (
                        <div key={m.id} className="flex justify-end animate-[fadeSlideUp_0.25s_ease-out]">
                          <div className="max-w-[72%] rounded-2xl rounded-br-lg bg-gradient-to-br from-[#0F766E] to-[#0d6d66] px-4 py-3 text-[14px] font-medium text-white shadow-md shadow-[#0F766E]/20">
                            {m.content}
                          </div>
                        </div>
                      ) : (
                        <div key={m.id} className="flex justify-start gap-3 animate-[fadeSlideUp_0.25s_ease-out]">
                          <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F766E]/10 to-[#14B8A6]/10 ring-1 ring-[#0F766E]/20 shadow-sm">
                            <HiOutlineSparkles className="h-4 w-4 text-[#0F766E]" />
                          </div>
                          <div className="max-w-[72%] rounded-2xl rounded-bl-lg bg-white px-4 py-3 text-[14px] leading-relaxed text-[#374151] shadow-sm ring-1 ring-black/[0.06]">
                            <div dangerouslySetInnerHTML={{ __html: formatMarkdown(m.content) }} />
                          </div>
                        </div>
                      )
                    )}

                    {/* Typing indicator */}
                    {isSending && (
                      <div className="flex justify-start gap-3">
                        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F766E]/10 to-[#14B8A6]/10 ring-1 ring-[#0F766E]/20">
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
                )}
              </div>

              {/* File preview bar */}
              {selectedFile && (
                <div className="flex items-center gap-3 border-t border-[#E5E7EB] bg-[#F9FAFB] px-6 py-3">
                  <HiOutlineDocumentArrowUp className="h-5 w-5 text-[#0F766E]" />
                  <span className="flex-1 truncate text-[13px] font-medium text-[#374151]">{selectedFile.name}</span>
                  <button onClick={() => setSelectedFile(null)} className="text-[#9CA3AF] hover:text-[#374151] transition-colors">✕</button>
                </div>
              )}

              {/* Input bar */}
              <div className="shrink-0 border-t border-[#E5E7EB] bg-white px-6 py-4">
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
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
                    }}
                    placeholder="Message AI Assistant… (Enter to send, Shift+Enter for new line)"
                    rows={1}
                    className="min-h-[46px] max-h-[140px] flex-1 resize-none rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-[14px] text-[#111827] placeholder-[#9CA3AF] focus:border-[#0F766E] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0F766E]/10 transition-all shadow-inner"
                    disabled={isSending}
                  />
                  <button
                    type="button"
                    onClick={() => send()}
                    disabled={isSending || (!input.trim() && !selectedFile)}
                    className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0F766E] text-white shadow-md shadow-[#0F766E]/25 hover:bg-[#0d6d66] hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0 active:scale-95 transition-all"
                    aria-label="Send message"
                  >
                    <HiOutlinePaperAirplane className="h-5 w-5 -ml-0.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </DashboardLayout>
  )
}

/* ─── Conversation List Item ───────────────────────────────────────────────── */

function ConversationItem({ conv, isActive, onClick, onDelete }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-all border-b border-[#F3F4F6] ${
        isActive ? 'bg-[#F0FDF4] border-l-2 border-l-[#0F766E]' : 'hover:bg-[#F9FAFB]'
      }`}
    >
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${isActive ? 'bg-[#0F766E]/10' : 'bg-[#F3F4F6]'}`}>
        <HiOutlineSparkles className={`h-4 w-4 ${isActive ? 'text-[#0F766E]' : 'text-[#9CA3AF]'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-semibold truncate ${isActive ? 'text-[#0F766E]' : 'text-[#111827]'}`}>
          {conv.title || 'New Chat'}
        </p>
        <p className="text-[12px] text-[#9CA3AF] mt-0.5 flex items-center gap-1">
          <HiOutlineClock className="h-3 w-3" />
          {timeAgo(conv.createdAt || conv.created_at)}
        </p>
      </div>
      {(hovered || isActive) && (
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-[#FEE2E2] hover:text-[#DC2626] transition-all"
          title="Delete conversation"
        >
          <HiOutlineTrash className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
