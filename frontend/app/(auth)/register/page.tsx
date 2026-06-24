'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, ArrowRight, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CrescentStarLogo } from '@/components/illustrations/logos'
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
    try {
      await registerMutation.mutateAsync({
        name: data.name,
        email: data.email,
        password: data.password,
        city: selectedCity,
        industry: selectedIndustry,
      })
      router.push('/client/home')
    } catch {
      // Error handled by mutation
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* LEFT PANEL */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden"
        style={{ backgroundColor: 'var(--login-panel-bg)' }}>
        <div className="absolute inset-0 opacity-15">
          <svg viewBox="0 0 800 600" fill="none" className="w-full h-full">
            <rect x="100" y="400" width="40" height="200" fill="white" opacity="0.3" />
            <rect x="160" y="350" width="50" height="250" fill="white" opacity="0.25" />
            <rect x="280" y="300" width="60" height="300" fill="white" opacity="0.2" />
            <rect x="360" y="370" width="45" height="230" fill="white" opacity="0.25" />
            <rect x="420" y="320" width="55" height="280" fill="white" opacity="0.3" />
            <rect x="550" y="280" width="70" height="320" fill="white" opacity="0.25" />
            <rect x="630" y="250" width="20" height="350" fill="white" opacity="0.3" />
            <circle cx="640" cy="240" r="12" fill="white" opacity="0.3" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col justify-center px-16 w-full animate-fade-up">
            <h1 className="text-4xl font-heading font-bold text-white mb-4">
              Join <span className="text-pk-gold">PakVoice AI</span>
            </h1>
            <p className="text-xl text-pk-green-300 mb-3 font-urdu" style={{ fontFamily: "'Noto Nastaliq Urdu', serif", lineHeight: 2 }}>
              اپنے کاروبار کو بڑھائیں
            </p>
            <p className="text-base text-pk-green-100">Grow your business with AI-powered content tailored for Pakistan</p>
          </div>
        </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div
          className="w-full max-w-md space-y-6 animate-page-enter"
        >
          <div className="flex flex-col items-center">
            <CrescentStarLogo size={40} />
            <span className="mt-2 text-xl font-heading font-bold">Create Account</span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Full Name</label>
              <Input placeholder="Muhammad Ali" {...register('name')} className={errors.name ? 'border-red-500' : ''} />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <Input type="email" placeholder="you@example.com" {...register('email')} className={errors.email ? 'border-red-500' : ''} />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">City</label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select city</option>
                  {PAKISTANI_CITIES.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Industry</label>
                <select
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Confirm Password</label>
              <Input type="password" placeholder="••••••••" {...register('confirmPassword')} className={errors.confirmPassword ? 'border-red-500' : ''} />
              {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <Button type="submit" className="w-full bg-pk-green-500 hover:bg-pk-green-700 h-11 text-base" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Create Account <UserPlus size={18} />
                </span>
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div>
          </div>

          <Button variant="outline" className="w-full h-11" onClick={() => { window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/google` }}>
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-pk-green-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
