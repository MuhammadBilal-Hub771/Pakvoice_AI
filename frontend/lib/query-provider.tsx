'use client'

import React, { useState, useRef } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Module-level reference so authStore can clear cache on logout
let _queryClient: QueryClient | null = null
export function getQueryClient(): QueryClient | null {
  return _queryClient
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            retry: 1,
            retryDelay: 1000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            refetchOnMount: false,
            networkMode: 'offlineFirst',
          },
          mutations: {
            retry: 1,
            networkMode: 'offlineFirst',
          },
        },
      })
  )

  // Store reference for external access (authStore.clearAllCaches)
  _queryClient = queryClient

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
