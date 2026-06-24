import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import { getQueryClient } from '@/lib/query-provider'
import { useGenerateStore } from '@/stores/generateStore'
import { useKBStore } from '@/stores/kbStore'
import { useImageStore } from '@/stores/imageStore'

interface AuthStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isAdmin: boolean
  login: (user: User, token: string) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
  clearAuth: () => void
}

const STORAGE_KEY = 'pakvoice-auth'

function clearAllCaches() {
  // Clear TanStack Query cache to prevent cross-user data leakage
  try {
    const qc = getQueryClient()
    if (qc) qc.clear()
  } catch {}

  // Clear Zustand stores that hold user-specific data
  try {
    useGenerateStore.getState().reset()
    // Also clear persisted generate history from localStorage
    useGenerateStore.persist.clearStorage()
    useKBStore.getState().reset()
    useImageStore.getState().reset()
    useImageStore.persist.clearStorage()
  } catch {}
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isAdmin: false,

      login: (user: User, token: string) => {
        // Clear all cached data from previous session (prevents cross-user data leakage)
        clearAllCaches()

        // Set auth cookie for middleware to read (7 day expiry)
        if (typeof document !== 'undefined') {
          document.cookie = `auth-token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
        }
        set({
          user,
          token,
          isAuthenticated: true,
          isAdmin: user.role === 'admin',
        })
      },

      logout: () => {
        // Best-effort: call backend to blacklist token
        const token = useAuthStore.getState().token
        if (token && typeof window !== 'undefined') {
          const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
          fetch(`${baseUrl}/api/auth/logout`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {})
        }
        // Clear auth cookie
        if (typeof document !== 'undefined') {
          document.cookie = 'auth-token=; path=/; max-age=0; SameSite=Lax'
        }

        // Clear all cached data so next user sees fresh state
        clearAllCaches()

        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isAdmin: false,
        })
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY)
        }
      },

      clearAuth: () => {
        // Best-effort: call backend to blacklist token
        const token = useAuthStore.getState().token
        if (token && typeof window !== 'undefined') {
          const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
          fetch(`${baseUrl}/api/auth/logout`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {})
        }
        if (typeof document !== 'undefined') {
          document.cookie = 'auth-token=; path=/; max-age=0; SameSite=Lax'
        }
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isAdmin: false,
        })
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY)
        }
      },

      updateUser: (updates: Partial<User>) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
          isAdmin: state.user?.role === 'admin',
        })),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        isAdmin: state.isAdmin,
      }),
      onRehydrateStorage: () => {
        return (state, error) => {
          // Auto-login: restore the auth cookie from persisted token
          // so middleware reads it and keeps user logged in on refresh
          if (state?.token && typeof document !== 'undefined') {
            document.cookie = `auth-token=${state.token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
          }
          if (error) {
            console.warn('Auth store rehydration error:', error)
          }
        }
      },
    }
  )
)
