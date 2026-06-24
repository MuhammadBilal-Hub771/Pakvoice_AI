'use client'

import React from 'react'
import { Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUIStore, type Theme } from '@/stores/uiStore'

const themes: { id: Theme; label: string; color: string }[] = [
  { id: 'green', label: 'Green', color: '#16a34a' },
  { id: 'red', label: 'Red', color: '#dc2626' },
  { id: 'blue', label: 'Blue', color: '#1e3a5f' },
]

export function ThemeToggle() {
  const [open, setOpen] = React.useState(false)
  const { theme, setTheme } = useUIStore()
  const ref = React.useRef<HTMLDivElement>(null)

  // Close on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        className="relative"
        aria-label="Switch theme"
      >
        <Palette className="h-5 w-5" />
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 rounded-md border bg-card shadow-lg z-50 py-1">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTheme(t.id)
                setOpen(false)
              }}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm hover:bg-muted transition-colors cursor-pointer"
            >
              <span
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: t.color }}
              />
              <span className={theme === t.id ? 'font-medium' : ''}>{t.label}</span>
              {theme === t.id && (
                <span className="ml-auto text-xs">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
