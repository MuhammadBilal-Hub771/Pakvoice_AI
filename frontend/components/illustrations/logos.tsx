import React from 'react'

export const CrescentStarLogo = React.memo(({ size = 40, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="crescentGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#16a34a" />
        <stop offset="100%" stopColor="#0c4d2f" />
      </linearGradient>
    </defs>
    {/* Crescent */}
    <path
      d="M20 5C14 5 9 10 9 16s5 11 11 11c1.5 0 3-.3 4.3-.9C22.5 27.5 21 29 21 31c0 4 3.5 7 7.5 6.5A12 12 0 0120 5z"
      fill="url(#crescentGrad)"
    />
    {/* Star */}
    <polygon
      points="20,2 22.5,9 30,9 24,13.5 26.5,21 20,16.5 13.5,21 16,13.5 10,9 17.5,9"
      fill="#d4af37"
      transform="translate(14, 18) scale(0.6)"
    />
  </svg>
))
CrescentStarLogo.displayName = 'CrescentStarLogo'

export const PakvoiceLogo = React.memo(({ size = 32, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size * 4}
    height={size}
    viewBox="0 0 160 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <CrescentStarLogo size={32} />
    <text x="38" y="28" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="700" fontSize="22" fill="currentColor">
      Pakvoice
    </text>
    <text x="38" y="40" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="500" fontSize="10" fill="#16a34a" letterSpacing="2">
      AI
    </text>
  </svg>
))
PakvoiceLogo.displayName = 'PakvoiceLogo'

export const ContentTypeIcon = React.memo(({ type, size = 24 }: { type: string; size?: number }) => {
  const icons: Record<string, JSX.Element> = {
    'Social Media Post': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="2" width="20" height="16" rx="2" />
        <path d="M12 18v4M8 22h8" />
        <circle cx="12" cy="10" r="3" />
        <path d="M8 6h8" strokeWidth="1.5" />
      </svg>
    ),
    'Blog Article': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19.5v-15A2.5 2.5 0 016.5 2H20v20H6.5a2.5 2.5 0 010-5H20" />
        <path d="M8 7h8M8 11h6M8 15h4" strokeWidth="1.5" />
      </svg>
    ),
    'Product Description': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    ),
    'Email Marketing': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M22 7l-10 7L2 7" />
        <path d="M6 16h4M14 16h4" strokeWidth="1.5" />
      </svg>
    ),
    'Press Release': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 6h16M4 12h16M4 18h12" />
        <circle cx="20" cy="18" r="2" />
      </svg>
    ),
    'Website Content': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    'Advertisement Copy': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        <path d="M8 10h.01M12 10h.01M16 10h.01" strokeWidth="1.5" />
      </svg>
    ),
  }

  return icons[type] || icons['Blog Article'] || <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /></svg>
})
ContentTypeIcon.displayName = 'ContentTypeIcon'
