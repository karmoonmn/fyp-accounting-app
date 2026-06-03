import React, { useState, useRef, useEffect } from 'react'
import {
  HiOutlineXMark,
  HiOutlinePaperAirplane,
  HiOutlineDocumentArrowUp,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlinePencilSquare,
  HiOutlineSparkles,
} from 'react-icons/hi2'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
          isUser
            ? 'bg-[#0F766E] text-white rounded-br-md'
            : 'bg-[#F3F4F6] text-[#111827] rounded-bl-md'
        }`}
      >
        {message.content.split('\n').map((line, i) => (
          <p key={i} className={i > 0 ? 'mt-1.5' : ''}>
            {line.replace(/\*\*(.*?)\*\*/g, (_, text) => text)}
          </p>
        ))}
      </div>
    </div>
  )
}

function ConfirmationCard({ action, onConfirm, onCancel, onModify }) {
  if (!action) return null
  return (
    <div className="mx-3 mb-3 rounded-2xl border-2 border-[#0F766E]/20 bg-[#F0FDF4] p-4">
      <div className="flex items-center gap-2 text-[14px] font-bold text-[#0F766E] mb-3">
        <HiOutlineSparkles className="h-5 w-5" />
        Proposed Action
      </div>
      <p className="text-[13px] font-semibold text-[#111827] mb-2">{action.summary}</p>
      {action.line_items && action.line_items.length > 0 && (
        <div className="space-y-1 mb-3">
          {action.line_items.map((item, i) => (
            <div key={i} className="flex justify-between text-[12px] text-[#374151]">
              <span>{item.description}</span>
              <span className="font-semibold">${(item.amount || 0).toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t border-[#0F766E]/20 pt-1 flex justify-between text-[13px] font-bold text-[#111827]">
            <span>Total</span>
            <span>${(action.total_amount || 0).toFixed(2)}</span>
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0F766E] px-3 py-2.5 text-[13px] font-bold text-white hover:bg-[#0F766E]/90 transition-colors"
        >
          <HiOutlineCheckCircle className="h-4 w-4" /> Confirm
        </button>
        <button
          onClick={onModify}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border border-[#E5E7EB] px-3 py-2.5 text-[13px] font-bold text-[#374151] hover:bg-[#F9FAFB] transition-colors"
        >
          <HiOutlinePencilSquare className="h-4 w-4" /> Modify
        </button>
        <button
          onClick={onCancel}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border border-[#FEE2E2] px-3 py-2.5 text-[13px] font-bold text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors"
        >
          <HiOutlineXCircle className="h-4 w-4" /> Cancel
        </button>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3">
      <div className="bg-[#F3F4F6] rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
        <span className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}

export default function ChatSidebar({ isOpen, onClose }) {
  const { idToken: token, me } = useAuth()
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your AI Accounting Assistant. I can help you create invoices, manage expenses, analyze financial data, and forecast future trends. How can I help you today?" }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [threadId, setThreadId] = useState(null)
  const [pendingAction, setPendingAction] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  if (!isOpen) return null

  const companyId = me?.company?.id || 1

  async function sendMessage(e) {
    e?.preventDefault()
    if ((!input.trim() && !selectedFile) || isLoading || !token) return

    const userMsg = input.trim() || `[Uploaded file: ${selectedFile?.name}]`
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setInput('')
    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append('message', userMsg)
      formData.append('company_id', companyId.toString())
      formData.append('auth_token', token)
      if (threadId) formData.append('thread_id', threadId)
      if (selectedFile) formData.append('file', selectedFile)

      const res = await fetch(`http://127.0.0.1:8080/api/agent/chat`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'X-Company-Id': String(companyId) },
        body: formData,
      })

      const data = await res.json()
      setThreadId(data.thread_id)
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])

      if (data.requires_confirmation && data.proposed_action) {
        setPendingAction(data.proposed_action)
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }])
    } finally {
      setIsLoading(false)
      setSelectedFile(null)
    }
  }

  async function handleConfirm() {
    if (!threadId) return
    setIsLoading(true)
    setPendingAction(null)
    try {
      const res = await fetch(`http://127.0.0.1:8080/api/agent/confirm/${threadId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'confirm' }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }])
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCancel() {
    if (!threadId) return
    setIsLoading(true)
    setPendingAction(null)
    try {
      const res = await fetch(`http://127.0.0.1:8080/api/agent/cancel/${threadId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response || 'Action cancelled.' }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Action cancelled.' }])
    } finally {
      setIsLoading(false)
    }
  }

  function handleModify() {
    setPendingAction(null)
    setInput('I want to modify: ')
  }

  return (
    <div className="fixed inset-y-0 right-0 z-[80] flex w-[420px] flex-col border-l border-[#E5E7EB] bg-white shadow-2xl transition-transform duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-gradient-to-r from-[#0F766E] to-[#14B8A6] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <HiOutlineSparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-white">AI Assistant</h3>
            <p className="text-[11px] font-medium text-white/70">Powered by Gemini 2.5 Flash</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-xl p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <HiOutlineXMark className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {isLoading && <TypingIndicator />}
        {pendingAction && (
          <ConfirmationCard
            action={pendingAction}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            onModify={handleModify}
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* File preview */}
      {selectedFile && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl bg-[#F3F4F6] px-3 py-2 text-[12px]">
          <HiOutlineDocumentArrowUp className="h-4 w-4 text-[#0F766E]" />
          <span className="flex-1 truncate font-medium text-[#374151]">{selectedFile.name}</span>
          <button onClick={() => setSelectedFile(null)} className="text-[#9CA3AF] hover:text-[#111827]">
            <HiOutlineXMark className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={sendMessage} className="border-t border-[#E5E7EB] p-4">
        <div className="flex items-center gap-2">
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
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E5E7EB] text-[#64748B] hover:bg-[#F9FAFB] hover:text-[#0F766E] transition-colors"
            title="Upload image or PDF"
          >
            <HiOutlineDocumentArrowUp className="h-5 w-5" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about invoices, expenses, reports..."
            className="flex-1 h-10 rounded-xl border border-[#E5E7EB] bg-white px-4 text-[13px] text-[#111827] placeholder-[#9CA3AF] focus:border-[#0F766E] focus:outline-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || (!input.trim() && !selectedFile)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0F766E] text-white hover:bg-[#0F766E]/90 disabled:opacity-40 transition-colors"
          >
            <HiOutlinePaperAirplane className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  )
}
