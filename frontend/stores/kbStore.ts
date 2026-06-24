import { create } from 'zustand'
import type { Document } from '@/types'

interface KBStore {
  documents: Document[]
  uploadProgress: number
  isUploading: boolean
  filters: {
    category: string
    search: string
  }
  setDocuments: (docs: Document[]) => void
  addDocument: (doc: Document) => void
  removeDocument: (id: string) => void
  setUploadProgress: (progress: number) => void
  setIsUploading: (uploading: boolean) => void
  setFilters: (filters: Partial<KBStore['filters']>) => void
  reset: () => void
}

export const useKBStore = create<KBStore>()((set) => ({
  documents: [],
  uploadProgress: 0,
  isUploading: false,
  filters: {
    category: 'All',
    search: '',
  },

  setDocuments: (docs: Document[]) => set({ documents: docs }),

  addDocument: (doc: Document) =>
    set((state) => ({
      documents: [doc, ...state.documents],
    })),

  removeDocument: (id: string) =>
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
    })),

  setUploadProgress: (progress: number) =>
    set({ uploadProgress: progress }),

  setIsUploading: (uploading: boolean) => set({ isUploading: uploading }),

  setFilters: (filters: Partial<KBStore['filters']>) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  reset: () =>
    set({
      documents: [],
      uploadProgress: 0,
      isUploading: false,
      filters: { category: 'All', search: '' },
    }),
}))
