'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CrescentStarLogo } from '@/components/illustrations/logos'
import { AuthShell } from '@/components/shared/AuthShell'
import { useRegister } from '@/hooks/useQueries'
import { useAuthStore } from '@/stores/authStore'

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  city: z.string().optional(),
  industry: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type RegisterForm = z.infer<typeof registerSchema>

const PAKISTANI_CITIES = [
  'Karachi', 'Lahore', 'Islamabad', 'Peshawar', 'Quetta',
  'Faisalabad', 'Multan', 'Rawalpindi', 'Hyderabad', 'Gujranwala',
]

const INDUSTRIES = [
  'Textile', 'IT & Software', 'Agriculture', 'Healthcare',
  'Education', 'Retail', 'Manufacturing', 'Food & Beverage',
]

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedIndustry, setSelectedIndustry] = useState('')
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const registerMutation = useRegister()
  const [formError, setFormError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  React.useEffect(() => {
    if (isAuthenticated) {
      router.push('/client/home')
    }
  }, [isAuthenticated, router])

  const onSubmit = async (data: RegisterForm) => {
    setFormError('')
    if (!selectedCity) {
      setFormError('Please select your city.')
      return
    }
    try {
      await registerMutation.mutateAsync({
        name: data.name,
        email: data.email,
        password: data.password,
        city: selectedCity,
        industry: selectedIndustry || undefined,
      })
      router.push('/client/home')
    } catch (err: any) {
      setFormError(err?.message || 'Could not create account. Check that the backend is running.')
    }
  }

  return (
    <AuthShell
      headline={<>Start creating content for your business</>}
      sub="Free to start. No credit card. Urdu, English and Roman Urdu from day one."
    >
      <div className="mb-8 lg:hidden">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pk-green-50 ring-1 ring-pk-green-100">
            <CrescentStarLogo size={26} />
          </span>
          <span className="text-lg font-bold text-gray-900">Pakvoice <span className="text-pk-green-600">AI</span></span>
        </Link>
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-gray-900">Create your account</h1>
      <p className="mt-1.5 text-sm text-gray-500">Takes less than a minute. You can generate right after.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div>
          <label className="field-label">Full Name</label>
          <Input placeholder="Muhammad Ali" {...register('name')} className={errors.name ? 'border-red-500' : ''} />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>
        <div>
          <label className="field-label">Email</label>
          <Input type="email" placeholder="you@example.com" {...register('email')} className={errors.email ? 'border-red-500' : ''} />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">City</label>
            <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pk-green-500/15">
              <option value="">Select city</option>
              {PAKISTANI_CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Industry</label>
            <select value={selectedIndustry} onChange={(e) => setSelectedIndustry(e.target.value)} className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pk-green-500/15">
              <option value="">Select</option>
              {INDUSTRIES.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="field-label">Password</label>
          <div className="relative">
            <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...register('password')} className={errors.password ? 'border-red-500 pr-10' : 'pr-10'} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
        </div>
        <div>
          <label className="field-label">Confirm Password</label>
          <Input type="password" placeholder="••••••••" {...register('confirmPassword')} className={errors.confirmPassword ? 'border-red-500' : ''} />
          {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
        </div>
        <Button type="submit" className="h-12 w-full text-[15px]" disabled={isSubmitting || registerMutation.isPending}>
          {isSubmitting || registerMutation.isPending ? 'Creating account...' : <span className="inline-flex items-center gap-2">Create Account <UserPlus size={17} /></span>}
        </Button>
        {formError && <p className="text-center text-sm text-red-600">{formError}</p>}
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-100" /></div>
        <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">Or</span></div>
      </div>

      <Button variant="outline" className="h-12 w-full border-gray-200" onClick={() => { window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/google` }}>
        <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Continue with Google
      </Button>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-pk-green-700 hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  )
}
