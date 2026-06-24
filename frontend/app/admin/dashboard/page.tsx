'use client'

import React from 'react'
import {
  Users,
  FileText,
  Activity,
  Zap,
  BookOpen,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { StatsCard, StatsCardSkeleton } from '@/components/shared/StatsCard'
import { useAdminDashboardStats } from '@/hooks/useAdminDashboardStats'

export default function AdminDashboard() {
  const { data: stats, isLoading } = useAdminDashboardStats()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of your Pakvoice platform</p>
        </div>
      </div>

      {/* Metric Cards — 5 equal height cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '16px',
          width: '100%',
        }}
        className="max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1"
      >
        {isLoading ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <StatsCard
              value={stats?.total_users ?? 0}
              label="Total Users"
              icon={<Users size={18} />}
              trend={stats?.total_users_trend}
            />
            <StatsCard
              value={stats?.content_today ?? 0}
              label="Content Today"
              icon={<FileText size={18} />}
              trend={stats?.content_today_trend}
            />
            <StatsCard
              value={stats?.api_calls ?? 0}
              label="API Calls"
              icon={<Zap size={18} />}
              sublabel={`of ${stats?.api_limit ?? 50000} limit`}
              trend={stats?.api_calls_trend}
            />
            <StatsCard
              value={stats?.active_sessions ?? 0}
              label="Active Sessions"
              icon={<Activity size={18} />}
              trend={stats?.active_sessions_trend}
            />
            <StatsCard
              value={stats?.documents_in_kb ?? 0}
              label="Documents in KB"
              icon={<BookOpen size={18} />}
              trend={stats?.documents_in_kb_trend}
            />
          </>
        )}
      </div>

      {/* Quick Actions + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Link href="/admin/users">
              <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                <Users size={16} /> Manage Users
              </Button>
            </Link>
            <Link href="/admin/content">
              <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                <FileText size={16} /> Review Content
              </Button>
            </Link>
            <Link href="/admin/analytics">
              <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                <Activity size={16} /> View Analytics
              </Button>
            </Link>
            <Link href="/admin/knowledge-base">
              <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                <BookOpen size={16} /> Knowledge Base
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
            <Link href="/admin/analytics" className="text-xs text-pk-green-600 hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mx-auto mb-3">
                <circle cx="40" cy="40" r="38" stroke="currentColor" strokeWidth="2" className="text-gray-200" />
                <path d="M40 20v20l12 8" stroke="currentColor" strokeWidth="2" className="text-gray-300" />
              </svg>
              <p className="text-sm text-muted-foreground">No activity yet</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
