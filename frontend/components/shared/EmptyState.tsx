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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 py-16 px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-pk-green-50 text-pk-green-600">
        <Icon size={24} />
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm text-gray-500">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
