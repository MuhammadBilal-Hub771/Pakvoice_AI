import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
  preload: true,
})

export const metadata: Metadata = {
  title: 'Pakvoice - AI-Powered Pakistani Business Content Generator',
  description:
    'Generate culturally-relevant business content for the Pakistani market. Social posts, blogs, emails, and more with AI.',
  keywords: [
    'Pakistani business',
    'content generator',
    'AI content',
    'Urdu content',
    'Pakistan marketing',
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background font-body antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
