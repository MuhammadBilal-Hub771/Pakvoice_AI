'use client'

import React, { useEffect } from 'react'
import { useUIStore, type Theme } from '@/stores/uiStore'

const themes: { id: Theme; label: string; color: string }[] = [
  { id: 'green', label: 'Green Theme', color: '#16a34a' },
  { id: 'red', label: 'Red Theme', color: '#dc2626' },
  { id: 'blue', label: 'Blue Theme', color: '#1e3a5f' },
]

export function ThemeSwitcher() {
  const { theme, setTheme } = useUIStore()

  // Apply data-theme attribute to <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <div className="flex items-center gap-2">
      {themes.map((t) => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          title={t.label}
          aria-label={t.label}
          className={`w-5 h-5 rounded-full transition-all duration-200 ease-in-out ${
            theme === t.id
              ? 'ring-2 ring-offset-2 ring-white shadow-md scale-110'
              : 'opacity-70 hover:opacity-100 hover:scale-110'
          }`}
          style={{ backgroundColor: t.color }}
        />
      ))}
    </div>
  )
}
