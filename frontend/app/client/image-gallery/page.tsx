'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Image,
  Search,
  Download,
  Trash2,
  ArrowRight,
  Sparkles,
  RefreshCw,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Toast } from '@/components/shared/Toast'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDate } from '@/lib/utils'

const imageTypes = ['All', 'Social Media Post', 'Thumbnail']

function typeToBackend(type: string): string | undefined {
  if (type === 'Social Media Post') return 'social_media'
  if (type === 'Thumbnail') return 'thumbnail'
  return undefined
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

async function fetchGallery({ type, search }: { type: string; search: string }) {
  const token = getToken()
  if (!token) return { items: [], total: 0 }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const res = await fetch(`${baseUrl}/api/images/gallery`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return { items: [], total: 0 }

  const data = await res.json()
  let items = data.items || []

  // Filter by type
  const backendType = typeToBackend(type)
  if (backendType) {
    items = items.filter((item: any) => item.image_type === backendType)
  }

  // Filter by search
  if (search.trim()) {
    const q = search.toLowerCase()
    items = items.filter(
      (item: any) =>
        (item.source_content || '').toLowerCase().includes(q) ||
        (item.image_type || '').toLowerCase().includes(q)
    )
  }

  return { items, total: items.length }
}

async function deleteImage(imageId: string): Promise<boolean> {
  const token = getToken()
  if (!token) return false
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const res = await fetch(`${baseUrl}/api/images/${imageId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.ok
}

async function downloadImage(imageUrl: string, imageType: string) {
  try {
    const fullUrl = imageUrl.startsWith('http')
      ? imageUrl
      : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${imageUrl}`
    const response = await fetch(fullUrl)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${imageType}-${Date.now()}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  } catch {
    // silent fail
  }
}

function ImageCard({
  item,
  onDelete,
  onDownload,
  isDeleting = false,
}: {
  item: any
  onDelete: (id: string) => void
  onDownload: (url: string, type: string) => void
  isDeleting?: boolean
}) {
  const imageUrl = item.image_url?.startsWith('http')
    ? item.image_url
    : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}${item.image_url}`
  const typeLabel = item.image_type === 'social_media' ? 'Social Media Post' : 'Thumbnail'

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        overflow: 'hidden',
        background: '#ffffff',
      }}
      className="group"
    >
      {/* Image */}
      <div style={{ aspectRatio: '1/1', overflow: 'hidden' }}>
        <img
          src={imageUrl}
          alt={typeLabel}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 12px' }}>
        <div className="flex items-center gap-1.5 mb-1.5">
          <span
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 500,
              backgroundColor: 'var(--primary-bg, #f0fdf4)',
              color: 'var(--primary-dark, #0c4d2f)',
            }}
          >
            {typeLabel}
          </span>
        </div>
        <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
          {item.created_at ? formatDate(item.created_at) : ''}
        </p>

        {/* Action icons */}
        <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
          <button
            onClick={() => onDownload(item.image_url, item.image_type)}
            style={{
              padding: '4px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            className="hover:bg-gray-100"
            title="Download"
          >
            <Download size={15} />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            disabled={isDeleting}
            style={{
              padding: '4px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isDeleting ? 0.5 : 1,
            }}
            className="hover:bg-red-50 hover:text-red-500"
            title="Delete"
          >
            {isDeleting ? <RefreshCw size={15} className="animate-spin" /> : <Trash2 size={15} />}
          </button>
        </div>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        overflow: 'hidden',
        background: '#ffffff',
      }}
    >
      <div
        style={{ aspectRatio: '1/1', background: '#f3f4f6' }}
        className="animate-pulse"
      />
      <div style={{ padding: '10px 12px' }}>
        <div
          style={{
            width: '80px',
            height: '18px',
            background: '#f3f4f6',
            borderRadius: '999px',
            marginBottom: '6px',
          }}
          className="animate-pulse"
        />
        <div
          style={{
            width: '100px',
            height: '12px',
            background: '#f3f4f6',
            borderRadius: '4px',
            marginBottom: '8px',
          }}
          className="animate-pulse"
        />
        <div style={{ display: 'flex', gap: '4px' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              background: '#f3f4f6',
              borderRadius: '6px',
            }}
            className="animate-pulse"
          />
          <div
            style={{
              width: '24px',
              height: '24px',
              background: '#f3f4f6',
              borderRadius: '6px',
            }}
            className="animate-pulse"
          />
        </div>
      </div>
    </div>
  )
}

export default function ImageGalleryPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' })

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ visible: true, message, type })
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 3000)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['image-gallery', filter, search],
    queryFn: () => fetchGallery({ type: filter, search }),
    staleTime: 60 * 1000,
  })

  const images = data?.items || []

  const promptDelete = (imageId: string) => {
    setDeleteTarget(imageId)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    handleDelete(deleteTarget)
    setDeleteTarget(null)
  }

  const handleDelete = async (imageId: string) => {
    if (deletingIds.has(imageId)) return
    setDeletingIds((prev) => new Set(prev).add(imageId))
    const ok = await deleteImage(imageId)
    setDeletingIds((prev) => {
      const next = new Set(prev)
      next.delete(imageId)
      return next
    })
    if (ok) {
      queryClient.invalidateQueries({ queryKey: ['image-gallery'] })
      showToast('Image deleted', 'success')
    } else {
      showToast('Failed to delete image', 'error')
    }
  }

  const handleDownload = (imageUrl: string, imageType: string) => {
    downloadImage(imageUrl, imageType)
  }

  return (
    <div className="px-4 md:px-6 lg:px-8 py-6 pb-24 md:pb-6 max-w-7xl mx-auto">
      <Toast type={toast.type} message={toast.message} visible={toast.visible} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">
            Image Gallery{' '}
            {!isLoading && (
              <span className="text-muted-foreground font-normal text-lg">
                ({data?.total ?? 0} items)
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            All your generated images in one place
          </p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search images..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-sm"
          />
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {imageTypes.map((type) => {
          const isActive = filter === type
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                isActive
                  ? 'bg-pk-green-500 text-white border-pk-green-500'
                  : 'hover:border-pk-green-300 text-muted-foreground'
              }`}
            >
              {type}
            </button>
          )
        })}
      </div>

      {/* Image Grid */}
      {isLoading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
          }}
          className="max-lg:grid-cols-2 max-sm:grid-cols-1"
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : images.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Image size={48} className="text-muted-foreground opacity-30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No images yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            Generate your first image from the Image Generator page
          </p>
          <Link href="/client/image-generator">
            <Button className="gap-2">
              <Sparkles size={16} />
              Go to Image Generator
              <ArrowRight size={16} />
            </Button>
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
          }}
          className="max-lg:grid-cols-2 max-sm:grid-cols-1"
        >
          {images.map((item: any) => (
            <ImageCard
              key={item.id}
              item={item}
              onDelete={promptDelete}
              onDownload={handleDownload}
              isDeleting={deletingIds.has(item.id)}
            />
          ))}
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Image"
        message="Are you sure you want to delete this image? This action cannot be undone."
        confirmLabel="Delete"
        loading={deleteTarget ? deletingIds.has(deleteTarget) : false}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
