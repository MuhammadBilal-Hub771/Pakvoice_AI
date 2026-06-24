'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, ArrowRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CrescentStarLogo } from '@/components/illustrations/logos'
import { ThemeSwitcher } from '@/components/shared/ThemeSwitcher'
import { ParticlesBackground } from '@/components/shared/ParticlesBackground'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from '@/lib/api'

// #region agent log
const LOG = (msg: string, data: Record<string, unknown>, hypothesisId: string) => {
  fetch('http://127.0.0.1:7312/ingest/1cf36e37-3935-4a84-8ca6-a207321a7330', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '47bf90' },
    body: JSON.stringify({ sessionId: '47bf90', runId: 'run1', hypothesisId, location: 'login/page.tsx:LOG', message: msg, data, timestamp: Date.now() }),
  }).catch(() => {})
}
// #endregion

interface ToastState {
  show: boolean
  message: string
  type: 'success' | 'error'
}

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<'client' | 'admin'>('client')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'error' })
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const storeToken = useAuthStore((s) => s.token)
  const login = useAuthStore((s) => s.login)

  const closeToast = () => {
    setToast(prev => ({ ...prev, show: false }))
  }

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(closeToast, 4000)
      return () => clearTimeout(timer)
    }
  }, [toast.show])

  // Sync error state when role changes
  useEffect(() => {
    setError('')
  }, [role])

  // #region agent log — mount snapshot
  useEffect(() => {
    const rawLs = typeof localStorage !== 'undefined' ? localStorage.getItem('pakvoice-auth') : null
    let parsedAuth: Record<string, unknown> = {}
    try { parsedAuth = rawLs ? JSON.parse(rawLs) : {} } catch {}
    const cookiesRaw = typeof document !== 'undefined' ? document.cookie : ''
    const hasCookie = cookiesRaw.split(';').some(c => c.trim().startsWith('auth-token='))
    LOG('login-mount', {
      isAuthenticated, userRole: user?.role, storeRole: role,
      hasCookie, localStorageKeys: Object.keys(parsedAuth),
      localStorageState: parsedAuth?.state ? (parsedAuth.state as Record<string, unknown>)?.isAuthenticated : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 60) : 'ssr',
    }, 'A')
  }, [])
  // #endregion

  // Only redirect if BOTH zustand state AND cookie are valid
  // If cookie is missing (expired/cleared), clear stale localStorage state
  useEffect(() => {
    // #region agent log — redirect check
    LOG('redirect-check', {
      isAuthenticated,
      userRole: user?.role,
      componentRole: role,
      storeUserEmail: user?.email,
      storeTokenPresent: !!storeToken,
    }, 'A')
    // #endregion
    if (isAuthenticated) {
      const hasCookie = typeof document !== 'undefined' &&
        document.cookie.split(';').some(c => c.trim().startsWith('auth-token='))

      // #region agent log — cookie check result
      LOG('cookie-check', { isAuthenticated, hasCookie, componentRole: role, userRole: user?.role }, 'A')
      // #endregion

      if (hasCookie) {
        const targetPath = role === 'admin' ? '/admin/dashboard' : '/client/home'
        // #region agent log — redirect path
        LOG('redirect-trigger', { isAuthenticated, hasCookie, targetPath, componentRole: role, userRole: user?.role, redirectMismatch: user?.role !== role }, 'B')
        // #endregion
        router.push(targetPath)
      } else {
        // Stale localStorage — clear it and stay on login
        // #region agent log — stale state clear
        LOG('stale-state-clear', { isAuthenticated, hasCookie, componentRole: role, userRole: user?.role }, 'E')
        // #endregion
        useAuthStore.getState().clearAuth()
      }
    }
  }, [isAuthenticated, router, role, user, storeToken])

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type })
  }

  const validateEmail = (value: string): string | null => {
    if (!value.trim()) return 'Email is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email'
    return null
  }

  const validatePassword = (value: string): string | null => {
    if (!value.trim()) return 'Password is required'
    if (value.length < 6) return 'Password must be at least 6 characters'
    return null
  }

  const emailError = isSubmitted ? validateEmail(email) : null
  const passwordError = isSubmitted ? validatePassword(password) : null

  const getEmailBorder = () => {
    if (emailError) return 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
    if (isSubmitted && !email.trim()) return 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
    if (email.trim() && !emailError) return 'border-green-500 focus:border-green-500 focus:ring-green-500/30'
    return 'border-gray-300 focus:border-pk-green-500 focus:ring-pk-green-500/30'
  }

  const getPasswordBorder = () => {
    if (passwordError) return 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
    if (isSubmitted && !password.trim()) return 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
    if (password.trim() && !passwordError) return 'border-green-500 focus:border-green-500 focus:ring-green-500/30'
    return 'border-gray-300 focus:border-pk-green-500 focus:ring-pk-green-500/30'
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitted(true)
    setError('')

    const eErr = validateEmail(email)
    const pErr = validatePassword(password)
    if (eErr || pErr) return

    setIsSubmitting(true)

    try {
      const result = await authApi.login(email, password, role)
      login(result.user, result.token)

      // Show toast first, then wait, then redirect
      showToast('Login successful! Welcome back', 'success')
      await new Promise((resolve) => setTimeout(resolve, 1200))

      router.push(role === 'admin' ? '/admin/dashboard' : '/client/home')
    } catch (err: any) {
      showToast(err.message || 'Login failed. Please check your credentials.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRoleChange = (newRole: 'client' | 'admin') => setRole(newRole)

  return (
    <div className="flex min-h-screen">
      {/* Inline toast - stays in this component, won't unmount on layout change */}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: toast.type === 'success' ? '#16a34a' : '#dc2626',
          color: 'white',
          padding: '14px 20px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '14px',
          fontWeight: '500',
          transform: toast.show ? 'translateX(0)' : 'translateX(120%)',
          opacity: toast.show ? 1 : 0,
          transition: 'all 0.3s ease',
          pointerEvents: toast.show ? 'auto' : 'none',
        }}
      >
        <span style={{ fontSize: '16px', fontWeight: 'bold', flexShrink: 0 }}>
          {toast.type === 'success' ? '✓' : '✕'}
        </span>
        <span style={{ flex: 1 }}>{toast.message}</span>
        <button
          onClick={closeToast}
          type="button"
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            height: '24px',
            width: '24px',
            padding: 0,
          }}
          aria-label="Close notification"
        >
          <X size={14} />
        </button>
      </div>

      {/* LEFT PANEL - Hero/Illustration */}
      <div
        className="hidden lg:flex lg:w-[60%] relative overflow-hidden"
        style={{ backgroundColor: 'var(--login-panel-bg)' }}
      >
        {/* Animated cityscape silhouette */}
        <div className="absolute inset-0 opacity-20">
          <svg viewBox="0 0 800 600" fill="none" className="w-full h-full">
            {/* City buildings */}
            <rect x="100" y="400" width="40" height="200" fill="white" opacity="0.3">
              <animate attributeName="opacity" values="0.3;0.4;0.3" dur="4s" repeatCount="indefinite" />
            </rect>
            <rect x="160" y="350" width="50" height="250" fill="white" opacity="0.25" />
            <rect x="230" y="380" width="35" height="220" fill="white" opacity="0.3" />
            <rect x="280" y="300" width="60" height="300" fill="white" opacity="0.2">
              <animate attributeName="opacity" values="0.2;0.35;0.2" dur="5s" repeatCount="indefinite" />
            </rect>
            <rect x="360" y="370" width="45" height="230" fill="white" opacity="0.25" />
            <rect x="420" y="320" width="55" height="280" fill="white" opacity="0.3" />
            <rect x="490" y="360" width="40" height="240" fill="white" opacity="0.2" />
            <rect x="550" y="280" width="70" height="320" fill="white" opacity="0.25" />
            {/* Minaret */}
            <rect x="630" y="250" width="20" height="350" fill="white" opacity="0.3" />
            <circle cx="640" cy="240" r="12" fill="white" opacity="0.3" />
            {/* Crescent moon */}
            <path d="M680 80 Q700 60 720 80 Q700 70 680 80Z" fill="#d4af37" opacity="0.8">
              <animate attributeName="opacity" values="0.8;1;0.8" dur="3s" repeatCount="indefinite" />
            </path>
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 w-full">
          <div className="animate-fade-up">
            <h1
              className="text-5xl font-heading font-bold text-white mb-4"
            >
              AI-Powered Business<br />
              <span className="text-pk-gold">Content Generator</span>
            </h1>
            <p
              className="text-3xl text-pk-green-300 mb-2 font-urdu"
              style={{ fontFamily: "'Noto Nastaliq Urdu', serif", lineHeight: 2 }}
            >
              آپ کا کاروبار، ہماری زبان
            </p>
            <p className="text-lg text-pk-green-100">
              Pakistan&apos;s smartest business content AI
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
        {/* Background: radial gradient */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              'radial-gradient(ellipse at top right, #f0fdf4, #ffffff, #f9fafb)',
          }}
        />

        {/* Decorative blurred green circles */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-15 pointer-events-none"
          style={{ background: '#86efac', filter: 'blur(80px)' }} />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full opacity-10 pointer-events-none"
          style={{ background: '#dcfce7', filter: 'blur(80px)' }} />
        <div className="absolute top-1/3 -left-16 w-48 h-48 rounded-full opacity-10 pointer-events-none"
          style={{ background: '#86efac', filter: 'blur(80px)' }} />

        {/* Floating particles */}
        <ParticlesBackground />

        {/* Frosted glass card */}
        <div
          className="relative z-10 w-full max-w-md rounded-[24px] border border-white/60 animate-fade-up"
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
          }}
        >
          <div
            className="p-8 md:p-10 space-y-7"
          >
            {/* Logo */}
            <div className="flex flex-col items-center">
              <div>
                <CrescentStarLogo size={48} />
              </div>
              <span className="mt-2 text-2xl font-heading font-bold">Pakvoice</span>
              <span className="text-xs text-muted-foreground">AI</span>
            </div>

            {/* Role Toggle */}
            <div className="flex justify-center">
              <div className="inline-flex rounded-lg border p-1 bg-white/60 relative">
                {/* Sliding pill indicator */}
                <div
                  className="absolute top-1 bottom-1 rounded-md bg-pk-green-500 shadow-sm z-0"
                  style={{
                    left: role === 'client' ? '4px' : '50%',
                    width: 'calc(50% - 4px)',
                  }}
                />
                <button
                  onClick={() => handleRoleChange('client')}
                  className={`relative z-10 flex-1 px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                    role === 'client' ? 'text-white' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Client
                </button>
                <button
                  onClick={() => handleRoleChange('admin')}
                  className={`relative z-10 flex-1 px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                    role === 'admin' ? 'text-white' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Admin
                </button>
              </div>
            </div>

            {/* Form */}
            <div>
              <form onSubmit={onSubmit} className="space-y-5" noValidate>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Email</label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={getEmailBorder()}
                  />
                  {emailError && (
                    <p className="mt-1 text-xs text-red-500">{emailError}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`pr-10 ${getPasswordBorder()}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordError && (
                    <p className="mt-1 text-xs text-red-500">{passwordError}</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-pk-green-500 focus:ring-pk-green-500"
                    />
                    Remember me
                  </label>
                  <button type="button" className="text-sm text-pk-green-600 hover:underline">
                    Forgot password?
                  </button>
                </div>

                <Button
                  type="submit"
                  className="relative w-full bg-pk-green-500 hover:bg-pk-green-700 h-12 text-base overflow-hidden group"
                  disabled={isSubmitting}
                >
                  {/* Shimmer overlay on hover */}
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  {isSubmitting ? (
                    <span className="relative flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    <span className="relative flex items-center justify-center gap-2">
                      Sign In <ArrowRight size={18} />
                    </span>
                  )}
                </Button>
              </form>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white/80 px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            {/* Google OAuth */}
            <div>
              <Button
                variant="outline"
                className="w-full h-12 border-gray-200 hover:bg-white/80"
                onClick={() => {
                  window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/google`
                }}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </Button>
            </div>

            {/* Register link */}
            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-pk-green-600 font-medium hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Theme Switcher - bottom right */}
        <div className="absolute bottom-6 right-6 z-20">
          <ThemeSwitcher />
        </div>
      </div>
    </div>
  )
}
