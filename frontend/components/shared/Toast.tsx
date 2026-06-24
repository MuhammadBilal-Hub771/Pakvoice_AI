'use client'

import React from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  type: ToastType
  message: string
  visible: boolean
}

export function Toast({ type, message, visible }: ToastProps) {
  return (
    <div
      className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg text-white transition-all duration-300 ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      } ${type === 'success' ? 'bg-[#16a34a]' : ''} ${
        type === 'error' ? 'bg-red-600' : ''
      } ${type === 'info' ? 'bg-[#166534]' : ''}`}
    >
      {type === 'success' && (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 12l3 3 5-5" />
        </svg>
      )}
      {type === 'info' && <span className="text-lg">👋</span>}
      <span className="text-sm font-medium">{message}</span>
    </div>
  )
}
