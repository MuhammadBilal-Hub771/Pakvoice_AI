'use client'

import React, { useState, useRef } from 'react'
import {
  Upload,
  FileText,
  File,
  Trash2,
  Search,
  FolderOpen,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useKBStore } from '@/stores/kbStore'
import { useDocuments, useUploadDocument, useDeleteDocument } from '@/hooks/useQueries'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { formatDate } from '@/lib/utils'

const categories = ['All', 'Products', 'Services', 'Company Info', 'Market Research']

const fileTypeConfig: Record<string, { color: string; Icon: React.ElementType }> = {
  pdf: { color: 'text-red-500', Icon: FileText },
  docx: { color: 'text-blue-500', Icon: FileText },
  txt: { color: 'text-gray-500', Icon: File },
  md: { color: 'text-purple-500', Icon: FileText },
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ClientKnowledgeBasePage() {
  const { documents, isUploading, uploadProgress, filters, setFilters } = useKBStore()
  const { isLoading } = useDocuments()
  const uploadMutation = useUploadDocument()
  const deleteMutation = useDeleteDocument()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadCategory, setUploadCategory] = useState('Products')
  const [uploadTags, setUploadTags] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const isTagsEmpty = !uploadTags.trim()
  const isUploadDisabled = !selectedFile || !uploadTitle.trim() || isTagsEmpty || isUploading

  const filteredDocs = documents.filter((doc) => {
    if (filters.category !== 'All' && doc.category !== filters.category) return false
    if (filters.search && !doc.title.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadTitle(file.name.replace(/\.[^/.]+$/, ''))
      setShowUploadForm(true)
    }
    e.target.value = ''
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleUpload = async () => {
    setHasInteracted(true)
    if (!selectedFile || !uploadTitle.trim() || isTagsEmpty) return
    try {
      await uploadMutation.mutateAsync({
        file: selectedFile,
        meta: {
          title: uploadTitle,
          category: uploadCategory,
          tags: uploadTags.split(',').map((t) => t.trim()).filter(Boolean),
        },
      })
      setShowUploadForm(false)
      setSelectedFile(null)
      setUploadTitle('')
      setUploadTags('')
      setHasInteracted(false)
    } catch {
      // Error handled by mutation
    }
  }

  const resetUpload = () => {
    setSelectedFile(null)
    setUploadTitle('')
    setUploadTags('')
    setHasInteracted(false)
    setShowUploadForm(false)
  }

  const handleDelete = (id: string) => {
    setDeleteTarget(id)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget)
    setDeleteTarget(null)
  }

  return (
    <div className="px-4 md:px-6 lg:px-8 py-6 pb-24 md:pb-6 max-w-7xl mx-auto">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.pdf,.docx"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Knowledge Base</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload and manage your business documents
          </p>
        </div>
        <Button
          onClick={handleUploadClick}
          className="bg-pk-green-500 hover:bg-pk-green-700 gap-2"
        >
          <Upload size={16} />
          Upload Document
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilters({ category: cat })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-all ${
              filters.category === cat
                ? 'bg-pk-green-500 text-white border-pk-green-500'
                : 'hover:border-pk-green-300 text-muted-foreground'
            }`}
          >
            {cat === 'All' ? <FolderOpen size={12} /> : null}
            {cat}
          </button>
        ))}
      </div>

      {/* Upload form — shown after file is selected */}
      {showUploadForm && selectedFile && (
        <div className="mb-6 p-4 rounded-xl border border-gray-200 bg-white shadow-sm animate-fade-up"
        >
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 mb-3">
            <FileText size={20} className="text-pk-green-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-400">{formatFileSize(selectedFile.size)}</p>
            </div>
            <button onClick={resetUpload} className="shrink-0">
              <X size={16} className="text-gray-400 hover:text-gray-600" />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mb-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Title</label>
              <Input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Document title"
                className="h-9 text-sm"
              />
            </div>
            <div className="w-full sm:w-[200px]">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Category</label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                {categories.filter((c) => c !== 'All').map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Tags <span className="text-red-400">*</span>
              </label>
              <Input
                value={uploadTags}
                onChange={(e) => {
                  setUploadTags(e.target.value)
                  setHasInteracted(true)
                }}
                placeholder="marketing, product, 2024"
                className={`h-9 text-sm ${hasInteracted && isTagsEmpty ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30' : ''}`}
              />
              {hasInteracted && isTagsEmpty && (
                <p className="mt-1 text-xs text-red-400">At least one tag is required</p>
              )}
            </div>
          </div>
          <Button
            onClick={handleUpload}
            disabled={isUploadDisabled}
            className="w-full h-11 gap-2"
            style={isUploadDisabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          >
            {isUploading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Uploading... {uploadProgress}%
              </>
            ) : (
              <>
                <Upload size={16} />
                Upload Document
              </>
            )}
          </Button>
        </div>
      )}

      {/* Document Grid or empty state */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="skeleton h-4 w-3/4 mb-3" />
                <div className="skeleton h-3 w-1/2 mb-2" />
                <div className="skeleton h-3 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredDocs.length === 0 ? (
        <p className="text-center text-gray-400 text-sm mt-6">
          {filters.search ? 'No matching documents found' : 'No documents uploaded yet'}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            const config = fileTypeConfig[doc.fileType] || fileTypeConfig.txt
            return (
              <div key={doc.id} className="animate-fade-up">
                <Card className="hover:shadow-md transition-shadow h-full">
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="flex items-start gap-3 mb-3">
                      <config.Icon size={24} className={`${config.color} shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium truncate">{doc.title}</h3>
                        <p className="text-xs text-muted-foreground">{doc.fileType.toUpperCase()}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="px-2 py-0.5 rounded-full bg-pk-green-100 text-[10px] font-medium text-pk-green-700">
                        {doc.category}
                      </span>
                      {doc.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-auto space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span>{doc.wordCount?.toLocaleString()} words</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDate(doc.uploadDate)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 mt-3 pt-3 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 text-red-500 hover:text-red-600 w-full"
                        onClick={() => handleDelete(doc.id)}
                      >
                        <Trash2 size={12} className="mr-1" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Document"
        message="Are you sure you want to delete this document? This action cannot be undone."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
