'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, TrendingUp, CalendarDays, Bookmark, FileText, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { HeroIllustration } from '@/components/illustrations/illustrations'
import { ContentTypeIcon } from '@/components/illustrations/logos'
import { useAuthStore } from '@/stores/authStore'
import { useGenerateStore } from '@/stores/generateStore'
import { formatDate } from '@/lib/utils'
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
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:border-pk-green-500 hover:shadow-md hover:shadow-pk-green-500/10 transition-all cursor-pointer group hover:-translate-y-1">
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
    <div className="px-4 md:px-6 lg:px-8 py-6 pb-20 md:pb-6 max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="animate-fade-up relative overflow-hidden rounded-2xl bg-gradient-to-br from-pk-green-900 to-pk-green-700 p-8 md:p-12 mb-8">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-white mb-3">
              Assalam o Alaikum, {userName || 'User'}! 👋
            </h1>
            <p className="text-lg text-pk-green-100 mb-6">
              What content do you want to create today?
            </p>
            <Link href="/client/generate">
              <Button className="bg-pk-gold hover:bg-pk-gold/90 text-white h-12 px-8 text-base gap-2 group">
                Generate Content
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
          <div className="flex-shrink-0 w-64 md:w-80">
            <HeroIllustration />
          </div>
        </div>
      </div>

      {/* Quick Stats — 4 equal height cards with inline styles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          width: '100%',
          marginBottom: '32px',
        }}
        className="max-sm:grid-cols-1 max-md:grid-cols-2"
      >
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
        <h2 className="text-xl font-heading font-semibold mb-4">Quick Launch</h2>
        <ContentTypesGrid />
      </div>

      {/* Recent Generations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-heading font-semibold">Recent Generations</h2>
          <Link href="/client/history" className="text-sm text-pk-green-600 hover:underline flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {history.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Sparkles className="mx-auto h-12 w-12 text-muted-foreground opacity-30 mb-3" />
              <p className="text-muted-foreground">No content generated yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Click &quot;Generate Content&quot; to get started!</p>
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
                  <Button variant="ghost" size="sm" className="text-xs">Copy</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default React.memo(ClientHomePage)
