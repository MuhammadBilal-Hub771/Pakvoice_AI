'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  MessageSquare,
  Bot,
  Send,
  Sparkles,
  Settings,
  BookOpen,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  Search,
  User,
  ShieldCheck,
  Zap,
  Globe,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Sliders,
  Phone,
  BarChart3,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { whatsappApi } from '@/lib/api'
import type {
  WhatsAppConversation,
  WhatsAppMessage,
  WhatsAppSettings as WhatsAppSettingsType,
  WhatsAppDocumentSourceRef,
} from '@/types'
import { Toast } from '@/components/shared/Toast'

export default function WhatsAppPage() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'settings' | 'analytics'>('simulator')

  // Conversations & Chat State
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([])
  const [selectedPhone, setSelectedPhone] = useState<string>('')
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Simulator / Send state
  const [inputMessage, setInputMessage] = useState('')
  const [isSimulating, setIsSimulating] = useState(false)
  const [sendMode, setSendMode] = useState<'customer' | 'agent'>('customer')
  const [activeSources, setActiveSources] = useState<WhatsAppDocumentSourceRef[]>([])
  const [simPhoneNumber, setSimPhoneNumber] = useState('+923001234567')
  const [simContactName, setSimContactName] = useState('Ahmed Khan (Customer)')

  // Settings State
  const [botSettings, setBotSettings] = useState<WhatsAppSettingsType>({
    verify_token: 'pakvoice_whatsapp_verify_secret',
    api_token: '',
    phone_number_id: '',
    business_account_id: '',
    ai_enabled: true,
    system_prompt: '',
    use_rag: true,
    rag_top_k: 3,
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Toast
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success')
  const [showToast, setShowToast] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)

  const showNotification = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(msg)
    setToastType(type)
    setShowToast(true)
  }

  // Load Initial Data
  useEffect(() => {
    loadConversations()
    loadSettings()
  }, [])

  const loadConversations = async () => {
    try {
      setLoadingConversations(true)
      const data = await whatsappApi.getConversations()
      setConversations(data)
      if (data.length > 0 && !selectedPhone) {
        setSelectedPhone(data[0].phone_number)
      } else if (data.length === 0 && !selectedPhone) {
        setSelectedPhone('+923001234567')
      }
    } catch (err: any) {
      console.error('Error fetching WhatsApp conversations:', err)
    } finally {
      setLoadingConversations(false)
    }
  }

  const loadSettings = async () => {
    try {
      const data = await whatsappApi.getSettings()
      setBotSettings(data)
    } catch (err: any) {
      console.error('Error fetching settings:', err)
    }
  }

  // Load messages when selectedPhone changes
  useEffect(() => {
    if (!selectedPhone) return
    loadMessages(selectedPhone)
  }, [selectedPhone])

  const loadMessages = async (phone: string) => {
    try {
      setLoadingMessages(true)
      const thread = await whatsappApi.getMessages(phone)
      setMessages(thread)
      // Extract latest sources
      const lastAgentMsg = [...thread].reverse().find((m) => m.sender === 'agent' && m.rag_sources && m.rag_sources.length > 0)
      if (lastAgentMsg && lastAgentMsg.rag_sources) {
        setActiveSources(lastAgentMsg.rag_sources)
      } else {
        setActiveSources([])
      }
    } catch (err: any) {
      console.error('Error loading messages:', err)
    } finally {
      setLoadingMessages(false)
    }
  }

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSimulating])

  // Copy to clipboard
  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    showNotification(`Copied ${fieldName} to clipboard!`, 'info')
    setTimeout(() => setCopiedField(null), 2000)
  }

  // Handle Send / Simulate
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputMessage.trim() || isSimulating) return

    const textToSend = inputMessage.trim()
    setInputMessage('')
    setIsSimulating(true)

    try {
      if (sendMode === 'customer') {
        // Optimistically add user message
        const tempUserMsg: WhatsAppMessage = {
          id: `temp-${Date.now()}`,
          phone_number: selectedPhone || simPhoneNumber,
          sender: 'user',
          text: textToSend,
          timestamp: new Date().toISOString(),
          status: 'received',
          contact_name: simContactName,
        }
        setMessages((prev) => [...prev, tempUserMsg])

        // Call backend simulation endpoint
        const res = await whatsappApi.simulateMessage({
          phone_number: selectedPhone || simPhoneNumber,
          contact_name: simContactName,
          text: textToSend,
          use_rag: botSettings.use_rag,
        })

        // Update thread
        if (res.agent_message) {
          setMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== tempUserMsg.id)
            return [...filtered, res.user_message, res.agent_message!]
          })
          if (res.sources_used && res.sources_used.length > 0) {
            setActiveSources(res.sources_used)
          }
        }
        await loadConversations()
      } else {
        // Send manual agent message
        const agentMsg = await whatsappApi.sendMessage(selectedPhone, textToSend)
        setMessages((prev) => [...prev, agentMsg])
        await loadConversations()
      }
    } catch (err: any) {
      showNotification(err.message || 'Failed to send message', 'error')
    } finally {
      setIsSimulating(false)
    }
  }

  // Save Settings
  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true)
      const updated = await whatsappApi.updateSettings(botSettings)
      setBotSettings(updated)
      showNotification('WhatsApp Agent configuration updated successfully!', 'success')
    } catch (err: any) {
      showNotification(err.message || 'Failed to save settings', 'error')
    } finally {
      setSavingSettings(false)
    }
  }

  // Sample prompt chips
  const quickTestPrompts = [
    { label: 'Business Overview (English)', text: 'Hello, could you provide an overview of your services and company mission?' },
    { label: 'Corporate Playbook (Urdu)', text: 'السلام علیکم، کیا آپ مجھے اپنے بزنس اور سروسز کے بارے میں تفصیلات بتا سکتے ہیں؟' },
    { label: 'Pricing Query (Roman Urdu)', text: 'Aap ke packages aur pricing ki details mil sakti hain?' },
    { label: 'Customer Support', text: 'How do I get in touch with your technical support team?' },
  ]

  const filteredConversations = conversations.filter(
    (c) =>
      c.phone_number.includes(searchQuery) ||
      (c.contact_name && c.contact_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.last_message.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const backendWebhookUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host.replace(':3000', ':8001')}/api/whatsapp/webhook`
    : 'http://localhost:8001/api/whatsapp/webhook'

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <Toast visible={showToast} message={toastMessage} type={toastType} onClose={() => setShowToast(false)} />

      {/* Header Banner */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <MessageSquare size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                WhatsApp AI Agent
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {botSettings.ai_enabled ? 'AI Auto-Reply Active' : 'Manual Mode'}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              RAG-grounded conversational agent answering customer inquiries in English, Urdu (اردو), and Roman Urdu.
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start md:self-auto">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'simulator'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Bot size={16} />
            Live Inbox & Simulator
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Settings size={16} />
            Webhook & API Setup
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'analytics'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <BarChart3 size={16} />
            Analytics & Logs
          </button>
        </div>
      </div>

      {/* TAB 1: Live Inbox & Simulator */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Panel: Conversations List */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col h-[720px]">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Phone size={15} className="text-emerald-500" />
                  Chat Threads
                </h3>
                <button
                  onClick={loadConversations}
                  title="Refresh Conversations"
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <RefreshCw size={14} className={loadingConversations ? 'animate-spin' : ''} />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search phone or text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Conversation list items */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredConversations.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  <p>No chat history yet.</p>
                  <p className="mt-1 text-emerald-600 font-medium">Send a test simulation message below!</p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = selectedPhone === conv.phone_number
                  return (
                    <button
                      key={conv.phone_number}
                      onClick={() => setSelectedPhone(conv.phone_number)}
                      className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors ${
                        isSelected
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-l-4 border-emerald-500'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs flex-shrink-0">
                        {conv.contact_name ? conv.contact_name.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                            {conv.contact_name || conv.phone_number}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {conv.last_timestamp ? new Date(conv.last_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {conv.last_message || 'No messages'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {conv.phone_number}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {conv.message_count} msgs
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {/* Quick Simulate New Number Button */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                onClick={() => {
                  const newPhone = `+92300${Math.floor(1000000 + Math.random() * 9000000)}`
                  setSelectedPhone(newPhone)
                  setSimPhoneNumber(newPhone)
                  setMessages([])
                  setActiveSources([])
                  showNotification(`Switched to new test number: ${newPhone}`, 'info')
                }}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg hover:bg-emerald-100 transition-colors"
              >
                <Sparkles size={13} />
                + New Customer Test Session
              </button>
            </div>
          </div>

          {/* Center Panel: WhatsApp Styled Chat Window */}
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col h-[720px] overflow-hidden">
            {/* WhatsApp Window Header */}
            <div className="px-4 py-3 bg-emerald-700 text-white flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-800 border border-emerald-600 flex items-center justify-center font-bold text-sm">
                  {selectedPhone.slice(-2) || 'WA'}
                </div>
                <div>
                  <h4 className="font-semibold text-sm leading-tight flex items-center gap-2">
                    {simContactName}
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-600/70">
                      WhatsApp Live
                    </span>
                  </h4>
                  <p className="text-xs text-emerald-100/90 font-mono mt-0.5">
                    {selectedPhone || simPhoneNumber}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="hidden sm:inline-flex items-center gap-1 bg-emerald-800/80 px-2.5 py-1 rounded-md text-emerald-100">
                  <ShieldCheck size={13} />
                  RAG Protected
                </span>
              </div>
            </div>

            {/* Chat Body (WhatsApp Wallpaper aesthetic) */}
            <div
              className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#e5ddd5]/30 dark:bg-slate-950/80"
              style={{
                backgroundImage: `radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.03) 0%, transparent 60%)`,
              }}
            >
              {/* Date divider */}
              <div className="text-center my-2">
                <span className="text-[10px] font-medium bg-white/80 dark:bg-slate-800/80 px-3 py-1 rounded-full text-slate-500 shadow-sm border border-slate-200/50 dark:border-slate-700/50">
                  Today • Encrypted End-to-End Simulation
                </span>
              </div>

              {messages.length === 0 && !isSimulating && (
                <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-center my-8 max-w-sm mx-auto shadow-sm">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 mb-2">
                    <Bot size={24} />
                  </div>
                  <h5 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                    PakVoice WhatsApp AI Ready
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Send a test customer message below or click a prompt on the right to test how the AI responds with your business knowledge.
                  </p>
                </div>
              )}

              {/* Message Bubbles */}
              {messages.map((m) => {
                const isUser = m.sender === 'user'
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isUser ? 'items-start' : 'items-end'} animate-fade-in`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm text-sm ${
                        isUser
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none border border-slate-200/80 dark:border-slate-700'
                          : 'bg-[#d9fdd3] dark:bg-emerald-900/90 text-slate-900 dark:text-emerald-50 rounded-tr-none border border-emerald-200/60 dark:border-emerald-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        {isUser ? (
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <User size={11} />
                            Customer
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                            <Bot size={11} />
                            PakVoice AI Agent
                          </span>
                        )}
                      </div>

                      <p className="whitespace-pre-wrap leading-relaxed text-[13px]">{m.text}</p>

                      <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] text-slate-400">
                        <span>
                          {m.timestamp
                            ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : ''}
                        </span>
                        {!isUser && <Check size={12} className="text-emerald-600 dark:text-emerald-400" />}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Typing indicator */}
              {isSimulating && (
                <div className="flex items-end justify-end animate-fade-in">
                  <div className="bg-[#d9fdd3] dark:bg-emerald-900/80 rounded-2xl rounded-tr-none px-4 py-2.5 shadow-sm flex items-center gap-2 border border-emerald-200">
                    <span className="text-xs text-emerald-800 dark:text-emerald-200 font-medium">
                      AI is generating reply...
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
              {/* Mode Toggle */}
              <div className="flex items-center justify-between mb-2 px-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Send as:</span>
                  <button
                    type="button"
                    onClick={() => setSendMode('customer')}
                    className={`px-2.5 py-0.5 rounded-full font-medium transition-all ${
                      sendMode === 'customer'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Customer (triggers AI)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendMode('agent')}
                    className={`px-2.5 py-0.5 rounded-full font-medium transition-all ${
                      sendMode === 'agent'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Support Agent (manual)
                  </button>
                </div>
                <span className="text-[11px] text-slate-400">Press Enter to send</span>
              </div>

              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={
                    sendMode === 'customer'
                      ? 'Type a message as customer (English, Urdu, or Roman Urdu)...'
                      : 'Type a manual reply as business agent...'
                  }
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={isSimulating}
                  className="flex-1 px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isSimulating}
                  className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-all disabled:opacity-40 shadow-sm"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </div>

          {/* Right Panel: RAG Knowledge Context & Quick Test Prompts */}
          <div className="lg:col-span-3 space-y-4">
            {/* Quick Test Chips */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <h4 className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5 mb-2.5">
                <Sparkles size={14} className="text-amber-500" />
                Quick Test Prompts
              </h4>
              <div className="space-y-2">
                {quickTestPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputMessage(p.text)
                      setSendMode('customer')
                    }}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-emerald-50 hover:border-emerald-200 transition-all text-xs"
                  >
                    <span className="font-semibold text-slate-700 dark:text-slate-200 block text-[11px]">
                      {p.label}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 text-[10px] line-clamp-2 mt-0.5">
                      {p.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* RAG Context Sources Box */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <h4 className="font-semibold text-xs text-slate-900 dark:text-white flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5">
                  <BookOpen size={14} className="text-emerald-500" />
                  Knowledge Base Grounding
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                  {activeSources.length} Citations
                </span>
              </h4>

              {activeSources.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <BookOpen size={20} className="mx-auto text-slate-300 mb-1" />
                  <p>No document citations for current message turn.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {activeSources.map((src, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] truncate max-w-[150px]">
                          {src.title || 'Corporate Knowledge Document'}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          {Math.round(src.score * 100)}% match
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-3 bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-100 dark:border-slate-800 font-serif">
                        "{src.chunk_text}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Webhook & Meta API Setup */}
      {activeTab === 'settings' && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Webhook Connection Guide Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
              <Globe size={18} className="text-emerald-500" />
              Meta WhatsApp Cloud API Webhook Setup
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Copy these values to your Meta for Developers App Dashboard under <strong>WhatsApp → Configuration → Webhook</strong>.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Callback URL (Webhook Endpoint)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={backendWebhookUrl}
                    className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
                  />
                  <button
                    onClick={() => handleCopy(backendWebhookUrl, 'Callback URL')}
                    className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg"
                    title="Copy URL"
                  >
                    {copiedField === 'Callback URL' ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Verify Token
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={botSettings.verify_token}
                    onChange={(e) => setBotSettings({ ...botSettings, verify_token: e.target.value })}
                    className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
                  />
                  <button
                    onClick={() => handleCopy(botSettings.verify_token, 'Verify Token')}
                    className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg"
                    title="Copy Verify Token"
                  >
                    {copiedField === 'Verify Token' ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Meta API Credentials Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
              <ShieldCheck size={18} className="text-emerald-500" />
              Meta Cloud API Credentials (Optional for Live Production WhatsApp)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Enter your permanent Meta WhatsApp System User Access Token and Phone Number ID to allow outbound messages directly back to WhatsApp.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  WhatsApp Access Token (Bearer Token)
                </label>
                <input
                  type="password"
                  placeholder="EAAG... (Leave empty to use simulated web interface only)"
                  value={botSettings.api_token || ''}
                  onChange={(e) => setBotSettings({ ...botSettings, api_token: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Phone Number ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 109283746592817"
                    value={botSettings.phone_number_id || ''}
                    onChange={(e) => setBotSettings({ ...botSettings, phone_number_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    WhatsApp Business Account ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 987654321098765"
                    value={botSettings.business_account_id || ''}
                    onChange={(e) => setBotSettings({ ...botSettings, business_account_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* AI Persona & Behavior Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
              <Sliders size={18} className="text-emerald-500" />
              AI Agent Behavior & Persona
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Customize how the AI WhatsApp agent speaks, its tone, and how it accesses your RAG knowledge base.
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">AI Auto-Reply</h4>
                  <p className="text-[11px] text-slate-500">Automatically generate and send AI replies to incoming messages.</p>
                </div>
                <input
                  type="checkbox"
                  checked={botSettings.ai_enabled}
                  onChange={(e) => setBotSettings({ ...botSettings, ai_enabled: e.target.checked })}
                  className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">RAG Knowledge Base Grounding</h4>
                  <p className="text-[11px] text-slate-500">Search uploaded documents (playbook, catalog, FAQs) for context.</p>
                </div>
                <input
                  type="checkbox"
                  checked={botSettings.use_rag}
                  onChange={(e) => setBotSettings({ ...botSettings, use_rag: e.target.checked })}
                  className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  System Instructions & Persona
                </label>
                <textarea
                  rows={4}
                  value={botSettings.system_prompt}
                  onChange={(e) => setBotSettings({ ...botSettings, system_prompt: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50 shadow-sm"
              >
                {savingSettings ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Analytics & Logs */}
      {activeTab === 'analytics' && (
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Total Conversations</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                  <Phone size={16} />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                {conversations.length}
              </h3>
              <p className="text-[10px] text-emerald-600 mt-1">Unique customer phone numbers</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">AI Response Rate</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600">
                  <Bot size={16} />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                98.4%
              </h3>
              <p className="text-[10px] text-blue-600 mt-1">Autonomous reply coverage</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Avg Response Latency</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-600">
                  <Clock size={16} />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                1.4s
              </h3>
              <p className="text-[10px] text-amber-600 mt-1">RAG retrieval + GPT inference</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Languages Supported</span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950 flex items-center justify-center text-purple-600">
                  <Globe size={16} />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                3
              </h3>
              <p className="text-[10px] text-purple-600 mt-1">English, Urdu (اردو), Roman Urdu</p>
            </div>
          </div>

          {/* Recent Activity Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText size={16} className="text-emerald-500" />
              Active WhatsApp Contacts & Threads
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-medium pb-2">
                    <th className="pb-3">Contact</th>
                    <th className="pb-3">Phone Number</th>
                    <th className="pb-3">Last Message</th>
                    <th className="pb-3">Total Messages</th>
                    <th className="pb-3">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {conversations.map((c) => (
                    <tr key={c.phone_number} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">
                        {c.contact_name || 'Customer'}
                      </td>
                      <td className="py-3 font-mono text-slate-500">
                        {c.phone_number}
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {c.last_message}
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">
                          {c.message_count}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400 text-[11px]">
                        {c.last_timestamp ? new Date(c.last_timestamp).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
