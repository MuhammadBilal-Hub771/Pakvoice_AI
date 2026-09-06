'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { CrescentStarLogo } from '@/components/illustrations/logos'

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#content-types', label: 'Content' },
  { href: '#industries', label: 'Industries' },
  { href: '#faq', label: 'FAQ' },
]

export function LandingNav() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/85 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pk-green-50 ring-1 ring-pk-green-100">
            <CrescentStarLogo size={26} />
          </span>
          <span className="text-lg font-bold tracking-tight text-gray-900">
            Pakvoice <span className="text-pk-green-600">AI</span>
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-600 transition-colors hover:text-pk-green-700"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="text-sm font-medium text-gray-700 transition-colors hover:text-pk-green-700"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-pk-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-pk-green-700"
          >
            Start Free
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-pk-green-50 md:hidden"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {open && (
        <div className="animate-fade-up border-t border-gray-100 bg-white px-4 pb-5 pt-3 md:hidden">
          <div className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-pk-green-50 hover:text-pk-green-700"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-4">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-center text-sm font-semibold text-gray-700"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="rounded-xl bg-pk-green-600 px-5 py-2.5 text-center text-sm font-semibold text-white"
            >
              Start Free
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
