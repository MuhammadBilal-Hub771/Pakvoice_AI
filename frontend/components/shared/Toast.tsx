'use client'

import React, { useEffect, useCallback } from 'react'
import { X, AlertCircle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  type: ToastType
  message: string
  visible: boolean
  onClose?: () => void
}

export function Toast({ type, message, visible, onClose }: ToastProps) {
  const handleClose = useCallback(() => {
    onClose?.()
  }, [onClose])

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(handleClose, 4000)
      return () => clearTimeout(timer)
    }
  }, [visible, handleClose])

  const bgColor =
    type === 'success' ? '#16a34a' :
    type === 'error' ? '#dc2626' :
    '#166534'

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '14px 16px',
        borderRadius: 12,
        background: bgColor,
        color: 'white',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        minWidth: 280,
        maxWidth: 420,
        transform: visible ? 'translateX(0)' : 'translateX(120%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.3s ease, opacity 0.3s ease',
        pointerEvents: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {type === 'success' && (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12l3 3 5-5" />
          </svg>
        )}
        {type === 'error' && (
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
        )}
        {type === 'info' && (
          <span style={{ fontSize: 18, flexShrink: 0 }}>👋</span>
        )}
        <span style={{ fontSize: 14, fontWeight: 500, wordBreak: 'break-word' }}>{message}</span>
      </div>

      {onClose && (
        <button
          onClick={handleClose}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: 6,
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'white',
            flexShrink: 0,
            padding: 0,
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
