'use client'

import React, { useState, useRef } from 'react'
import {
  Sparkles,
  Image,
  Download,
  Pencil,
  RefreshCw,
  Bookmark,
  Check,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { useImageStore, type ImageType } from '@/stores/imageStore'
import { Toast } from '@/components/shared/Toast'

const MAX_CHARS = 2000

const imageTypeOptions: { value: ImageType; label: string }[] = [
  { value: 'social_media', label: 'Social Media Post' },
  { value: 'thumbnail', label: 'Thumbnail' },
]

export default function ImageGeneratorPage() {
  // Zustand persisted state — survives page navigation
  const imageType = useImageStore((s) => s.imageType)
  const pastedContent = useImageStore((s) => s.pastedContent)
  const generatedImage = useImageStore((s) => s.generatedImage)
  const isSaved = useImageStore((s) => s.isSaved)
  const setImageType = useImageStore((s) => s.setImageType)
  const setPastedContent = useImageStore((s) => s.setPastedContent)
  const setGeneratedImage = useImageStore((s) => s.setGeneratedImage)
  const setIsSaved = useImageStore((s) => s.setIsSaved)

  // Local ephemeral state (not persisted)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Toast state
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' })

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ visible: true, message, type })
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 3000)
  }

  const getToken = () => {
    try {
      const raw = localStorage.getItem('pakvoice-auth')
      if (!raw) return null
      const parsed = JSON.parse(raw)
      return parsed?.state?.token || parsed?.token || null
    } catch {
      return null
    }
  }

  const handleGenerate = async () => {
    if (!pastedContent.trim()) return

    setIsGenerating(true)
    setIsSaved(false)
    setGeneratedImage(null)
    setErrorMessage(null)

    try {
      const token = getToken()
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/images/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: pastedContent,
            image_type: imageType,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Image generation failed')
      }

      if (!data.image_url) {
        throw new Error('No image URL returned from server')
      }

      setGeneratedImage(data.image_url)
      setErrorMessage(null)
    } catch (error: any) {
      console.error('Generate image error:', error)
      const msg = error?.message || 'Failed to generate image. Check if backend server is running.'
      setErrorMessage(msg)
      showToast(msg, 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async () => {
    if (!generatedImage) return
    try {
      const response = await fetch(generatedImage)
      if (!response.ok) throw new Error('Network error')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `pakvoice-${imageType}-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      showToast('Image downloaded as PNG!', 'success')
    } catch {
      showToast('Download failed. Try again.', 'error')
    }
  }

  const handleSaveToGallery = async () => {
    if (!generatedImage || isSaving) return

    setIsSaving(true)
    try {
      const token = getToken()
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/images/save`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            image_url: generatedImage,
            image_type: imageType,
            source_content: pastedContent.slice(0, 2000),
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Save failed')
      }

      setIsSaved(true)
      showToast('Image saved to gallery!', 'success')
    } catch (error: any) {
      showToast(error?.message || 'Failed to save image.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = () => {
    textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => textareaRef.current?.focus(), 400)
  }

  const charCount = pastedContent.length
  const isNearLimit = charCount > MAX_CHARS - 100

  return (
    <div className="px-4 md:px-6 lg:px-8 py-6 pb-24 md:pb-6">
      <Toast type={toast.type} message={toast.message} visible={toast.visible} />

      {/* Two-column grid — equal height */}
      <div
        className="grid grid-cols-1 md:grid-cols-[45%_55%] gap-6 items-stretch"
      >
        {/* ===================== LEFT COLUMN ===================== */}
        <div
          className="bg-card border border-border rounded-xl p-6"
        >
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-heading font-bold text-foreground">
              Image Generator
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Turn your content into visuals</p>
          </div>

          {/* Image Type Selector */}
          <div className="mb-5">
            <label className="text-sm font-medium mb-3 block text-foreground">
              Image Type
            </label>
            <div className="flex gap-2">
              {imageTypeOptions.map((opt) => {
                const isActive = imageType === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setImageType(opt.value)
                      setGeneratedImage(null)
                      setIsSaved(false)
                      setErrorMessage(null)
                    }}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '10px',
                      border: isActive ? '1px solid var(--primary)' : '1px solid #e5e7eb',
                      background: isActive ? 'var(--primary-bg)' : '#ffffff',
                      color: isActive ? 'var(--primary-dark)' : '#6b7280',
                      fontWeight: isActive ? 500 : 400,
                      fontSize: '14px',
                      cursor: 'pointer',
                      outline: 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Paste Content */}
          <div className="mb-5">
            <label className="text-sm font-medium mb-2 block text-foreground">
              Paste your content
            </label>
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={pastedContent}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_CHARS) {
                    setPastedContent(e.target.value)
                  }
                }}
                rows={8}
                placeholder="Paste your generated content here..."
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
                className="bg-background text-foreground focus:border-pk-green-500 focus:ring-1 focus:ring-pk-green-500/30 transition-colors"
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--primary-color, #16a34a)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb'
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '10px',
                  fontSize: '11px',
                  color: isNearLimit ? '#ef4444' : '#9ca3af',
                }}
              >
                {charCount}/{MAX_CHARS}
              </span>
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={!pastedContent.trim() || isGenerating}
            className="w-full h-12 gap-2 text-base"
            style={{
              background: !pastedContent.trim() || isGenerating ? undefined : 'var(--primary-color, #16a34a)',
            }}
          >
            {isGenerating ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Generating image...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Generate Image
              </>
            )}
          </Button>
        </div>

        {/* ===================== RIGHT COLUMN (Output) ===================== */}
        <div
          className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center"
        >
          {/* Loading skeleton */}
          {isGenerating && (
            <div style={{ width: '100%', maxWidth: '400px' }}>
              <div className="animate-pulse bg-muted rounded-xl" style={{ aspectRatio: '1/1' }} />
              <p className="text-sm text-muted-foreground text-center mt-3">Creating your visual...</p>
            </div>
          )}

          {/* Error state */}
          {!isGenerating && errorMessage && (
            <div className="flex flex-col items-center gap-4 text-center" style={{ maxWidth: '400px' }}>
              <AlertCircle size={48} className="text-red-400" />
              <div>
                <p className="text-red-600 font-medium mb-1">Generation Failed</p>
                <p className="text-sm text-red-500">{errorMessage}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleGenerate} className="gap-1.5 mt-2">
                <RefreshCw size={14} /> Try Again
              </Button>
            </div>
          )}

          {/* Result state */}
          {!isGenerating && !errorMessage && generatedImage && (
            <div style={{ width: '100%', maxWidth: '450px' }}>
              <img
                src={generatedImage}
                alt="Generated visual"
                onError={() => {
                  setErrorMessage(
                    'Image failed to load. The server URL may be incorrect or the image was not saved properly.'
                  )
                  setGeneratedImage(null)
                }}
                style={{
                  width: '100%',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                }}
                className="shadow-sm"
              />

              {/* Action buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
                  <Download size={14} /> Download
                </Button>
                <Button variant="outline" size="sm" onClick={handleEdit} className="gap-1.5">
                  <Pencil size={14} /> Edit
                </Button>
                <Button
                  variant={isSaved ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleSaveToGallery}
                  disabled={isSaved || isSaving}
                  className={`gap-1.5 ${isSaved ? 'bg-green-500 hover:bg-green-600 text-white' : ''}`}
                >
                  {isSaving ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : isSaved ? (
                    <Check size={14} />
                  ) : (
                    <Bookmark size={14} />
                  )}
                  {isSaving ? 'Saving...' : isSaved ? 'Saved' : 'Save to Gallery'}
                </Button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!isGenerating && !errorMessage && !generatedImage && (
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Image size={48} className="opacity-30 mb-4" />
              <p className="text-sm font-medium">Your generated image will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
