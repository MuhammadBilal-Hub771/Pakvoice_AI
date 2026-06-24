'use client'

import { useQuery } from '@tanstack/react-query'

export interface AdminStats {
  total_users: number
  content_today: number
  api_calls: number
  api_limit: number
  active_sessions: number
  documents_in_kb: number
  total_users_trend?: string
  content_today_trend?: string
  api_calls_trend?: string
  active_sessions_trend?: string
  documents_in_kb_trend?: string
}

export function useAdminDashboardStats() {
  return useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { adminApi } = await import('@/lib/api')
      try {
        return await adminApi.getStats().then((data) => ({
          total_users: data.totalUsers,
          content_today: data.contentToday,
          api_calls: data.apiCalls,
          api_limit: data.apiLimit,
          active_sessions: data.activeSessions,
          documents_in_kb: data.kbDocuments,
          total_users_trend: data.usersTrend !== undefined ? `${data.usersTrend > 0 ? '+' : ''}${data.usersTrend}%` : undefined,
          content_today_trend: data.contentTrend !== undefined ? `${data.contentTrend > 0 ? '+' : ''}${data.contentTrend}%` : undefined,
        }))
      } catch {
        // Fallback mock data for frontend dev
        return {
          total_users: 0,
          content_today: 0,
          api_calls: 0,
          api_limit: 50000,
          active_sessions: 0,
          documents_in_kb: 0,
        }
      }
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  })
}
