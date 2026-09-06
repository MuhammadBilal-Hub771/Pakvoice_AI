import Link from 'next/link'
import { type ReactNode } from 'react'
import { CrescentStarLogo } from '@/components/illustrations/logos'

export function AuthShell({
  children,
  headline,
  sub,
}: {
  children: ReactNode
  headline: ReactNode
  sub: string
}) {
  return (
    <div data-theme="green" className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-pk-green-800 to-pk-green-900 lg:flex lg:flex-col lg:justify-between p-12">
        <div aria-hidden className="pointer-events-none absolute -left-20 -top-24 h-80 w-80 rounded-full bg-pk-green-600/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-pk-green-300/10 blur-3xl" />
        <Link href="/" className="relative flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
            <CrescentStarLogo size={26} />
          </span>
          <span className="text-lg font-bold text-white">
            Pakvoice <span className="text-pk-green-300">AI</span>
          </span>
        </Link>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-bold leading-tight tracking-tight text-white">{headline}</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/70">{sub}</p>
        </div>
        <p className="relative text-xs text-white/40">Made for Pakistani businesses</p>
      </div>
      <div className="relative flex items-center justify-center bg-white px-4 py-10 sm:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_100%_0%,#f0fdf4_0%,transparent_60%)]"
        />
        <div className="relative w-full max-w-[420px]">{children}</div>
      </div>
    </div>
  )
}
