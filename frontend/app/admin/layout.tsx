'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FileText,
  BookOpen,
  BarChart3,
  Key,
  Settings,
  LogOut,
  User,
  Menu,
  X,
  ChevronLeft,
} from 'lucide-react'
import { CrescentStarLogo } from '@/components/illustrations/logos'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { Toast } from '@/components/shared/Toast'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

const sidebarLinks = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/content', label: 'Content Review', icon: FileText },
  { href: '/admin/knowledge-base', label: 'Knowledge Base', icon: BookOpen },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/api-keys', label: 'API Keys', icon: Key },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebar, setMobileSidebar] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success')

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Prefetch all admin routes for instant navigation
  useEffect(() => {
    router.prefetch('/admin/dashboard')
    router.prefetch('/admin/users')
    router.prefetch('/admin/analytics')
    router.prefetch('/admin/content')
    router.prefetch('/admin/knowledge-base')
    router.prefetch('/admin/api-keys')
    router.prefetch('/admin/settings')
  }, [router])

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

      {/* Mobile sidebar backdrop — CSS transition */}
      {mobileSidebar && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in"
          onClick={() => setMobileSidebar(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full bg-card border-r transition-all duration-200 flex flex-col',
          sidebarOpen ? 'w-60' : 'w-16',
          'hidden lg:flex'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex items-center h-16 border-b px-4',
          sidebarOpen ? 'justify-between' : 'justify-center'
        )}>
          {sidebarOpen ? (
            <>
              <Link href="/admin/dashboard" className="flex items-center gap-2">
                <CrescentStarLogo size={28} />
                <div>
                  <p className="text-sm font-heading font-bold leading-tight">Pakvoice</p>
                  <p className="text-[10px] text-pk-green-500 font-medium -mt-0.5">Admin Panel</p>
                </div>
              </Link>
              <button onClick={() => setSidebarOpen(false)} className="text-muted-foreground hover:text-foreground">
                <ChevronLeft size={16} />
              </button>
            </>
          ) : (
            <button onClick={() => setSidebarOpen(true)} className="font-heading font-bold text-lg text-pk-green-500">
              <CrescentStarLogo size={28} />
            </button>
          )}
        </div>

        {/* Nav Links */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {sidebarLinks.map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-pk-green-100 text-pk-green-700'
                    : 'text-gray-900 hover:bg-muted',
                  !sidebarOpen && 'justify-center px-2'
                )}
                title={sidebarOpen ? undefined : link.label}
              >
                <Icon size={18} />
                {sidebarOpen && <span>{link.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Bottom Avatar */}
        <div className={cn('border-t relative', sidebarOpen ? 'p-4' : 'p-2')} ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={cn(
              'flex items-center w-full transition-all',
              dropdownOpen ? 'ring-2 ring-pk-green-500 rounded-lg' : 'hover:ring-2 hover:ring-pk-green-300 rounded-lg',
              sidebarOpen ? 'gap-3 p-1' : 'justify-center p-1'
            )}
          >
            <div className="w-8 h-8 rounded-full bg-pk-green-500 flex items-center justify-center text-white text-xs font-medium shrink-0 cursor-pointer">
              {user?.name?.charAt(0) || 'A'}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-medium truncate">{user?.name || 'Admin'}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email || ''}</p>
              </div>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute left-2 bottom-full mb-2 min-w-[200px] bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-2 animate-fade-in">
              <div className="flex items-center gap-3 px-3 py-3 border-b border-gray-100 mb-1">
                <div className="w-9 h-9 rounded-full bg-pk-green-500 flex items-center justify-center text-white text-sm font-medium shrink-0">
                  {user?.name?.charAt(0) || 'A'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'Admin'}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email || ''}</p>
                </div>
              </div>
              <button
                onClick={() => { router.push('/admin/settings'); setDropdownOpen(false) }}
                className="flex items-center gap-2 w-full px-3.5 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-pk-green-50 transition-colors text-left"
              >
                <User size={16} className="text-gray-400" />
                My Profile
              </button>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={() => { handleLogout(); setDropdownOpen(false) }}
                className="flex items-center gap-2 w-full px-3.5 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile sidebar drawer — CSS slide transition */}
      {mobileSidebar && (
        <aside className="fixed left-0 top-0 z-50 h-full w-60 bg-card border-r lg:hidden flex flex-col animate-slide-in-left">
          <div className="flex items-center justify-between h-16 border-b px-4">
            <Link href="/admin/dashboard" className="flex items-center gap-2" onClick={() => setMobileSidebar(false)}>
              <CrescentStarLogo size={28} />
              <div>
                <p className="text-sm font-heading font-bold leading-tight">Pakvoice</p>
                <p className="text-[10px] text-pk-green-500 font-medium -mt-0.5">Admin Panel</p>
              </div>
            </Link>
            <button onClick={() => setMobileSidebar(false)}>
              <X size={18} />
            </button>
          </div>
          <nav className="flex-1 py-4 space-y-1 px-2">
            {sidebarLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileSidebar(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-pk-green-100 text-pk-green-700'
                      : 'text-gray-900 hover:bg-muted'
                  )}
                >
                  <Icon size={18} />
                  <span>{link.label}</span>
                </Link>
              )
            })}
          </nav>
        </aside>
      )}

      {/* Main content area */}
      <div className={cn(
        'transition-all duration-200',
        sidebarOpen ? 'lg:ml-60' : 'lg:ml-16'
      )}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-md text-muted-foreground hover:bg-muted"
              onClick={() => setMobileSidebar(true)}
            >
              <Menu size={20} />
            </button>
            <h2 className="text-sm font-medium text-muted-foreground hidden sm:block">
              {sidebarLinks.find((l) => l.href === pathname)?.label || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </header>

        {/* Page content — no JS animation wrapper */}
        <main className="p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
