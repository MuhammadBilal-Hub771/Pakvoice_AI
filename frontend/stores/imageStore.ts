import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ImageType = 'social_media' | 'thumbnail'

/** What the generate endpoint returned, kept together so saving to the
 * gallery can reference the file the backend already stored. */
export interface GeneratedImageState {
  url: string
  id: string | null
  storagePath: string | null
}

interface ImageStore {
  imageType: ImageType
  pastedContent: string
  generatedImage: string | null
  generatedImageId: string | null
  generatedImageStoragePath: string | null
  isSaved: boolean
  _hasHydrated: boolean
  setImageType: (type: ImageType) => void
  setPastedContent: (content: string) => void
  setGeneratedImage: (image: GeneratedImageState | null) => void
  setIsSaved: (saved: boolean) => void
  reset: () => void
}

export const useImageStore = create<ImageStore>()(
  persist(
    (set) => ({
      imageType: 'social_media',
      pastedContent: '',
      generatedImage: null,
      generatedImageId: null,
      generatedImageStoragePath: null,
      isSaved: false,
      _hasHydrated: false,

      setImageType: (imageType) => set({ imageType }),
      setPastedContent: (pastedContent) => set({ pastedContent }),
      setGeneratedImage: (image) =>
        set({
          generatedImage: image?.url ?? null,
          generatedImageId: image?.id ?? null,
          generatedImageStoragePath: image?.storagePath ?? null,
        }),
      setIsSaved: (isSaved) => set({ isSaved }),

      reset: () =>
        set({
          imageType: 'social_media',
          pastedContent: '',
          generatedImage: null,
          generatedImageId: null,
          generatedImageStoragePath: null,
          isSaved: false,
        }),
    }),
    {
      name: 'pakvoice-image-generator',
      partialize: (state) => ({
        imageType: state.imageType,
        pastedContent: state.pastedContent,
        generatedImage: state.generatedImage,
        generatedImageId: state.generatedImageId,
        generatedImageStoragePath: state.generatedImageStoragePath,
        isSaved: state.isSaved,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state._hasHydrated = true
      },
    }
  )
)
