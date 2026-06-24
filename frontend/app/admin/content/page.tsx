'use client'

import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  Eye,
  Flag,
  CheckCircle,
  Trash2,
  Download,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ContentTypeBadge, CityBadge, LanguageBadge } from '@/components/illustrations/BadgeStickers'
import { useAdminStore } from '@/stores/adminStore'
import { useAdminContent } from '@/hooks/useQueries'
import { adminApi } from '@/lib/api'
import { useUIStore } from '@/stores/uiStore'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { cleanContent, formatDate } from '@/lib/utils'
import type { GeneratedContent } from '@/types'

export default function AdminContentPage() {
  const queryClient = useQueryClient()
  const { contentItems } = useAdminStore()
  const addNotification = useUIStore((s) => s.addNotification)
  const [search, setSearch] = useState('')
  const [filterFlagged, setFilterFlagged] = useState(false)
  const [previewItem, setPreviewItem] = useState<GeneratedContent | null>(null)
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // Fetch real content from API
  const { data: contentData, isLoading } = useAdminContent()

  const displayItems: GeneratedContent[] = contentData?.items?.length
    ? contentData.items
    : contentItems.length > 0
    ? contentItems
    : []

  // Flag/unflag mutation
  const flagMutation = useMutation({
    mutationFn: ({ contentId, flagged }: { contentId: string; flagged: boolean }) =>
      adminApi.flagContent(contentId, flagged),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'content'] })
      addNotification({ type: 'success', title: 'Content updated', message: 'Flag status changed' })
    },
    onError: (error: Error) => {
      addNotification({ type: 'error', title: 'Action failed', message: error.message })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (contentId: string) => adminApi.deleteContent(contentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'content'] })
      addNotification({ type: 'success', title: 'Content deleted', message: 'Content removed' })
    },
    onError: (error: Error) => {
      addNotification({ type: 'error', title: 'Delete failed', message: error.message })
    },
  })

  const filtered = displayItems.filter((item) => {
    if (filterFlagged && !item.saved) return false // Use 'saved' as proxy for 'flagged' since backend uses that field
    if (search && !item.title.toLowerCase().includes(search.toLowerCase()) && !item.userName?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleFlag = (contentId: string, currentlyFlagged: boolean) => {
    setActionLoading((prev) => ({ ...prev, [contentId]: 'flagging' }))
    flagMutation.mutate({ contentId, flagged: !currentlyFlagged }, {
      onSettled: () => setActionLoading((prev) => {
        const next = { ...prev }
        delete next[contentId]
        return next
      }),
    })
  }

  const handleDelete = (contentId: string) => {
    setDeleteTarget(contentId)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    if (previewItem?.id === deleteTarget) setPreviewItem(null)
    setActionLoading((prev) => ({ ...prev, [deleteTarget]: 'deleting' }))
    deleteMutation.mutate(deleteTarget, {
      onSettled: () => {
        setActionLoading((prev) => {
          const next = { ...prev }
          delete next[deleteTarget]
          return next
        })
        setDeleteTarget(null)
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">Content Review</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? 'Loading...' : `Review all generated content (${displayItems.length} items)`}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search content or user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={filterFlagged}
            onChange={() => setFilterFlagged(!filterFlagged)}
            className="rounded border-gray-300 text-pk-saffron focus:ring-pk-saffron"
          />
          Show saved/flagged only
        </label>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading content...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No content found</div>
        ) : (
          filtered.map((item) => (
            <div key={item.id} className="animate-fade-up">
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <ContentTypeBadge label={item.contentType} />
                        <CityBadge label={item.city} />
                        <LanguageBadge label={item.language === 'english' ? 'English' : item.language === 'urdu' ? 'Urdu' : 'Roman Urdu'} />
                      </div>
                      <h3 className="text-sm font-semibold">{item.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{cleanContent(item.content)}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>by <span className="font-medium text-foreground">{item.userName || 'Unknown'}</span></span>
                        <span>·</span>
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setPreviewItem(item)}
                        className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                        title="Preview"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleFlag(item.id, !!item.saved)}
                        disabled={actionLoading[item.id] === 'flagging'}
                        className="p-2 rounded-md text-pk-saffron hover:text-pk-saffron/80 hover:bg-pk-saffron/10 disabled:opacity-50"
                        title={item.saved ? 'Unflag' : 'Flag'}
                      >
                        <Flag size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={actionLoading[item.id] === 'deleting'}
                        className="p-2 rounded-md text-red-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))
        )}
      </div>

      {previewItem && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setPreviewItem(null)} />
          <div className="fixed inset-4 md:inset-x-20 md:inset-y-12 z-50 bg-card rounded-xl border shadow-xl overflow-auto animate-scale-in">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-heading font-bold">Content Preview</h2>
                <button onClick={() => setPreviewItem(null)} className="text-muted-foreground hover:text-foreground">
                  <XCircle size={20} />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ContentTypeBadge label={previewItem.contentType} />
                <CityBadge label={previewItem.city} />
                <LanguageBadge label={previewItem.language === 'english' ? 'English' : previewItem.language === 'urdu' ? 'Urdu' : 'Roman Urdu'} />
              </div>
              <h3 className="text-xl font-semibold">{previewItem.title}</h3>
              <div className={`p-4 rounded-lg bg-muted/30 whitespace-pre-wrap text-sm ${previewItem.language === 'urdu' ? 'rtl-content' : ''}`}>
                {cleanContent(previewItem.content)}
              </div>
              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  Generated by <span className="font-medium">{previewItem.userName}</span> on {formatDate(previewItem.createdAt)}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => { handleFlag(previewItem.id, !!previewItem.saved); setPreviewItem(null) }}
                  >
                    <Flag size={14} /> {previewItem.saved ? 'Unflag' : 'Flag'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-red-600"
                    onClick={() => handleDelete(previewItem.id)}
                  >
                    <Trash2 size={14} /> Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Content"
        message="Are you sure you want to delete this content? This action cannot be undone."
        confirmLabel="Delete"
        loading={deleteTarget ? actionLoading[deleteTarget] === 'deleting' : false}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
