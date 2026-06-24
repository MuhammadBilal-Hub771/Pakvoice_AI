import React from 'react'

interface BadgeProps {
  label: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const CityBadge = React.memo(({ label, size = 'sm', className = '' }: BadgeProps) => {
  const h = size === 'sm' ? 20 : size === 'md' ? 24 : 28
  const fontSize = size === 'sm' ? 9 : size === 'md' ? 11 : 13
  const w = label.length * (fontSize * 0.6) + 30

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" className={className}>
      <rect width={w} height={h} rx={h / 2} fill="#16a34a" />
      <path d="M6 ${h/2} L10 ${h/2-4} L14 ${h/2} L10 ${h/2+4} Z" fill="white" opacity="0.8" />
      <text x={22} y={h/2 + fontSize/3} fill="white" fontSize={fontSize} fontFamily="Inter, sans-serif" fontWeight="500">
        {label}
      </text>
    </svg>
  )
})
CityBadge.displayName = 'CityBadge'

export const LanguageBadge = React.memo(({ label, size = 'sm', className = '' }: BadgeProps) => {
  const h = size === 'sm' ? 20 : size === 'md' ? 24 : 28
  const fontSize = size === 'sm' ? 9 : size === 'md' ? 11 : 13
  const w = label.length * (fontSize * 0.6) + 30

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" className={className}>
      <rect width={w} height={h} rx={h / 2} fill="#0c4d2f" />
      <text x={10} y={h/2 + fontSize/3} fill="#86efac" fontSize={fontSize} fontFamily="Inter, sans-serif" fontWeight="500">
        {label === 'Urdu' ? '🇵🇰' : label === 'English' ? '🇬🇧' : '🇵🇰'}
      </text>
      <text x={26} y={h/2 + fontSize/3} fill="white" fontSize={fontSize} fontFamily="Inter, sans-serif" fontWeight="500">
        {label}
      </text>
    </svg>
  )
})
LanguageBadge.displayName = 'LanguageBadge'

export const IndustryBadge = React.memo(({ label, size = 'sm', className = '' }: BadgeProps) => {
  const h = size === 'sm' ? 20 : size === 'md' ? 24 : 28
  const fontSize = size === 'sm' ? 9 : size === 'md' ? 11 : 13
  const w = label.length * (fontSize * 0.6) + 20

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" className={className}>
      <rect width={w} height={h} rx={h / 2} fill="#f97316" opacity="0.15" />
      <text x={w/2} y={h/2 + fontSize/3} fill="#f97316" fontSize={fontSize} fontFamily="Inter, sans-serif" fontWeight="500" textAnchor="middle">
        {label}
      </text>
    </svg>
  )
})
IndustryBadge.displayName = 'IndustryBadge'

export const ContentTypeBadge = React.memo(({ label, size = 'sm', className = '' }: BadgeProps) => {
  const h = size === 'sm' ? 20 : size === 'md' ? 24 : 28
  const fontSize = size === 'sm' ? 9 : size === 'md' ? 11 : 13
  const w = label.length * (fontSize * 0.6) + 24

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" className={className}>
      <rect width={w} height={h} rx={h / 2} fill="#d4af37" opacity="0.15" />
      <text x={w/2} y={h/2 + fontSize/3} fill="#d4af37" fontSize={fontSize} fontFamily="Inter, sans-serif" fontWeight="600" textAnchor="middle">
        {label}
      </text>
    </svg>
  )
})
ContentTypeBadge.displayName = 'ContentTypeBadge'

// Scenario badge for showing floating badges in login
export const ScenarioBadge = React.memo(({
  label,
  x,
  y,
  color = '#16a34a',
  delay = 0,
}: {
  label: string
  x: number
  y: number
  color?: string
  delay?: number
}) => {
  const w = label.length * 9 + 24
  const h = 28

  return (
    <g>
      <animateTransform attributeName="transform" type="translate" values={`${x},${y};${x},${y-8};${x},${y}`} dur="4s" begin={`${delay}s`} repeatCount="indefinite" />
      <rect x={0} y={0} width={w} height={h} rx={14} fill={color} opacity="0.9" />
      <text x={14} y={19} fill="white" fontSize={11} fontFamily="Inter, sans-serif" fontWeight="500">
        {label}
      </text>
    </g>
  )
})
ScenarioBadge.displayName = 'ScenarioBadge'

// Status badge pills (for admin table)
export const StatusPill = React.memo(({ status }: { status: string }) => {
  const config: Record<string, { color: string; bg: string }> = {
    active: { color: '#16a34a', bg: '#dcfce7' },
    suspended: { color: '#ef4444', bg: '#fef2f2' },
    pending: { color: '#f59e0b', bg: '#fffbeb' },
  }
  const c = config[status] || { color: '#6b7280', bg: '#f3f4f6' }

  return (
    <svg width={70} height={22} viewBox="0 0 70 22" fill="none">
      <rect width={70} height={22} rx={11} fill={c.bg} />
      <circle cx={14} cy={11} r={4} fill={c.color} />
      <text x={24} y={16} fill={c.color} fontSize={10} fontFamily="Inter, sans-serif" fontWeight="600" style={{ textTransform: 'capitalize' }}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </text>
    </svg>
  )
})
StatusPill.displayName = 'StatusPill'
