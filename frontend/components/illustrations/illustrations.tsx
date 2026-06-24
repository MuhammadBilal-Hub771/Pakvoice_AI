import React from 'react'

export const HeroIllustration = React.memo(({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="heroBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#0c4d2f" stopOpacity="0.1" />
        <stop offset="100%" stopColor="#16a34a" stopOpacity="0.05" />
      </linearGradient>
      <linearGradient id="sparkGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#d4af37" />
        <stop offset="100%" stopColor="#f97316" />
      </linearGradient>
    </defs>

    {/* Background circle */}
    <rect width="500" height="400" rx="20" fill="url(#heroBg)" />

    {/* Badshahi Mosque silhouette */}
    <path d="M50 320 L50 240 L70 240 L70 220 L80 220 L80 200 L90 200 L90 180 L95 180 L95 200 L105 200 L105 220 L115 220 L115 240 L120 240 L120 260 L125 260 L125 280 L130 280 L130 300 L135 300 L135 320 Z" fill="#0c4d2f" opacity="0.3" />
    <path d="M150 320 L150 260 L155 260 L155 240 L160 240 L160 220 L165 220 L165 240 L170 240 L170 260 L175 260 L175 320 Z" fill="#0c4d2f" opacity="0.25" />
    <path d="M350 320 L350 260 L355 260 L355 240 L360 240 L360 220 L365 220 L365 240 L370 240 L370 260 L375 260 L375 320 Z" fill="#0c4d2f" opacity="0.25" />
    <path d="M390 320 L390 250 L395 250 L395 230 L400 230 L400 210 L405 210 L405 230 L410 230 L410 250 L415 250 L415 320 Z" fill="#0c4d2f" opacity="0.3" />

    {/* Person at desk */}
    <ellipse cx="250" cy="350" rx="80" ry="10" fill="#0c4d2f" opacity="0.15" />
    <rect x="210" y="260" width="80" height="60" rx="5" fill="#166534" />
    <rect x="215" y="265" width="70" height="5" rx="2" fill="#16a34a" />
    <rect x="215" y="275" width="50" height="3" rx="1.5" fill="#86efac" opacity="0.5" />
    <rect x="215" y="282" width="60" height="3" rx="1.5" fill="#86efac" opacity="0.5" />
    <rect x="215" y="289" width="40" height="3" rx="1.5" fill="#86efac" opacity="0.5" />

    {/* Desk */}
    <rect x="190" y="320" width="120" height="8" rx="2" fill="#0c4d2f" opacity="0.4" />
    <rect x="200" y="328" width="4" height="30" fill="#0c4d2f" opacity="0.3" />
    <rect x="296" y="328" width="4" height="30" fill="#0c4d2f" opacity="0.3" />

    {/* Person sitting */}
    <circle cx="250" cy="200" r="25" fill="#166534" opacity="0.8" />
    <ellipse cx="250" cy="250" rx="30" ry="35" fill="#0c4d2f" opacity="0.7" />
    <path d="M225 270 Q220 310 220 330 L280 330 Q280 310 275 270" fill="#166534" opacity="0.6" />

    {/* AI Sparks */}
    <g>
      <circle cx="310" cy="175" r="3" fill="#d4af37">
        <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="330" cy="160" r="2" fill="#f97316">
        <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="350" cy="180" r="4" fill="#16a34a">
        <animate attributeName="opacity" values="0;1;0" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="320" cy="195" r="2.5" fill="#d4af37">
        <animate attributeName="opacity" values="0;1;0" dur="1.8s" repeatCount="indefinite" />
      </circle>
    </g>

    {/* Neural network lines */}
    <g opacity="0.4">
      <line x1="310" y1="175" x2="330" y2="160" stroke="#16a34a" strokeWidth="1" />
      <line x1="330" y1="160" x2="350" y2="180" stroke="#d4af37" strokeWidth="1" />
      <line x1="350" y1="180" x2="320" y2="195" stroke="#f97316" strokeWidth="1" />
      <line x1="320" y1="195" x2="310" y2="175" stroke="#16a34a" strokeWidth="1" />
    </g>

    {/* Monitor glow */}
    <rect x="210" y="260" width="80" height="60" rx="5" fill="none" stroke="#16a34a" strokeWidth="1" opacity="0.3">
      <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite" />
    </rect>
  </svg>
))
HeroIllustration.displayName = 'HeroIllustration'

export const EmptyHistorySVG = React.memo(({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="40" y="30" width="120" height="90" rx="8" stroke="#16a34a" strokeWidth="2" fill="none" opacity="0.3" />
    <line x1="60" y1="55" x2="140" y2="55" stroke="#16a34a" strokeWidth="1.5" opacity="0.2" />
    <line x1="60" y1="70" x2="120" y2="70" stroke="#16a34a" strokeWidth="1.5" opacity="0.2" />
    <line x1="60" y1="85" x2="130" y2="85" stroke="#16a34a" strokeWidth="1.5" opacity="0.15" />
    <path d="M60 130 L60 170 L100 170 L100 130" stroke="#d4af37" strokeWidth="1.5" fill="none" opacity="0.4" />
    <path d="M80 130 L80 160" stroke="#d4af37" strokeWidth="1.5" opacity="0.3" />
    <circle cx="80" cy="118" r="15" stroke="#f97316" strokeWidth="2" fill="none" opacity="0.4" />
    <line x1="80" y1="110" x2="80" y2="126" stroke="#f97316" strokeWidth="1.5" opacity="0.3" />
    <line x1="72" y1="118" x2="88" y2="118" stroke="#f97316" strokeWidth="1.5" opacity="0.3" />
  </svg>
))
EmptyHistorySVG.displayName = 'EmptyHistorySVG'

export const UploadIllustration = React.memo(({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="uploadGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#16a34a" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#0c4d2f" stopOpacity="0.1" />
      </linearGradient>
    </defs>
    <rect x="20" y="50" width="160" height="120" rx="12" fill="url(#uploadGrad)" stroke="#16a34a" strokeWidth="1.5" strokeDasharray="6 4" />
    <rect x="60" y="30" width="80" height="100" rx="4" fill="#166534" opacity="0.3" />
    <rect x="70" y="40" width="60" height="6" rx="2" fill="#86efac" opacity="0.4" />
    <rect x="70" y="52" width="45" height="4" rx="2" fill="#86efac" opacity="0.3" />
    <rect x="70" y="62" width="50" height="4" rx="2" fill="#86efac" opacity="0.3" />
    <path d="M100 100 L100 70 M85 85 L100 70 L115 85" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M70 110 L130 110" stroke="#16a34a" strokeWidth="1.5" opacity="0.4" />
    <path d="M65 118 L135 118" stroke="#16a34a" strokeWidth="1.5" opacity="0.2" />
  </svg>
))
UploadIllustration.displayName = 'UploadIllustration'

export const EmptyStateKB = React.memo(({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="50" y="30" width="100" height="130" rx="4" stroke="#86efac" strokeWidth="1.5" fill="none" opacity="0.3" />
    <rect x="60" y="45" width="80" height="8" rx="2" fill="#86efac" opacity="0.2" />
    <rect x="60" y="60" width="60" height="5" rx="2" fill="#86efac" opacity="0.15" />
    <rect x="60" y="72" width="70" height="5" rx="2" fill="#86efac" opacity="0.15" />
    <rect x="60" y="84" width="50" height="5" rx="2" fill="#86efac" opacity="0.1" />
    <path d="M100 170 L100 140 M85 155 L100 140 L115 155" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
    <circle cx="170" cy="40" r="12" fill="#d4af37" opacity="0.2" />
    <text x="164" y="44" fontSize="12" fill="#d4af37" opacity="0.5">?</text>
  </svg>
))
EmptyStateKB.displayName = 'EmptyStateKB'

export const AISparkAnimation = React.memo(({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <g>
      <circle cx="50" cy="50" r="3" fill="#16a34a">
        <animate attributeName="r" values="3;6;3" dur="1.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="70" cy="30" r="2" fill="#d4af37">
        <animate attributeName="r" values="2;5;2" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="30" cy="70" r="2" fill="#f97316">
        <animate attributeName="r" values="2;4;2" dur="1.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.3;1" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="75" cy="65" r="1.5" fill="#86efac">
        <animate attributeName="r" values="1.5;3.5;1.5" dur="2.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.3;1" dur="2.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="25" cy="25" r="1.5" fill="#d4af37">
        <animate attributeName="r" values="1.5;3;1.5" dur="1.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.3;1" dur="1.6s" repeatCount="indefinite" />
      </circle>
    </g>
    {/* Sparkle paths */}
    <g opacity="0.6">
      <path d="M50 30 L50 35 M50 65 L50 70 M30 50 L35 50 M65 50 L70 50" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round">
        <animate attributeName="opacity" values="0;1;0" dur="1s" repeatCount="indefinite" />
      </path>
    </g>
  </svg>
))
AISparkAnimation.displayName = 'AISparkAnimation'

export const LoadingCrescent = React.memo(({ size = 40, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M20 5C14 5 9 10 9 16s5 11 11 11c1.5 0 3-.3 4.3-.9C22.5 27.5 21 29 21 31c0 4 3.5 7 7.5 6.5A12 12 0 0120 5z"
      fill="none"
      stroke="#16a34a"
      strokeWidth="2"
    >
      <animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="2s" repeatCount="indefinite" />
      <animate attributeName="stroke-dasharray" values="0 100;50 100;0 100" dur="2s" repeatCount="indefinite" />
    </path>
  </svg>
))
LoadingCrescent.displayName = 'LoadingCrescent'

export const NoResultsSVG = React.memo(({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="100" cy="85" r="40" stroke="#86efac" strokeWidth="2" fill="none" opacity="0.4" />
    <line x1="130" y1="115" x2="160" y2="145" stroke="#86efac" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
    <rect x="70" y="160" width="60" height="8" rx="4" fill="#86efac" opacity="0.15" />
    <rect x="80" y="175" width="40" height="5" rx="2.5" fill="#86efac" opacity="0.1" />
    <line x1="75" y1="80" x2="125" y2="80" stroke="#86efac" strokeWidth="1" opacity="0.2" />
    <line x1="75" y1="90" x2="110" y2="90" stroke="#86efac" strokeWidth="1" opacity="0.15" />
  </svg>
))
NoResultsSVG.displayName = 'NoResultsSVG'
