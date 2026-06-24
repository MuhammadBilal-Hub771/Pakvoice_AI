'use client'

import { CrescentStarLogo } from '@/components/illustrations/logos'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

const sizeConfig = {
  sm: { logo: 32, container: 'py-4' },
  md: { logo: 48, container: 'py-8' },
  lg: { logo: 64, container: 'py-12' },
} as const

export function LoadingSpinner({ size = 'md', text = 'Loading...' }: LoadingSpinnerProps) {
  const config = sizeConfig[size]

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${config.container}`}>
      <div className="animate-spin" style={{ animationDuration: '2s' }}>
        <CrescentStarLogo size={config.logo} />
      </div>
      <p
        className={`text-sm text-muted-foreground animate-pulse ${size === 'lg' ? 'text-base' : ''}`}
      >
        {text}
      </p>
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <LoadingSpinner text="Loading..." />
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border p-6 space-y-4">
      <div className="skeleton h-4 w-3/4" />
      <div className="skeleton h-3 w-1/2" />
      <div className="skeleton h-3 w-full" />
      <div className="skeleton h-3 w-2/3" />
    </div>
  )
}
