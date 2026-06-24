import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ImageType = 'social_media' | 'thumbnail'

interface ImageStore {
  imageType: ImageType
  pastedContent: string
  generatedImage: string | null
  isSaved: boolean
  _hasHydrated: boolean
  setImageType: (type: ImageType) => void
  setPastedContent: (content: string) => void
  setGeneratedImage: (url: string | null) => void
  setIsSaved: (saved: boolean) => void
  reset: () => void
}

export const useImageStore = create<ImageStore>()(
  persist(
    (set) => ({
      imageType: 'social_media',
      pastedContent: '',
      generatedImage: null,
      isSaved: false,
      _hasHydrated: false,

      setImageType: (imageType) => set({ imageType }),
      setPastedContent: (pastedContent) => set({ pastedContent }),
      setGeneratedImage: (generatedImage) => set({ generatedImage }),
      setIsSaved: (isSaved) => set({ isSaved }),

      reset: () =>
        set({
          imageType: 'social_media',
          pastedContent: '',
          generatedImage: null,
          isSaved: false,
        }),
    }),
    {
      name: 'pakvoice-image-generator',
      partialize: (state) => ({
        imageType: state.imageType,
        pastedContent: state.pastedContent,
        generatedImage: state.generatedImage,
        isSaved: state.isSaved,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state._hasHydrated = true
      },
    }
  )
)
