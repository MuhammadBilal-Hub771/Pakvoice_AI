'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, ArrowRight, X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CrescentStarLogo } from '@/components/illustrations/logos'
import { AuthShell } from '@/components/shared/AuthShell'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from '@/lib/api'

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
  const [rememberMe, setRememberMe] = useState(false)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const storeToken = useAuthStore((s) => s.token)
  const login = useAuthStore((s) => s.login)

  const closeToast = () => {
    setToast(prev => ({ ...prev, show: false }))
  }

  // Hydrate remember-me from localStorage (client-only)
  useEffect(() => {
    setRememberMe(!!localStorage.getItem('remember-me'))
  }, [])

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

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const hasCookie = typeof document !== 'undefined' &&
        document.cookie.split(';').some(c => c.trim().startsWith('auth-token='))

      if (hasCookie) {
        const targetPath = role === 'admin' ? '/admin/dashboard' : '/client/home'
        router.push(targetPath)
      } else {
        // Stale localStorage — clear it and stay on login
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
    <AuthShell
      headline={<>Content that speaks your language</>}
      sub="Sign in to generate Urdu, English and Roman Urdu posts — on the web and on WhatsApp."
    >
      <div
        className={`fixed right-5 top-5 z-[9999] flex min-w-[280px] max-w-[420px] items-center justify-between gap-3 rounded-xl px-4 py-3 text-white shadow-lg transition-all ${
          toast.type === 'success' ? 'bg-pk-green-600' : 'bg-red-600'
        } ${toast.show ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-[120%] opacity-0'}`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {toast.type === 'success' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="shrink-0">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12l3 3 5-5" />
            </svg>
          ) : (
            <AlertCircle size={18} className="shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
        <button type="button" onClick={closeToast} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/20" aria-label="Close">
          <X size={14} />
        </button>
      </div>

      <div className="mb-8 lg:hidden">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pk-green-50 ring-1 ring-pk-green-100">
            <CrescentStarLogo size={26} />
          </span>
          <span className="text-lg font-bold text-gray-900">Pakvoice <span className="text-pk-green-600">AI</span></span>
        </Link>
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-gray-900">Welcome back</h1>
      <p className="mt-1.5 text-sm text-gray-500">Sign in to continue generating content.</p>

      <div className="relative mt-6 mb-6 inline-flex w-full rounded-xl border border-gray-200 bg-gray-50 p-1">
        <div
          className="absolute top-1 bottom-1 rounded-lg bg-pk-green-600 shadow-sm transition-all"
          style={{ left: role === 'client' ? '4px' : '50%', width: 'calc(50% - 4px)' }}
        />
        <button type="button" onClick={() => handleRoleChange('client')} className={`relative z-10 flex-1 rounded-lg py-2 text-sm font-semibold ${role === 'client' ? 'text-white' : 'text-gray-500'}`}>
          Client
        </button>
        <button type="button" onClick={() => handleRoleChange('admin')} className={`relative z-10 flex-1 rounded-lg py-2 text-sm font-semibold ${role === 'admin' ? 'text-white' : 'text-gray-500'}`}>
          Admin
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label className="field-label">Email</label>
          <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={getEmailBorder()} />
          {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
        </div>
        <div>
          <label className="field-label">Password</label>
          <div className="relative">
            <Input type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className={`pr-10 ${getPasswordBorder()}`} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {passwordError && <p className="mt-1 text-xs text-red-500">{passwordError}</p>}
        </div>
        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => {
                const checked = e.target.checked
                setRememberMe(checked)
                if (checked) localStorage.setItem('remember-me', 'true')
                else localStorage.removeItem('remember-me')
              }}
              className="rounded border-gray-300 text-pk-green-600 focus:ring-pk-green-500"
            />
            Remember me
          </label>
          <button type="button" className="text-sm font-medium text-pk-green-700 hover:underline" onClick={() => showToast('Please contact support to reset your password.', 'success')}>
            Forgot password?
          </button>
        </div>
        <Button type="submit" className="h-12 w-full text-[15px]" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : <span className="inline-flex items-center gap-2">Sign In <ArrowRight size={17} /></span>}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-100" /></div>
        <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">Or continue with</span></div>
      </div>

      <Button
        variant="outline"
        className="h-12 w-full border-gray-200"
        onClick={() => { window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/google` }}
      >
        <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Continue with Google
      </Button>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-semibold text-pk-green-700 hover:underline">Sign up</Link>
      </p>
    </AuthShell>
  )
}
