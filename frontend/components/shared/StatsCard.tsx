'use client'

import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatsCardProps {
  value: string | number
  label: string
  icon: React.ReactNode
  trend?: string | null
  sublabel?: string
  onClick?: () => void
  isActive?: boolean
}

function TrendDisplay({ trend }: { trend: string | null | undefined }) {
  if (!trend) return null

  const isNew = trend === '+New'
  const isZero = trend === '0%'
  const isPositive = trend.startsWith('+') && !isNew
  const isNegative = trend.startsWith('-')

  let color: string
  let Icon: React.ElementType
  if (isNew || isPositive) {
    color = 'var(--positive, #16a34a)'
    Icon = TrendingUp
  } else if (isNegative) {
    color = 'var(--destructive, #dc2626)'
    Icon = TrendingDown
  } else {
    color = 'var(--muted-foreground, #9ca3af)'
    Icon = Minus
  }

  return (
    <span
      style={{
        fontSize: '11px',
        color,
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
      }}
    >
      <Icon size={11} /> {trend}
    </span>
  )
}

export function StatsCard({ value, label, icon, trend, sublabel, onClick, isActive = false }: StatsCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '20px',
        borderRadius: '12px',
        border: isActive ? '1px solid var(--primary-color)' : '1px solid #f3f4f6',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        background: isActive ? 'var(--primary-bg)' : 'var(--card, #ffffff)',
        height: '110px',
        minWidth: 0,
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
        if (!isActive) {
          e.currentTarget.style.borderColor = 'var(--primary-color)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
        if (!isActive) {
          e.currentTarget.style.borderColor = '#f3f4f6'
        }
      }}
    >
      {/* Row 1: Number + Icon */}
      <div className="flex justify-between items-start">
        <span
          className="text-[28px] font-bold leading-none"
          style={{ color: 'var(--foreground, #111827)' }}
        >
          {value}
        </span>
        <span className="flex-shrink-0" style={{ color: 'var(--primary-color, #16a34a)' }}>
          {icon}
        </span>
      </div>

      {/* Row 2: Label + Trend */}
      <div className="flex flex-col gap-0.5">
        <span
          className="text-[13px] whitespace-nowrap overflow-hidden text-ellipsis"
          style={{ color: 'var(--muted-foreground, #6b7280)' }}
        >
          {label}
        </span>
        {sublabel && (
          <span
            className="text-[10px] whitespace-nowrap overflow-hidden text-ellipsis"
            style={{ color: 'var(--muted-foreground, #9ca3af)' }}
          >
            {sublabel}
          </span>
        )}
        <TrendDisplay trend={trend} />
      </div>
    </div>
  )
}

export function StatsCardSkeleton() {
  return (
    <div
      className="animate-pulse"
      style={{
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid #f3f4f6',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        background: 'var(--card, #ffffff)',
        height: '110px',
      }}
    >
      <div className="flex justify-between mb-4">
        <div className="h-7 w-12 bg-gray-200 rounded" />
        <div className="h-5 w-5 bg-gray-200 rounded" />
      </div>
      <div className="h-3 w-24 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-16 bg-gray-200 rounded" />
    </div>
  )
}
