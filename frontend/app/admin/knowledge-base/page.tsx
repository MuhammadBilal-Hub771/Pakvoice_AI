'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Upload, FileText, File, Search, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate } from '@/lib/utils'

const categories = ['Products', 'Services', 'Company Info', 'Market Research']

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function AdminKnowledgeBasePage() {
  const [docs, setDocs] = useState([
    { id: '1', title: 'Company Overview 2024', category: 'Company Info', fileName: 'overview.pdf', fileType: 'pdf', fileSize: 245000, uploadDate: new Date().toISOString(), tags: ['company', 'overview'], userId: 'admin' },
    { id: '2', title: 'Product Catalog Textile', category: 'Products', fileName: 'catalog.docx', fileType: 'docx', fileSize: 512000, uploadDate: new Date(Date.now() - 86400000).toISOString(), tags: ['textile', 'products'], userId: 'admin' },
    { id: '3', title: 'Market Research Pakistan', category: 'Market Research', fileName: 'research.txt', fileType: 'txt', fileSize: 125000, uploadDate: new Date(Date.now() - 172800000).toISOString(), tags: ['research', 'market'], userId: 'admin' },
  ])
  const [search, setSearch] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadCategory, setUploadCategory] = useState('Products')
  const [uploadTags, setUploadTags] = useState('')
  const [showUpload, setShowUpload] = useState(false)

  const filtered = docs.filter(function(d) {
    return !search || d.title.toLowerCase().includes(search.toLowerCase())
  })

  const handleFileSelect = function(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadTitle(file.name.replace(/\.[^/.]+$/, ''))
      setShowUpload(true)
    }
    e.target.value = ''
  }

  const handleUploadClick = function() {
    fileInputRef.current?.click()
  }

  const handleUpload = function() {
    if (!selectedFile || !uploadTitle) return
    const newDoc = {
      id: String(Date.now()),
      title: uploadTitle,
      category: uploadCategory,
      fileName: selectedFile.name,
      fileType: selectedFile.name.split('.').pop() || 'txt',
      fileSize: selectedFile.size,
      uploadDate: new Date().toISOString(),
      tags: uploadTags.split(',').map(function(t) { return t.trim() }).filter(Boolean),
      userId: 'admin',
    }
    setDocs(function(prev) { return [newDoc, ...prev] })
    setShowUpload(false)
    setSelectedFile(null)
    setUploadTitle('')
    setUploadTags('')
  }

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.pdf,.docx"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">Knowledge Base</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all uploaded documents across the platform</p>
        </div>
        <Button onClick={handleUploadClick} className="bg-pk-green-500 hover:bg-pk-green-700 gap-2">
          <Upload size={16} /> Upload Document
        </Button>
      </div>

      {showUpload && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div
              onDragOver={function(e) { e.preventDefault(); setDragOver(true) }}
              onDragLeave={function() { setDragOver(false) }}
              onDrop={function(e) {
                e.preventDefault()
                setDragOver(false)
                const file = e.dataTransfer.files[0]
                if (file) {
                  setSelectedFile(file)
                  setUploadTitle(file.name.replace(/\.[^/.]+$/, ''))
                }
              }}
              className={'border-2 border-dashed rounded-lg p-6 text-center transition-all ' + (
                dragOver ? 'border-pk-green-500 bg-pk-green-50' : 'border-muted-foreground/25'
              )}
            >
              <Upload size={32} className="mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Drag & drop or click to upload</p>
              <p className="text-xs text-muted-foreground mt-1">.txt, .md, .pdf, .docx</p>
            </div>

            {selectedFile && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <FileText size={20} className="text-pk-green-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  <button onClick={function() { setSelectedFile(null); setShowUpload(false) }}>
                    <X size={16} className="text-muted-foreground hover:text-foreground" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block">Title</label>
                    <Input
                      value={uploadTitle}
                      onChange={function(e) { setUploadTitle(e.target.value) }}
                      placeholder="Document title"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Category</label>
                    <select
                      value={uploadCategory}
                      onChange={function(e) { setUploadCategory(e.target.value) }}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    >
                      {categories.map(function(cat) { return <option key={cat} value={cat}>{cat}</option> })}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Tags (comma separated)</label>
                    <Input
                      value={uploadTags}
                      onChange={function(e) { setUploadTags(e.target.value) }}
                      placeholder="marketing, product, 2024"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <Button onClick={handleUpload} disabled={!uploadTitle} className="w-full gap-2">
                  <Upload size={16} /> Upload Document
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search documents..." value={search} onChange={function(e) { setSearch(e.target.value) }} className="pl-9 h-9 text-sm" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(function(doc) {
          return (
            <div key={doc.id} className="animate-fade-up">
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <FileText size={24} className="text-pk-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium truncate">{doc.title}</h3>
                      <p className="text-xs text-muted-foreground">{doc.fileType.toUpperCase()}</p>
                    </div>
                    <button className="text-muted-foreground hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="px-2 py-0.5 rounded-full bg-pk-green-100 text-[10px] font-medium text-pk-green-700">{doc.category}</span>
                    {doc.tags.map(function(t) { return <span key={t} className="px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground">{t}</span> })}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{formatDate(doc.uploadDate)}</p>
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}
