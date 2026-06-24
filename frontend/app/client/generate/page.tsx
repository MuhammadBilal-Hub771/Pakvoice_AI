'use client'

import React, { useState, useCallback, useMemo, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import {
  Sparkles,
  Copy,
  Download,
  Bookmark,
  RefreshCw,
  Pencil,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { ContentTypeIcon } from '@/components/illustrations/logos'
import { useGenerateStore } from '@/stores/generateStore'
import { useAuthStore } from '@/stores/authStore'
import { useGenerateContent } from '@/hooks/useQueries'
import { historyApi, generateApi } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { cleanContent, copyToClipboard, formatDate } from '@/lib/utils'
import type { ContentType, Industry, Tone, Language, ContentLength, GeneratedContent } from '@/types'

// Lazy load heavy illustration components
const IndustryIcon = dynamic(
  () => import('@/components/illustrations/IndustryIcons').then(m => ({ default: m.IndustryIcon })),
  { ssr: false, loading: () => <span className="w-5 h-5 rounded bg-gray-100 inline-block" /> }
)
const PakistanMapSVG = dynamic(
  () => import('@/components/illustrations/PakistanMapSVG').then(m => ({ default: m.PakistanMapSVG })),
  { ssr: false, loading: () => <div className="h-32 bg-gray-50 rounded animate-pulse" /> }
)
const AISparkAnimation = dynamic(
  () => import('@/components/illustrations/illustrations').then(m => ({ default: m.AISparkAnimation })),
  { ssr: false }
)
const LoadingCrescent = dynamic(
  () => import('@/components/illustrations/illustrations').then(m => ({ default: m.LoadingCrescent })),
  { ssr: false }
)
const LanguageBadge = dynamic(
  () => import('@/components/illustrations/BadgeStickers').then(m => ({ default: m.LanguageBadge })),
  { ssr: false }
)
const ContentTypeBadge = dynamic(
  () => import('@/components/illustrations/BadgeStickers').then(m => ({ default: m.ContentTypeBadge })),
  { ssr: false }
)

const CONTENT_TYPES: { id: string; label: ContentType }[] = [
  { id: 'social', label: 'Social Media Post' },
  { id: 'blog', label: 'Blog Article' },
  { id: 'product', label: 'Product Description' },
  { id: 'email', label: 'Email Marketing' },
  { id: 'press', label: 'Press Release' },
  { id: 'website', label: 'Website Content' },
  { id: 'ad', label: 'Advertisement Copy' },
]

const INDUSTRIES: { name: Industry; color: string }[] = [
  { name: 'Textile', color: '#16a34a' },
  { name: 'IT & Software', color: '#3b82f6' },
  { name: 'Agriculture', color: '#84cc16' },
  { name: 'Healthcare', color: '#ef4444' },
  { name: 'Education', color: '#a855f7' },
  { name: 'Retail', color: '#f97316' },
  { name: 'Manufacturing', color: '#6b7280' },
  { name: 'Food & Beverage', color: '#eab308' },
  { name: 'Construction', color: '#78716c' },
  { name: 'Transportation', color: '#06b6d4' },
  { name: 'Banking & Finance', color: '#0c4d2f' },
  { name: 'Real Estate', color: '#d4af37' },
]

const TONES: { name: Tone; emoji: string }[] = [
  { name: 'Professional', emoji: '' },
  { name: 'Casual', emoji: '' },
  { name: 'Persuasive', emoji: '' },
  { name: 'Informative', emoji: '' },
  { name: 'Friendly', emoji: '' },
]

const LANGUAGES: { id: Language; label: string; flag: string }[] = [
  { id: 'english', label: 'English (Pakistani)', flag: '🇵🇰' },
  { id: 'urdu', label: 'اردو', flag: '' },
  { id: 'roman-urdu', label: 'Roman Urdu', flag: '🇵🇰' },
]

const PAKISTANI_CITIES = [
  'Karachi', 'Lahore', 'Islamabad', 'Peshawar', 'Quetta',
  'Faisalabad', 'Multan', 'Rawalpindi', 'Hyderabad', 'Gujranwala',
]

const contentLengths: { value: ContentLength; label: string }[] = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
]

export default function GeneratePage() {
  return (
    <Suspense fallback={null}>
      <GeneratePageContent />
    </Suspense>
  )
}

function GeneratePageContent() {
  const searchParams = useSearchParams()
  const initialType = searchParams.get('type') || ''

  // Selective zustand subscriptions — only re-render on needed fields
  const formData = useGenerateStore((s) => s.formData)
  const generatedContent = useGenerateStore((s) => s.generatedContent)
  const setFormData = useGenerateStore((s) => s.setFormData)
  const setGeneratedContent = useGenerateStore((s) => s.setGeneratedContent)
  const addToHistory = useGenerateStore((s) => s.addToHistory)
  const generateMutation = useGenerateContent()
  const queryClient = useQueryClient()

  const [kbExpanded, setKbExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editedContent, setEditedContent] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [saving, setSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamedText, setStreamedText] = useState('')
  const [hasInteracted, setHasInteracted] = useState(false)

  // Set initial content type from URL
  React.useEffect(() => {
    if (initialType && CONTENT_TYPES.some((ct) => ct.label === initialType)) {
      setFormData({ contentType: initialType as ContentType })
    }
  }, [initialType, setFormData])

  // Form validation — disable button until all required fields filled
  const isFormValid = useMemo(() => {
    return (
      formData.contentType !== '' &&
      formData.businessName.trim() !== '' &&
      formData.businessDescription.trim() !== '' &&
      formData.keyMessage.trim() !== '' &&
      formData.industry !== '' &&
      formData.city !== ''
    )
  }, [
    formData.contentType,
    formData.businessName,
    formData.businessDescription,
    formData.keyMessage,
    formData.industry,
    formData.city,
  ])

  // Helper: red border when user has interacted and field is empty
  const err = (value: string) =>
    hasInteracted && !value.trim()
      ? 'border-red-400 ring-1 ring-red-400 focus:border-red-500 focus:ring-red-500/30'
      : ''
  const errPill = (value: string) =>
    hasInteracted && !value.trim()
      ? 'border-red-400 ring-1 ring-red-400'
      : ''

  const handleGenerate = async () => {
    setHasInteracted(true)
    if (!isFormValid) return
    console.log('[Generate] START', { contentType: formData.contentType })

    setIsStreaming(true)
    setStreamedText('')
    setIsSaved(false)

    // Phase 1: Try streaming endpoint (shows text word-by-word)
    try {
      console.log('[Generate] Trying streaming endpoint...')
      const { stream, contentId } = await generateApi.generateStream(formData)
      const reader = stream.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value, { stream: true })
        setStreamedText(fullText)
      }

      console.log('[Generate] Stream complete:', fullText.slice(0, 80))
      const genContent: GeneratedContent = {
        id: contentId,
        title: formData.businessName || 'Generated Content',
        content: fullText,
        contentType: formData.contentType as ContentType,
        industry: (formData.industry || '') as Industry,
        city: formData.city || '',
        language: (formData.language || 'english') as Language,
        tone: (formData.tone || 'Professional') as Tone,
        userId: '',
        userName: '',
        createdAt: new Date().toISOString(),
        saved: false,
        copied: false,
        sources: [],
      }
      setGeneratedContent(genContent)
      addToHistory(genContent)
      setIsStreaming(false)
      return
    } catch (err: any) {
      console.log('[Generate] Stream failed:', err?.status, err?.message)
      // If partial text was received, keep showing it
      if (streamedText) {
        setGeneratedContent({
          id: `stream_${Date.now()}`,
          title: formData.businessName || 'Content (Partial)',
          content: streamedText + '\n\n⚠️ Generation was interrupted.',
          contentType: formData.contentType as ContentType,
          industry: (formData.industry || '') as Industry,
          city: formData.city || '',
          language: (formData.language || 'english') as Language,
          tone: (formData.tone || 'Professional') as Tone,
          userId: '',
          userName: '',
          createdAt: new Date().toISOString(),
          saved: false,
          copied: false,
          sources: [],
        })
        setIsStreaming(false)
        return
      }
    }

    // Phase 2: Fallback to old non-streaming endpoint
    // Keep isStreaming=true so button stays disabled with loading indicator
    console.log('[Generate] Falling back to old endpoint...')
    try {
      await generateMutation.mutateAsync(formData)
      console.log('[Generate] Fallback SUCCESS')
    } catch (err: any) {
      console.error('[Generate] Fallback FAILED:', err?.message)
      // mutation onError already shows a notification toast
    }
    setIsStreaming(false)
  }

  const handleCopy = async () => {
    if (!generatedContent) return
    await copyToClipboard(generatedContent.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    if (!generatedContent) return
    const blob = new Blob([cleanContent(generatedContent.content)], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${generatedContent.title.replace(/\s+/g, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSave = useCallback(async () => {
    if (!generatedContent || isSaved) return

    setSaving(true)
    try {
      await historyApi.save(generatedContent.id)

      setIsSaved(true)

      // Update saved status in Zustand history store
      const history = useGenerateStore.getState().history
      const updatedHistory = history.map((item: any) =>
        item.id === generatedContent.id ? { ...item, saved: true } : item
      )
      useGenerateStore.getState().setHistory(updatedHistory)

      // Refresh stats on home page
      queryClient.invalidateQueries({ queryKey: ['client-stats'] })
    } catch {
      // Fallback: mark as saved locally
      setIsSaved(true)
      const history = useGenerateStore.getState().history
      const updatedHistory = history.map((item: any) =>
        item.id === generatedContent.id ? { ...item, saved: true } : item
      )
      useGenerateStore.getState().setHistory(updatedHistory)
    } finally {
      setSaving(false)
    }
  }, [generatedContent, isSaved])

  const handleCitySelect = useCallback((city: string) => {
    setSelectedCity(city)
    setFormData({ city })
  }, [setFormData])

  const loadingSteps = [
    { text: 'Searching knowledge base...', delay: 0 },
    { text: 'Crafting your content...', delay: 1.5 },
    { text: 'Formatting...', delay: 3 },
  ]

  return (
    <div className="px-4 md:px-6 lg:px-8 py-6 pb-24 md:pb-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* LEFT COLUMN - Form */}
        <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <div className="animate-fade-up">
            <h1 className="text-2xl font-heading font-bold mb-1">Generate Content</h1>
            <p className="text-sm text-muted-foreground">Fill in the details to create Pakistani market content</p>
          </div>

          {/* Section 1: What to Create */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">What to Create</h3>

              {/* Content Type Pills */}
              <div className={`flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none ${hasInteracted && !formData.contentType ? 'p-1 border border-red-400 rounded-xl' : ''}`}>
                {CONTENT_TYPES.map((ct) => (
                  <button
                    key={ct.id}
                    onClick={() => setFormData({ contentType: ct.label })}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-medium whitespace-nowrap transition-all ${
                      formData.contentType === ct.label
                        ? 'bg-pk-green-500 text-white border-pk-green-500 shadow-sm'
                        : `bg-card hover:border-pk-green-300 text-muted-foreground ${hasInteracted && !formData.contentType ? 'border-red-300' : ''}`
                    }`}
                  >
                    <ContentTypeIcon type={ct.label} size={14} />
                    {ct.label}
                  </button>
                ))}
                {hasInteracted && !formData.contentType && (
                  <p className="w-full text-xs text-red-400 mt-1 px-1">Select a content type</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Business Name</label>
                <Input
                  placeholder="e.g., Khaadi, Engro, Sazzy..."
                  value={formData.businessName}
                  onChange={(e) => setFormData({ businessName: e.target.value })}
                  className={err(formData.businessName)}
                />
                {hasInteracted && !formData.businessName.trim() && (
                  <p className="mt-1 text-xs text-red-400">Business name is required</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Business Description</label>
                <Textarea
                  placeholder="Describe your business, products, and services..."
                  rows={3}
                  value={formData.businessDescription}
                  onChange={(e) => setFormData({ businessDescription: e.target.value })}
                  maxLength={500}
                  className={err(formData.businessDescription)}
                />
                {hasInteracted && !formData.businessDescription.trim() && (
                  <p className="mt-1 text-xs text-red-400">Business description is required</p>
                )}
                <p className="text-xs text-muted-foreground text-right mt-1">
                  {formData.businessDescription.length}/500
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Key Message</label>
                <Input
                  placeholder="What's the main message you want to convey?"
                  value={formData.keyMessage}
                  onChange={(e) => setFormData({ keyMessage: e.target.value })}
                  className={err(formData.keyMessage)}
                />
                {hasInteracted && !formData.keyMessage.trim() && (
                  <p className="mt-1 text-xs text-red-400">Key message is required</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Your Market */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Your Market</h3>

              {/* Industry Grid */}
              <div>
                <label className="text-sm font-medium mb-2 block">Industry</label>
                <div className={`grid grid-cols-4 gap-2 ${errPill(formData.industry) ? 'p-1 border border-red-400 rounded-xl' : ''}`}>
                  {INDUSTRIES.map((ind) => (
                    <button
                      key={ind.name}
                      onClick={() => setFormData({ industry: ind.name })}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-xs transition-all ${
                        formData.industry === ind.name
                          ? 'border-pk-green-500 bg-pk-green-50 text-pk-green-700'
                          : `hover:border-pk-green-300 text-muted-foreground ${hasInteracted && !formData.industry ? 'border-red-300' : ''}`
                      }`}
                    >
                      <IndustryIcon industry={ind.name} size={20} />
                      <span className="text-center leading-tight">{ind.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
                {hasInteracted && !formData.industry && (
                  <p className="mt-1 text-xs text-red-400">Select an industry</p>
                )}
              </div>

              {/* City Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">City</label>
                {/* Mobile: pills */}
                <div className={`md:hidden flex flex-wrap gap-2 ${errPill(selectedCity) ? 'p-1 border border-red-400 rounded-xl' : ''}`}>
                  {PAKISTANI_CITIES.map((city) => (
                    <button
                      key={city}
                      onClick={() => handleCitySelect(city)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        selectedCity === city
                          ? 'bg-pk-green-500 text-white border-pk-green-500'
                          : `hover:border-pk-green-300 text-muted-foreground ${hasInteracted && !selectedCity ? 'border-red-300' : ''}`
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                  {hasInteracted && !selectedCity && (
                    <p className="w-full text-xs text-red-400 mt-1 px-1">Select a city</p>
                  )}
                </div>
                {/* Desktop: map */}
                <div className="hidden md:block">
                  <PakistanMapSVG
                    selectedCity={selectedCity}
                    onCitySelect={handleCitySelect}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Target Audience</label>
                <Textarea
                  placeholder="Describe your target audience..."
                  rows={2}
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ targetAudience: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Style & Language */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Style & Language</h3>

              {/* Language */}
              <div>
                <label className="text-sm font-medium mb-2 block">Language</label>
                <div className={`grid grid-cols-3 gap-2 ${errPill(formData.language) ? 'p-1 border border-red-400 rounded-xl' : ''}`}>
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => setFormData({ language: lang.id })}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-xs transition-all ${
                        formData.language === lang.id
                          ? 'border-pk-green-500 bg-pk-green-50 text-pk-green-700'
                          : `hover:border-pk-green-300 text-muted-foreground ${hasInteracted && !formData.language ? 'border-red-300' : ''}`
                      }`}
                    >
                      {lang.flag && <span className="text-base">{lang.flag}</span>}
                      {lang.id === 'urdu' && <span className="text-base font-urdu">🇵🇰</span>}
                      <span className={lang.id === 'urdu' ? 'font-urdu' : ''}>{lang.label}</span>
                    </button>
                  ))}
                </div>
                {hasInteracted && !formData.language && (
                  <p className="mt-1 text-xs text-red-400">Select a language</p>
                )}
              </div>

              {/* Tone */}
              <div>
                <label className="text-sm font-medium mb-2 block">Tone</label>
                <div className={`flex flex-wrap gap-2 ${errPill(formData.tone) ? 'p-1 border border-red-400 rounded-xl' : ''}`}>
                  {TONES.map((tone) => (
                    <button
                      key={tone.name}
                      onClick={() => setFormData({ tone: tone.name })}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                        formData.tone === tone.name
                          ? 'border-pk-green-500 bg-pk-green-50 text-pk-green-700'
                          : `bg-card hover:border-pk-green-300 text-muted-foreground ${hasInteracted && !formData.tone ? 'border-red-300' : ''}`
                      }`}
                    >
                      <span>{tone.emoji}</span>
                      {tone.name}
                    </button>
                  ))}
                </div>
                {hasInteracted && !formData.tone && (
                  <p className="mt-1 text-xs text-red-400">Select a tone</p>
                )}
              </div>

              {/* Content Length */}
              <div>
                <label style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '8px',
                  display: 'block',
                  color: '#111827',
                }}>
                  Content Length
                </label>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '8px',
                }}>
                  {contentLengths.map((cl) => {
                    const isActive = formData.contentLength === cl.value
                    const showError = hasInteracted && !formData.contentLength
                    return (
                      <button
                        key={cl.value}
                        type="button"
                        onClick={() => setFormData({ contentLength: cl.value })}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '10px',
                          border: isActive
                            ? '1px solid var(--primary-color, #16a34a)'
                            : showError
                              ? '1px solid #f87171'
                              : '1px solid #e5e7eb',
                          background: isActive
                            ? 'var(--primary-bg, #f0fdf4)'
                            : '#ffffff',
                          color: isActive
                            ? 'var(--primary-dark, #0c4d2f)'
                            : '#6b7280',
                          fontWeight: isActive ? 500 : 400,
                          fontSize: '14px',
                          cursor: 'pointer',
                          outline: 'none',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {cl.label}
                      </button>
                    )
                  })}
                </div>
                {hasInteracted && !formData.contentLength && (
                  <p style={{ fontSize: '12px', color: '#f87171', marginTop: '6px' }}>
                    Select a content length
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Knowledge Base */}
          <Card>
            <button
              onClick={() => setKbExpanded(!kbExpanded)}
              className="w-full p-5 flex items-center justify-between"
            >
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Knowledge Base
              </h3>
              {kbExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {kbExpanded && (
              <CardContent className="p-5 pt-0 space-y-3">
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.useKnowledgeBase}
                    onChange={(e) => setFormData({ useKnowledgeBase: e.target.checked })}
                    className="rounded border-gray-300 text-pk-green-500 focus:ring-pk-green-500"
                  />
                  Use my documents for context
                </label>
                {formData.useKnowledgeBase && (
                  <p className="text-xs text-muted-foreground">
                    Your uploaded documents will be used as context for generation.
                    Go to Knowledge Base to manage documents.
                  </p>
                )}
              </CardContent>
            )}
          </Card>

          {/* Generate Button */}
          <div>
            <button
              onClick={handleGenerate}
              disabled={!isFormValid || isStreaming}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                fontSize: '15px',
                fontWeight: 600,
                color: 'white',
                cursor: isFormValid && !isStreaming ? 'pointer' : 'not-allowed',
                background: isFormValid
                  ? 'var(--primary-color, #16a34a)'
                  : 'var(--primary-faded, #a7d6b8)',
                opacity: isFormValid ? 1 : 0.7,
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isStreaming ? (
                <>
                  <LoadingCrescent size={24} />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Generate with AI
                </>
              )}
            </button>

            {hasInteracted && !isFormValid && (
              <p style={{
                fontSize: '12px',
                color: '#ef4444',
                textAlign: 'center',
                marginTop: '8px',
              }}>
                Please fill all required fields to continue
              </p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN - Output */}
        <div className="space-y-4">
            {/* Empty State */}
            {!generatedContent && !isStreaming && !streamedText && (
              <div
                className="flex flex-col items-center justify-center h-[60vh] text-center"
              >
                <AISparkAnimation />
                <h3 className="mt-6 text-lg font-heading font-semibold">Your content will appear here</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                  Fill the form on the left and click generate to create AI-powered content for your Pakistani business.
                </p>
              </div>
            )}

            {/* Streaming State — show text as it arrives in real-time */}
            {isStreaming && streamedText && (
              <div className="p-6 rounded-lg border bg-card h-[60vh] overflow-y-auto">
                <div className="flex items-center gap-2 mb-4">
                  <LoadingCrescent size={16} />
                  <span className="text-sm text-muted-foreground animate-pulse">Generating...</span>
                </div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{streamedText}</div>
              </div>
            )}

            {/* Loading State (waiting for first chunk) */}
            {isStreaming && !streamedText && (
              <div
                className="flex flex-col items-center justify-center h-[60vh]"
              >
                <LoadingCrescent size={64} />
                <div className="mt-8 space-y-4">
                  {loadingSteps.map((step, i) => (
                    <div
                      key={step.text}
                      className="flex items-center gap-3 animate-fade-in"
                      style={{ animationDelay: `${step.delay * 1000}ms`, animationFillMode: 'backwards' }}
                    >
                      <div className={`w-2 h-2 rounded-full ${
                        i === 0 ? 'bg-pk-green-500 animate-pulse' :
                        i === 1 ? 'bg-pk-gold animate-pulse' :
                        'bg-pk-saffron animate-pulse'
                      }`} />
                      <span className="text-sm text-muted-foreground">{step.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generated Content */}
            {generatedContent && !isStreaming && (
              <div
              >
                <Card>
                  <CardContent className="p-6 space-y-4">
                    {/* Header */}
                    <div className="flex flex-wrap items-center gap-2">
                      <ContentTypeBadge label={generatedContent.contentType} />
                      <LanguageBadge label={
                        generatedContent.language === 'english' ? 'English' :
                        generatedContent.language === 'urdu' ? 'Urdu' : 'Roman Urdu'
                      } />
                    </div>

                    <p className="text-xs text-muted-foreground">{formatDate(generatedContent.createdAt)}</p>

                    {/* Title */}
                    <h2 className="text-xl font-heading font-bold">{generatedContent.title}</h2>

                    {/* Content Area */}
                    <div
                      className={`p-4 rounded-lg bg-muted/30 ${
                        generatedContent.language === 'urdu' ? 'rtl-content' : 'ltr-content'
                      }`}
                    >
                      {editMode ? (
                        <Textarea
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          rows={12}
                          className={`min-h-[300px] ${
                            generatedContent.language === 'urdu'
                              ? 'font-urdu text-lg leading-relaxed text-right'
                              : ''
                          }`}
                        />
                      ) : (
                        <div className={`whitespace-pre-wrap text-sm leading-relaxed ${
                          generatedContent.language === 'urdu'
                            ? 'font-urdu text-lg leading-[2.2] text-right'
                            : ''
                        }`}>
                          {cleanContent(generatedContent.content)}
                        </div>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopy}
                        className="gap-1.5"
                      >
                        {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        {copied ? 'Copied!' : 'Copy'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
                        <Download size={14} /> Download
                      </Button>
                      <Button
                        variant={isSaved ? 'default' : 'outline'}
                        size="sm"
                        onClick={handleSave}
                        disabled={saving || isSaved}
                        className={`gap-1.5 ${isSaved ? 'bg-green-500 hover:bg-green-600 text-white' : ''}`}
                      >
                        {saving ? <RefreshCw size={14} className="animate-spin" /> : isSaved ? <Check size={14} /> : <Bookmark size={14} />}
                        {saving ? 'Saving...' : isSaved ? 'Saved' : 'Save'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleGenerate()} className="gap-1.5">
                        <RefreshCw size={14} /> Regenerate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!editMode) {
                            setEditedContent(generatedContent.content)
                          }
                          setEditMode(!editMode)
                        }}
                        className="gap-1.5"
                      >
                        <Pencil size={14} />
                        {editMode ? 'Done Editing' : 'Edit'}
                      </Button>
                    </div>

                    {/* Sources */}
                    {generatedContent.sources && generatedContent.sources.length > 0 && (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-medium">
                          📚 Sources Used ({generatedContent.sources.length})
                        </summary>
                        <div className="mt-2 space-y-2">
                          {generatedContent.sources.map((source) => (
                            <div key={source.docId} className="flex items-center justify-between text-xs">
                              <span>{source.docName}</span>
                              <span className="text-pk-green-600 font-medium">{source.relevance}% relevant</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
        </div>
      </div>
    </div>
  )
}
