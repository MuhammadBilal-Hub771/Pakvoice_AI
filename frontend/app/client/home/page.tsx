'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, CalendarDays, Bookmark, FileText, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ContentTypeIcon } from '@/components/illustrations/logos'
import { PageShell } from '@/components/shared/PageHeader'
import { useAuthStore } from '@/stores/authStore'
import { useGenerateStore } from '@/stores/generateStore'
import { formatDate, copyToClipboard } from '@/lib/utils'
import { StatsCard, StatsCardSkeleton } from '@/components/shared/StatsCard'
import { useClientStats } from '@/hooks/useClientStats'

const contentTypes = [
  { id: 'social', name: 'Social Media Post', urdu: 'سوشل میڈیا پوسٹ', type: 'Social Media Post' },
  { id: 'blog', name: 'Blog Article', urdu: 'بلاگ آرٹیکل', type: 'Blog Article' },
  { id: 'product', name: 'Product Description', urdu: 'پروڈکٹ کی تفصیل', type: 'Product Description' },
  { id: 'email', name: 'Email Marketing', urdu: 'ای میل مارکیٹنگ', type: 'Email Marketing' },
  { id: 'press', name: 'Press Release', urdu: 'پریس ریلیز', type: 'Press Release' },
  { id: 'website', name: 'Website Content', urdu: 'ویب سائٹ کا مواد', type: 'Website Content' },
  { id: 'ad', name: 'Advertisement Copy', urdu: 'اشتہار', type: 'Advertisement Copy' },
]

const ContentTypesGrid = React.memo(function ContentTypesGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {contentTypes.map((ct) => (
        <Link key={ct.id} href={`/client/generate?type=${ct.type}`}>
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-pk-green-200 hover:shadow-md">
            <ContentTypeIcon type={ct.type} size={28} />
            <span className="text-xs font-medium text-center leading-tight">{ct.name}</span>
            <span className="text-[10px] text-muted-foreground font-urdu">{ct.urdu}</span>
          </div>
        </Link>
      ))}
    </div>
  )
})

function ClientHomePage() {
  const router = useRouter()
  const userName = useAuthStore((s) => s.user?.name?.split(' ')[0])
  const history = useGenerateStore((s) => s.history)
  const { data: stats, isLoading } = useClientStats()
  const [activeCard, setActiveCard] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopy = async (id: string, content: string) => {
    await copyToClipboard(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Show max 5 most recent, sorted newest first
  const recentGenerations = useMemo(() => {
    return [...history]
      .sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt || a.timestamp || 0).getTime()
        const dateB = new Date(b.createdAt || b.timestamp || 0).getTime()
        return dateB - dateA
      })
      .slice(0, 5)
  }, [history])

  return (
    <PageShell>
      <div className="relative mb-8 overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-pk-green-800 to-pk-green-900 px-7 py-10 md:px-12 md:py-14">
        <div aria-hidden className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-pk-green-600/20 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-pk-green-300">Dashboard</p>
          <h1 className="mt-3 max-w-xl text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl">
            Assalam o Alaikum, {userName || 'there'}
          </h1>
          <p className="mt-3 max-w-lg text-[15px] text-white/70">
            Generate a post, image or voice-first brief in seconds — in Urdu, English or Roman Urdu.
          </p>
          <Link href="/client/generate" className="mt-7 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-pk-green-800 shadow-sm transition-transform hover:-translate-y-0.5">
            Generate Content
            <ArrowRight size={17} />
          </Link>
        </div>
      </div>

      {/* Quick Stats — 4 equal height cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full mb-8">
        {isLoading ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <StatsCard
              value={stats?.total_generated ?? 0}
              label="Total Generated"
              icon={<FileText size={18} />}
              trend={stats?.total_generated_trend}
              isActive={activeCard === 'total'}
              onClick={() => {
                setActiveCard('total')
                router.push('/client/history')
              }}
            />
            <StatsCard
              value={stats?.this_month ?? 0}
              label="This Month"
              icon={<CalendarDays size={18} />}
              trend={stats?.this_month_trend}
              isActive={activeCard === 'month'}
              onClick={() => {
                setActiveCard('month')
                router.push('/client/history')
              }}
            />
            <StatsCard
              value={stats?.saved_content ?? 0}
              label="Saved Content"
              icon={<Bookmark size={18} />}
              trend={stats?.saved_content_trend}
              isActive={activeCard === 'saved'}
              onClick={() => {
                setActiveCard('saved')
                router.push('/client/history?filter=saved')
              }}
            />
            <StatsCard
              value={stats?.knowledge_docs ?? 0}
              label="Knowledge Docs"
              icon={<FileText size={18} />}
              trend={stats?.knowledge_docs_trend}
              isActive={activeCard === 'docs'}
              onClick={() => {
                setActiveCard('docs')
                router.push('/client/knowledge-base')
              }}
            />
          </>
        )}
      </div>

      {/* Content Type Quick Launch */}
      <div className="mb-8">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Quick Launch</h2>
        <ContentTypesGrid />
      </div>

      {/* Recent Generations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Generations</h2>
          <Link href="/client/history" className="text-sm text-pk-green-600 hover:underline flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {history.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <Sparkles className="mx-auto mb-3 h-10 w-10 text-pk-green-300" />
              <p className="font-medium text-gray-800">No content generated yet.</p>
              <p className="mt-1 text-sm text-gray-500">Click Generate Content to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentGenerations.map((item: any) => (
              <Card key={item.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <ContentTypeIcon type={item.contentType} size={24} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{item.contentType}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
                      {item.saved && (
                        <>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="flex items-center gap-1 text-xs text-pk-green-600 font-medium">
                            <Bookmark size={11} fill="currentColor" />
                            Saved
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={(e) => {
                      e.preventDefault()
                      handleCopy(item.id, item.content)
                    }}
                  >
                    {copiedId === item.id ? 'Copied!' : 'Copy'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}

export default React.memo(ClientHomePage)
