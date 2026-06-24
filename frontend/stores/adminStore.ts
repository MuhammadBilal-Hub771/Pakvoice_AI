import { create } from 'zustand'
import type { AdminStats, GeneratedContent, User, ContentTrend, CityStats, RecentActivity } from '@/types'

interface AdminStore {
  users: User[]
  stats: AdminStats | null
  contentItems: GeneratedContent[]
  trends: ContentTrend[]
  cityStats: CityStats[]
  recentActivity: RecentActivity[]
  isLoading: boolean
  setUsers: (users: User[]) => void
  setStats: (stats: AdminStats) => void
  setContentItems: (items: GeneratedContent[]) => void
  setTrends: (trends: ContentTrend[]) => void
  setCityStats: (stats: CityStats[]) => void
  setRecentActivity: (activity: RecentActivity[]) => void
  setIsLoading: (loading: boolean) => void
  updateUser: (userId: string, updates: Partial<User>) => void
  removeUser: (userId: string) => void
}

export const useAdminStore = create<AdminStore>()((set) => ({
  users: [],
  stats: null,
  contentItems: [],
  trends: [],
  cityStats: [],
  recentActivity: [],
  isLoading: false,

  setUsers: (users: User[]) => set({ users }),
  setStats: (stats: AdminStats) => set({ stats }),
  setContentItems: (items: GeneratedContent[]) => set({ contentItems: items }),
  setTrends: (trends: ContentTrend[]) => set({ trends }),
  setCityStats: (stats: CityStats[]) => set({ cityStats: stats }),
  setRecentActivity: (activity: RecentActivity[]) => set({ recentActivity: activity }),
  setIsLoading: (loading: boolean) => set({ isLoading: loading }),

  updateUser: (userId: string, updates: Partial<User>) =>
    set((state) => ({
      users: state.users.map((u) =>
        u.id === userId ? { ...u, ...updates } : u
      ),
    })),

  removeUser: (userId: string) =>
    set((state) => ({
      users: state.users.filter((u) => u.id !== userId),
    })),
}))
