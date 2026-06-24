'use client'

import React from 'react'
import { FileText, BookOpen, Search, Inbox } from 'lucide-react'

interface EmptyStateProps {
  type?: 'history' | 'kb' | 'results' | 'default'
  title: string
  description?: string
  action?: React.ReactNode
}

const icons = {
  history: Inbox,
  kb: BookOpen,
  results: Search,
  default: FileText,
}

export function EmptyState({ type = 'default', title, description, action }: EmptyStateProps) {
  const Icon = icons[type]

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon size={28} className="text-muted-foreground" />
      </div>
      <h3 className="text-lg font-heading font-semibold">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground max-w-md">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
