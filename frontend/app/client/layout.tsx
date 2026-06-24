'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home,
  Sparkles,
  Image,
  Images,
  History,
  BookOpen,
  User,
  LogOut,
} from 'lucide-react'
import { CrescentStarLogo } from '@/components/illustrations/logos'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { Toast } from '@/components/shared/Toast'
import { useAuthStore } from '@/stores/authStore'

const navLinks = [
  { href: '/client/home', label: 'Home', icon: Home },
  { href: '/client/generate', label: 'Generate', icon: Sparkles },
  { href: '/client/image-generator', label: 'Image Generator', icon: Image },
  { href: '/client/image-gallery', label: 'Image Gallery', icon: Images },
  { href: '/client/history', label: 'History', icon: History },
  { href: '/client/knowledge-base', label: 'Knowledge Base', icon: BookOpen },
]

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Prefetch all routes immediately for instant navigation
  useEffect(() => {
    router.prefetch('/client/home')
    router.prefetch('/client/generate')
    router.prefetch('/client/image-generator')
    router.prefetch('/client/image-gallery')
    router.prefetch('/client/history')
    router.prefetch('/client/knowledge-base')
    router.prefetch('/client/profile')
  }, [router])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    setDropdownOpen(false)
    setToastType('info')
    setToastMessage('Logged out successfully. See you soon!')
    setShowToast(true)
    setTimeout(() => {
      logout()
      router.push('/login')
    }, 200)
  }

  return (
    <div className="min-h-screen bg-background">
      <Toast type={toastType} message={toastMessage} visible={showToast} />

      {/* Top Navigation */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-8">
            <Link href="/client/home" className="flex items-center gap-2">
              <CrescentStarLogo size={32} />
              <span className="font-heading font-bold text-lg hidden sm:inline">
                Pakvoice <span className="text-pk-green-500">AI</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-pk-green-100 text-pk-green-700'
                        : 'text-gray-900 hover:bg-muted'
                    }`}
                  >
                    <Icon size={16} />
                    {link.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            <div className="relative hidden sm:block" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium transition-all ${
                  dropdownOpen
                    ? 'ring-2 ring-pk-green-500 bg-pk-green-500'
                    : 'bg-pk-green-500 hover:ring-2 hover:ring-pk-green-300'
                }`}
                aria-label="User menu"
              >
                {user?.name?.charAt(0) || 'U'}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-10 min-w-[180px] bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-2 animate-fade-in">
                  <div className="flex items-center gap-3 px-3 py-3 border-b border-gray-100 mb-1">
                    <div className="w-9 h-9 rounded-full bg-pk-green-500 flex items-center justify-center text-white text-sm font-medium shrink-0">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'User'}</p>
                      <p className="text-xs text-gray-400 truncate">{user?.email || ''}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { router.push('/client/profile'); setDropdownOpen(false) }}
                    className="flex items-center gap-2 w-full px-3.5 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-pk-green-50 transition-colors text-left"
                  >
                    <User size={16} className="text-gray-400" />
                    My Profile
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-3.5 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>

            <button
              className="md:hidden p-2 rounded-md text-gray-900 hover:bg-muted"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileMenuOpen ? (
                  <path d="M5 5l10 10M15 5l-10 10" />
                ) : (
                  <>
                    <path d="M3 5h14" />
                    <path d="M3 10h14" />
                    <path d="M3 15h14" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Nav — CSS transition instead of Framer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t px-4 py-3 space-y-1 animate-fade-in">
            {navLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-pk-green-100 text-pk-green-700'
                      : 'text-gray-900 hover:bg-muted'
                  }`}
                >
                  <Icon size={18} />
                  {link.label}
                </Link>
              )
            })}
          </div>
        )}
      </header>

      {/* Main content — no JS animation wrapper */}
      <main className="flex-1">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-around h-16 px-2">
          {navLinks.slice(0, 6).map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md transition-colors ${
                  isActive ? 'text-pk-green-500' : 'text-gray-900'
                }`}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{link.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
