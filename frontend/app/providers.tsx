'use client'

import { QueryProvider } from '@/lib/query-provider'
import { ThemeInitializer } from '@/components/shared/ThemeInitializer'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeInitializer>
      <QueryProvider>
        {children}
      </QueryProvider>
    </ThemeInitializer>
  )
}
