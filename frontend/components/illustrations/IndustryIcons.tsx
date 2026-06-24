import React from 'react'

export const IndustryIcon = React.memo(({ industry, size = 24 }: { industry: string; size?: number }) => {
  const icons: Record<string, JSX.Element> = {
    Textile: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 4l16 16M4 20L20 4" />
        <path d="M4 12h16" />
        <path d="M12 4v16" />
      </svg>
    ),
    'IT & Software': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
        <circle cx="12" cy="10" r="2" />
      </svg>
    ),
    Agriculture: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2v20M2 12h20" />
        <path d="M2 2l20 20" />
      </svg>
    ),
    Healthcare: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    Education: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 3h20v15H2z" />
        <path d="M6 6h12v2H6z" />
        <path d="M8 10h8v2H8z" />
        <path d="M10 14h4v2h-4z" />
        <path d="M2 18h20v3H2z" />
      </svg>
    ),
    Retail: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
    ),
    Manufacturing: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M6 7V5a2 2 0 012-2h8a2 2 0 012 2v2" />
        <line x1="12" y1="11" x2="12" y2="17" />
        <line x1="9" y1="14" x2="15" y2="14" />
      </svg>
    ),
    'Food & Beverage': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M18 8h1a4 4 0 010 8h-1" />
        <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    ),
    Construction: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="3" x2="9" y2="21" />
        <line x1="15" y1="3" x2="15" y2="21" />
      </svg>
    ),
    Transportation: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="6" width="22" height="12" rx="2" />
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
        <path d="M14 6l2 4h5" />
      </svg>
    ),
    'Banking & Finance': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="8" width="20" height="14" rx="2" />
        <path d="M2 12h20" />
        <rect x="6" y="15" width="3" height="5" />
        <rect x="11" y="15" width="3" height="5" />
        <rect x="15" y="15" width="3" height="5" />
        <path d="M12 2L4 8h16z" />
      </svg>
    ),
    'Real Estate': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 21h18" />
        <path d="M3 10l9-8 9 8" />
        <path d="M5 10v11" />
        <path d="M19 10v11" />
        <rect x="10" y="14" width="4" height="7" />
      </svg>
    ),
  }

  return icons[industry] || (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v12M6 12h12" />
    </svg>
  )
})
IndustryIcon.displayName = 'IndustryIcon'
