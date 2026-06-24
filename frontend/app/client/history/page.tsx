'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Search,
  Copy,
  Trash2,
  X,
  Check,
  Bookmark,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ContentTypeIcon } from '@/components/illustrations/logos'
import { ContentTypeBadge, LanguageBadge } from '@/components/illustrations/BadgeStickers'
import { EmptyState } from '@/components/shared/EmptyState'
import { useGenerateStore } from '@/stores/generateStore'
import { useDeleteHistory, useHistory } from '@/hooks/useQueries'
import { cleanContent, formatDate, copyToClipboard } from '@/lib/utils'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import type { ContentType, Language, GeneratedContent } from '@/types'

export default function HistoryPage() {
  const history = useGenerateStore((s) => s.history)
  const deleteMutation = useDeleteHistory()

  // Sync history from backend on mount — use query result directly
  const { isLoading, isFetching } = useHistory()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [previewItem, setPreviewItem] = useState<GeneratedContent | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (search.length >= 3 || search.length === 0) {
      const t = setTimeout(() => setDebouncedSearch(search), 300)
      return () => clearTimeout(t)
    }
  }, [search])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewItem(null)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const filtered = history
    .filter((item) => {
      if (debouncedSearch && !item.title.toLowerCase().includes(debouncedSearch.toLowerCase()) &&
          !item.content.toLowerCase().includes(debouncedSearch.toLowerCase())) return false
      return true
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const handleCopy = async (id: string, content: string) => {
    await copyToClipboard(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDelete = (id: string) => {
    setDeleteTarget(id)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget)
    if (previewItem?.id === deleteTarget) setPreviewItem(null)
    setDeleteTarget(null)
  }

  return (
    <div className="px-4 md:px-6 lg:px-8 py-6 pb-24 md:pb-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Content History</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Content List */}
      {isLoading || (isFetching && history.length === 0) ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pk-green-500 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading history...</p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          type="history"
          title="No content found"
          description={search ? 'Try adjusting your search or filter' : 'Start generating content to see it here'}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div key={item.id} className="animate-fade-up">
              <Card
                className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => setPreviewItem(item)}
              >
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="hidden sm:flex w-10 h-10 rounded-lg bg-muted items-center justify-center shrink-0">
                    <ContentTypeIcon type={item.contentType} size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium truncate">{item.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {cleanContent(item.content).slice(0, 150)}...
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <ContentTypeBadge label={item.contentType} />
                      <LanguageBadge label={
                        item.language === 'english' ? 'English' :
                        item.language === 'urdu' ? 'Urdu' : 'Roman Urdu'
                      } />
                      {item.saved && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-pk-green-100 text-pk-green-700 border border-pk-green-200">
                          <Bookmark size={10} />
                          Saved
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleCopy(item.id, item.content)}
                    >
                      {copiedId === item.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setPreviewItem(null)}
        >
          <div
            ref={modalRef}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-[700px] max-h-[80vh] flex flex-col overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-6 pb-3 border-b">
              <div>
                <h2 className="text-lg font-heading font-semibold">Content Preview</h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <ContentTypeBadge label={previewItem.contentType} />
                  <LanguageBadge label={
                    previewItem.language === 'english' ? 'English' :
                    previewItem.language === 'urdu' ? 'Urdu' : 'Roman Urdu'
                  } />
                  <span className="text-[11px] text-muted-foreground">
                    {formatDate(previewItem.createdAt)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="text-base font-heading font-semibold mb-3">{previewItem.title}</h3>
              <div
                className={`p-5 rounded-xl border border-gray-200 text-sm leading-relaxed whitespace-pre-wrap ${
                  previewItem.language === 'urdu'
                    ? 'font-urdu text-lg leading-[2.2] text-right rtl-content'
                    : ''
                }`}
                style={{ lineHeight: 1.8, fontSize: '15px' }}
              >
                {cleanContent(previewItem.content)}
              </div>
            </div>

            <div className="flex items-center gap-2 p-4 border-t bg-gray-50/50">
              <Button
                variant="outline"
                className="flex-1 gap-1.5 h-10 text-sm"
                onClick={() => handleCopy(previewItem.id, previewItem.content)}
              >
                {copiedId === previewItem.id ? (
                  <><Check size={15} className="text-green-600" /> Copied!</>
                ) : (
                  <><Copy size={15} /> Copy</>
                )}
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-1.5 h-10 text-sm text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                onClick={() => handleDelete(previewItem.id)}
              >
                <Trash2 size={15} /> Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Content"
        message="Are you sure you want to delete this content? This action cannot be undone."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
