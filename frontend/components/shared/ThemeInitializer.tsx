'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/stores/uiStore'

export function ThemeInitializer({ children }: { children: React.ReactNode }) {
  const theme = useUIStore((s) => s.theme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return <>{children}</>
}
