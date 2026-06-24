import { create } from 'zustand'
import type { Notification } from '@/types'

export type Theme = 'green' | 'red' | 'blue'

interface UIStore {
  theme: Theme
  notifications: Notification[]
  sidebarOpen: boolean
  mobileNavOpen: boolean
  setTheme: (theme: Theme) => void
  addNotification: (notification: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setMobileNavOpen: (open: boolean) => void
}

let notificationId = 0

function getInitialTheme(): Theme {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('pk-theme')
    if (stored === 'green' || stored === 'red' || stored === 'blue') {
      return stored
    }
  }
  return 'green'
}

export const useUIStore = create<UIStore>()((set) => ({
  theme: getInitialTheme(),
  notifications: [],
  sidebarOpen: true,
  mobileNavOpen: false,

  setTheme: (theme: Theme) => {
    localStorage.setItem('pk-theme', theme)
    set({ theme })
  },

  addNotification: (notification: Omit<Notification, 'id'>) => {
    const id = `notification-${++notificationId}`
    const newNotification: Notification = { ...notification, id }

    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }))

    if (notification.type !== 'loading') {
      const duration = notification.duration || 3000
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }))
      }, duration)
    }

    return id
  },

  removeNotification: (id: string) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearNotifications: () => set({ notifications: [] }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),

  setMobileNavOpen: (open: boolean) => set({ mobileNavOpen: open }),
}))
