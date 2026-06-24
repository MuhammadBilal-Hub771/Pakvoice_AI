'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'

export interface ClientStats {
  total_generated: number
  this_month: number
  saved_content: number
  knowledge_docs: number
  total_generated_trend?: string
  this_month_trend?: string
  saved_content_trend?: string
  knowledge_docs_trend?: string
}

export function useClientStats() {
  const userId = useAuthStore((s) => s.user?.id)

  return useQuery<ClientStats>({
    queryKey: ['client-stats', userId],
    queryFn: async () => {
      const { fetchApi } = await import('@/lib/api')
      try {
        const res = await fetchApi<any>('/api/history/stats')
        return {
          total_generated: res.total_generated || 0,
          this_month: res.this_month || 0,
          saved_content: res.saved_content || 0,
          knowledge_docs: res.knowledge_docs || 0,
          total_generated_trend: res.total_generated_trend,
          this_month_trend: res.this_month_trend,
          saved_content_trend: res.saved_content_trend,
          knowledge_docs_trend: res.knowledge_docs_trend,
        }
      } catch {
        return {
          total_generated: 0,
          this_month: 0,
          saved_content: 0,
          knowledge_docs: 0,
        }
      }
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    enabled: !!userId,
  })
}

export function useInvalidateClientStats() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['client-stats'] })
}
