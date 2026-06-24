'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

function OAuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const login = useAuthStore((s) => s.login)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = searchParams.get('token')
    const name = searchParams.get('name')
    const email = searchParams.get('email')
    const role = searchParams.get('role')
    const errorParam = searchParams.get('error')

    if (errorParam) {
      setError(errorParam === 'access_denied' ? 'Google sign-in was cancelled.' : `OAuth error: ${errorParam}`)
      return
    }

    if (!token || !email || !role) {
      setError('Invalid OAuth response — missing required parameters.')
      return
    }

    const user = {
      id: email,
      name: name || 'User',
      email,
      role: role as 'admin' | 'client',
      city: searchParams.get('city') || '',
      is_active: true,
      created_at: new Date().toISOString(),
    }

    login(user, token)

    // Redirect based on role
    const target = role === 'admin' ? '/admin/dashboard' : '/client/home'
    router.replace(target)
  }, [searchParams, login, router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-2xl">✕</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign In Failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.replace('/login')}
            className="px-6 py-2.5 bg-pk-green-500 text-white rounded-lg hover:bg-pk-green-600 transition-colors font-medium"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600 font-medium">Signing you in...</p>
      </div>
    </div>
  )
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    }>
      <OAuthCallbackContent />
    </Suspense>
  )
}
