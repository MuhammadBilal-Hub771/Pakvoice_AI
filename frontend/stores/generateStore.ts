import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ContentFormData, GeneratedContent, KnowledgeSource } from '@/types'

interface GenerateStore {
  formData: ContentFormData
  generatedContent: GeneratedContent | null
  history: GeneratedContent[]
  savedItems: string[]
  currentSources: KnowledgeSource[]
  isLoading: boolean
  setFormData: (data: Partial<ContentFormData>) => void
  resetFormData: () => void
  reset: () => void
  setGeneratedContent: (content: GeneratedContent | null) => void
  addToHistory: (content: GeneratedContent) => void
  setHistory: (history: GeneratedContent[]) => void
  toggleSaved: (id: string) => void
  setCurrentSources: (sources: KnowledgeSource[]) => void
  setIsLoading: (loading: boolean) => void
  updateGeneratedContent: (updates: Partial<GeneratedContent>) => void
  _hasHydrated: boolean
}

const defaultFormData: ContentFormData = {
  contentType: '',
  businessName: '',
  businessDescription: '',
  keyMessage: '',
  industry: '',
  city: '',
  targetAudience: '',
  language: 'english',
  tone: 'Professional',
  contentLength: 'medium',
  useKnowledgeBase: false,
  selectedDocs: [],
}

export const useGenerateStore = create<GenerateStore>()(
  persist(
    (set) => ({
      formData: defaultFormData,
      generatedContent: null,
      history: [],
      savedItems: [],
      currentSources: [],
      isLoading: false,
      _hasHydrated: false,

      setFormData: (data: Partial<ContentFormData>) =>
        set((state) => ({
          formData: { ...state.formData, ...data },
        })),

      resetFormData: () => set({ formData: defaultFormData }),

      reset: () =>
        set({
          formData: defaultFormData,
          generatedContent: null,
          history: [],
          savedItems: [],
          currentSources: [],
          isLoading: false,
        }),

      setGeneratedContent: (content: GeneratedContent | null) =>
        set({ generatedContent: content }),

      addToHistory: (content: GeneratedContent) =>
        set((state) => ({
          history: [content, ...state.history],
        })),

      setHistory: (history: GeneratedContent[]) => set({ history }),

      toggleSaved: (id: string) =>
        set((state) => ({
          savedItems: state.savedItems.includes(id)
            ? state.savedItems.filter((item) => item !== id)
            : [...state.savedItems, id],
        })),

      setCurrentSources: (sources: KnowledgeSource[]) =>
        set({ currentSources: sources }),

      setIsLoading: (loading: boolean) => set({ isLoading: loading }),

      updateGeneratedContent: (updates: Partial<GeneratedContent>) =>
        set((state) => ({
          generatedContent: state.generatedContent
            ? { ...state.generatedContent, ...updates }
            : null,
        })),
    }),
    {
      name: 'pakvoice-generate',
      partialize: (state) => ({
        history: state.history,
        savedItems: state.savedItems,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state._hasHydrated = true
      },
    }
  )
)
