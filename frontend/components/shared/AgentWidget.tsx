'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Bot,
  Send,
  Copy,
  Check,
  Download,
  Bookmark,
  Loader2,
  Sparkles,
  FileText,
  Hash,
  CalendarDays,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Globe,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { AudioRecorder } from '@/components/shared/AudioRecorder'
import { MarkdownText } from '@/components/shared/MarkdownText'
import { agentApi, historyApi } from '@/lib/api'
import { copyToClipboard } from '@/lib/utils'
import type {
  AgentPackItem,
  AgentValidationResult,
  CampaignPack,
} from '@/types'

// ---------------------------------------------------------------------------
// 3D-style robot avatar, rendered purely with CSS. Yellow, and it keeps
// blinking (eyes) plus a soft glow pulse so it feels alive.
// ---------------------------------------------------------------------------
function AgentAvatar() {
  return (
    <div className="agent-avatar" aria-hidden>
      <span className="agent-antenna" />
      <div className="agent-head">
        <div className="agent-face">
          <span className="agent-eye agent-eye-l" />
          <span className="agent-eye agent-eye-r" />
          <span className="agent-mouth" />
        </div>
        <span className="agent-ear agent-ear-l" />
        <span className="agent-ear agent-ear-r" />
      </div>
      <div className="agent-body">
        <span className="agent-core" />
      </div>
      <span className="agent-shadow" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// The FULL agent experience, rendered inside the popup.
// ---------------------------------------------------------------------------
type Step = {
  tool: string
  status: 'running' | 'done'
  result?: Record<string, unknown>
}

const QUICK_CHIPS: { label: string; icon: React.ElementType; goal: string }[] = [
  {
    label: 'Campaign',
    icon: Sparkles,
    goal:
      'Create a full social media campaign for an Eid clothing collection for my textile brand in Karachi, with posts, hashtags, and an image.',
  },
  {
    label: 'From KB',
    icon: FileText,
    goal: 'Using my knowledge base, generate a blog article about my business.',
  },
  {
    label: 'Hashtags',
    icon: Hash,
    goal: 'Suggest hashtags for my Lahore restaurant new menu launch.',
  },
  {
    label: 'Calendar',
    icon: CalendarDays,
    goal: 'Plan a 7-day content calendar for my e-commerce store.',
  },
  {
    label: 'Quality check',
    icon: ShieldCheck,
    goal: 'Generate a social media post and run a quality check on it.',
  },
]

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function absoluteImageUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${API_ORIGIN}/${url.replace(/^\//, '')}`
}

function packToMarkdown(pack: CampaignPack): string {
  const lines: string[] = ['# Campaign Pack', '', pack.summary, '']
  for (const item of pack.items) {
    const heading = item.title || item.kind
    lines.push(`## ${heading}${item.day ? ` — ${item.day}` : ''}`)
    if (item.content_type) lines.push(`_${item.content_type}_`)
    if (item.body) lines.push('', item.body)
    if (item.hashtags?.length) lines.push('', item.hashtags.join(' '))
    if (item.image_url) lines.push('', `![image](${item.image_url})`)
    lines.push('')
  }
  if (pack.citations?.length) {
    lines.push('## Sources', '')
    for (const c of pack.citations) lines.push(`- ${c.title}${c.url ? ` (${c.url})` : ''}`)
    lines.push('')
  }
  return lines.join('\n')
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function ItemCard({
  item,
  copiedId,
  onCopy,
}: {
  item: AgentPackItem
  copiedId: string | null
  onCopy: (id: string, body: string) => void
}) {
  if (item.kind === 'hashtags') {
    return (
      <Card className="h-full">
        <CardContent className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hashtags</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.hashtags.map((tag) => (
              <span key={tag} className="rounded-full bg-pk-green-50 px-3 py-1 text-xs font-medium text-pk-green-700">
                {tag}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (item.kind === 'image') {
    const src = absoluteImageUrl(item.image_url)
    return (
      <Card className="h-full">
        <CardContent className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Image</p>
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={item.title || 'Generated image'} className="mt-3 w-full rounded-xl border border-gray-100 object-cover" />
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No image available</p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div className="min-w-0">
          <CardTitle className="truncate text-base">{item.title || item.kind}</CardTitle>
          {item.day && <p className="mt-1 text-xs font-medium text-pk-green-600">{item.day}</p>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => onCopy(item.content_id || item.title, item.body)}
          aria-label="Copy content"
        >
          {copiedId === (item.content_id || item.title) ? (
            <Check size={15} className="text-green-600" />
          ) : (
            <Copy size={15} />
          )}
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {item.content_type && (
          <p className="mb-2 text-xs capitalize text-muted-foreground">{item.content_type.replace(/_/g, ' ')}</p>
        )}
        <MarkdownText text={item.body} className="text-sm leading-relaxed text-gray-700" />
      </CardContent>
    </Card>
  )
}

function AgentContent({ onClose }: { onClose: () => void }) {
  const [goal, setGoal] = useState('')
  const [useKb, setUseKb] = useState(true)
  const [useWeb, setUseWeb] = useState(true)
  const [running, setRunning] = useState(false)
  const [plan, setPlan] = useState<{ goals: string[]; constraints: string[]; use_knowledge_base: boolean } | null>(null)
  const [steps, setSteps] = useState<Step[]>([])
  const [loops, setLoops] = useState<{ iteration: number; reason: string }[]>([])
  const [validation, setValidation] = useState<AgentValidationResult | null>(null)
  const [pack, setPack] = useState<CampaignPack | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [steps, loops, validation, pack])

  const handleSend = async () => {
    const g = goal.trim()
    if (!g || running) return
    setRunning(true)
    setError(null)
    setPlan(null)
    setSteps([])
    setLoops([])
    setValidation(null)
    setPack(null)
    setSavedIds(new Set())
    try {
      await agentApi.chat(g, useKb, useWeb, (event) => {
        switch (event.type) {
          case 'plan':
            setPlan(event.plan)
            break
          case 'tool_start':
            setSteps((prev) => [...prev, { tool: event.tool, status: 'running' }])
            break
          case 'tool_end':
            setSteps((prev) => {
              const copy = [...prev]
              for (let i = copy.length - 1; i >= 0; i--) {
                if (copy[i].tool === event.tool && copy[i].status === 'running') {
                  copy[i] = { tool: event.tool, status: 'done', result: event.result }
                  break
                }
              }
              return copy
            })
            break
          case 'loop':
            setLoops((prev) => [...prev, { iteration: event.iteration, reason: event.reason }])
            break
          case 'validation':
            setValidation(event.result)
            break
          case 'final_pack':
            setPack(event.pack)
            setValidation(event.pack.validation)
            break
          case 'error':
            setError(event.message)
            break
        }
      })
    } catch (e: any) {
      setError(e?.message || 'Agent request failed')
    } finally {
      setRunning(false)
    }
  }

  const handleCopy = async (id: string, body: string) => {
    if (!body) return
    await copyToClipboard(body)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSaveAll = async () => {
    if (!pack || saving) return
    const ids = pack.items.map((i) => i.content_id).filter(Boolean)
    if (ids.length === 0) return
    setSaving(true)
    for (const id of ids) {
      try {
        await historyApi.save(id)
        setSavedIds((prev) => new Set(prev).add(id))
      } catch {
        // skip items that fail to save
      }
    }
    setSaving(false)
  }

  const saveableCount = pack ? pack.items.filter((i) => i.content_id).length : 0

  return (
    <div className="agent-panel">
      <div className="agent-panel__header">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pk-green-50 ring-1 ring-pk-green-100">
            <Bot size={20} className="text-pk-green-600" />
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900">PakVoice</p>
            <p className="text-[11px] text-gray-400">Plan, write & quality-check a campaign</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          aria-label="Close agent"
        >
          <X size={16} />
        </button>
      </div>

      <div className="agent-panel__body">
        {/* Quick chips */}
        <div className="mb-4 flex flex-wrap gap-2">
          {QUICK_CHIPS.map((chip) => {
            const Icon = chip.icon
            return (
              <button
                key={chip.label}
                type="button"
                disabled={running}
                onClick={() => setGoal(chip.goal)}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-pk-green-300 hover:text-pk-green-700 disabled:opacity-50"
              >
                <Icon size={14} />
                {chip.label}
              </button>
            )
          })}
        </div>

        {/* Input */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <Textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Create a Ramadan social media campaign for my Karachi restaurant..."
              rows={3}
              disabled={running}
              className="min-h-[80px]"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={useKb}
                    onChange={(e) => setUseKb(e.target.checked)}
                    disabled={running}
                    className="h-4 w-4 rounded border-gray-300 text-pk-green-600 focus:ring-pk-green-500"
                  />
                  Use knowledge base
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={useWeb}
                    onChange={(e) => setUseWeb(e.target.checked)}
                    disabled={running}
                    className="h-4 w-4 rounded border-gray-300 text-pk-green-600 focus:ring-pk-green-500"
                  />
                  Live search
                </label>
                <AudioRecorder
                  onTranscript={(text) => setGoal((prev) => (prev ? prev + ' ' + text : text))}
                  disabled={running}
                />
              </div>
              <Button onClick={handleSend} disabled={running || !goal.trim()} className="gap-2">
                {running ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                {running ? 'Working...' : 'Send'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error banner */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50/50">
            <CardContent className="flex items-start gap-3 p-4">
              <ShieldAlert size={18} className="mt-0.5 shrink-0 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Plan */}
        {plan && !pack && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {plan.goals.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Goals</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-700">
                    {plan.goals.map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                </div>
              )}
              {plan.constraints.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Constraints</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-700">
                    {plan.constraints.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Live step timeline */}
        {steps.length > 0 && !pack && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Working</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm">
                  {step.status === 'running' ? (
                    <Loader2 size={15} className="animate-spin text-pk-green-600" />
                  ) : (
                    <Check size={15} className="text-green-600" />
                  )}
                  <span className="capitalize text-gray-700">{step.tool.replace(/_/g, ' ')}</span>
                </div>
              ))}
              {loops.map((loop) => (
                <div key={`loop-${loop.iteration}`} className="flex items-center gap-2.5 text-sm">
                  <RefreshCw size={15} className="text-amber-500" />
                  <span className="text-gray-700">
                    Refinement loop {loop.iteration} — <span className="text-gray-500">{loop.reason}</span>
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Validation */}
        {validation && (
          <Card className={`mb-6 ${validation.passed ? 'border-pk-green-200' : 'border-amber-200'}`}>
            <CardContent className="flex items-start gap-3 p-4">
              {validation.passed ? (
                <ShieldCheck size={18} className="mt-0.5 shrink-0 text-pk-green-600" />
              ) : (
                <ShieldAlert size={18} className="mt-0.5 shrink-0 text-amber-500" />
              )}
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${validation.passed ? 'text-pk-green-700' : 'text-amber-700'}`}>
                  {validation.passed ? 'Validation passed' : 'Validation needs attention'}
                </p>
                <ul className="mt-1.5 space-y-1">
                  {validation.checks.map((check, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                      {check.passed ? (
                        <Check size={13} className="mt-0.5 shrink-0 text-green-600" />
                      ) : (
                        <ShieldAlert size={13} className="mt-0.5 shrink-0 text-amber-500" />
                      )}
                      <span>{check.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Final pack */}
        {pack && (
          <div className="space-y-6">
            <Card className="border-pk-green-100">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <CardTitle className="text-base">Campaign pack</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => downloadFile('campaign.md', packToMarkdown(pack), 'text/markdown')}>
                    <Download size={14} className="mr-1.5" /> Markdown
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadFile('campaign.json', JSON.stringify(pack, null, 2), 'application/json')}
                  >
                    <Download size={14} className="mr-1.5" /> JSON
                  </Button>
                  {saveableCount > 0 && (
                    <Button variant="pk-green" size="sm" onClick={handleSaveAll} disabled={saving}>
                      {saving ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Bookmark size={14} className="mr-1.5" />}
                      Save all ({saveableCount})
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm leading-relaxed text-gray-700">{pack.summary}</p>
              </CardContent>
            </Card>

            {pack.items.length > 0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {pack.items.map((item, i) => (
                  <ItemCard key={i} item={item} copiedId={copiedId} onCopy={handleCopy} />
                ))}
              </div>
            )}

            {pack.citations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {pack.citations.map((c, i) => (
                    <div key={i} className="rounded-lg border border-gray-100 bg-gray-50/60 p-3">
                      <div className="flex items-center gap-2">
                        {c.source === 'web' ? (
                          <Globe size={13} className="shrink-0 text-blue-500" />
                        ) : (
                          <FileText size={13} className="shrink-0 text-pk-green-600" />
                        )}
                        {c.url ? (
                          <a
                            href={c.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-gray-800 hover:text-pk-green-700 hover:underline"
                          >
                            {c.title}
                          </a>
                        ) : (
                          <p className="text-sm font-medium text-gray-800">{c.title}</p>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500 line-clamp-2">{c.chunk_text}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {savedIds.size > 0 && (
              <p className="text-xs text-pk-green-700">
                <Check size={13} className="mr-1 inline" />
                {savedIds.size} item{savedIds.size === 1 ? '' : 's'} saved to history
              </p>
            )}
          </div>
        )}

        <div ref={endRef} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Floating, draggable launcher. Click toggles the popup; drag repositions it.
// ---------------------------------------------------------------------------
export function AgentWidget() {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  const dragging = useRef(false)
  const offset = useRef({ x: 0, y: 0 })
  const moved = useRef(false)

  const defaultPos = useCallback(() => {
    if (typeof window === 'undefined') return { x: 24, y: 24 }
    return { x: window.innerWidth - 88, y: window.innerHeight - 140 }
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    const el = e.currentTarget.getBoundingClientRect()
    setPos((p) => p ?? { x: el.left, y: el.top })
    dragging.current = true
    moved.current = false
    offset.current = {
      x: e.clientX - el.left,
      y: e.clientY - el.top,
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - offset.current.x
    const dy = e.clientY - offset.current.y
    if (Math.abs(dx) + Math.abs(dy) > 4) moved.current = true
    const w = typeof window !== 'undefined' ? window.innerWidth : 0
    const h = typeof window !== 'undefined' ? window.innerHeight : 0
    setPos({
      x: Math.max(8, Math.min(dx, w - 92)),
      y: Math.max(8, Math.min(dy, h - 92)),
    })
  }

  const onPointerUp = () => {
    dragging.current = false
    if (!moved.current) setOpen((o) => !o)
  }

  // Persist position so it doesn't jump on re-render.
  useEffect(() => {
    if (pos === null) setPos(defaultPos())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const style: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y }
    : { right: 24, bottom: 24 }

  return (
    <>
      <button
        type="button"
        className="agent-fab"
        style={style}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        aria-label="Open PakVoice Agent"
        title="PakVoice Agent (drag to move)"
      >
        <AgentAvatar />
      </button>

      {open && (
        <div className="agent-overlay" onClick={() => setOpen(false)}>
          <div className="agent-popup-wrap" onClick={(e) => e.stopPropagation()}>
            <AgentContent onClose={() => setOpen(false)} />
          </div>
        </div>
      )}

      <style jsx global>{`
        /* FAB */
        .agent-fab {
          position: fixed;
          z-index: 50;
          width: 80px;
          height: 80px;
          border-radius: 9999px;
          border: none;
          cursor: grab;
          touch-action: none;
          background: transparent;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: agent-glow 2.2s ease-in-out infinite;
          transition: transform 0.15s ease;
        }
        .agent-fab:active { cursor: grabbing; transform: scale(0.96); }
        .agent-fab:hover { transform: scale(1.05); }

        @keyframes agent-glow {
          0%, 100% { filter: drop-shadow(0 10px 18px rgba(250, 204, 21, 0.4)); }
          50% { filter: drop-shadow(0 10px 30px rgba(250, 204, 21, 0.7)); }
        }

        /* Avatar (yellow 3D-ish robot) */
        .agent-avatar {
          position: relative;
          width: 64px;
          height: 64px;
          transform: scale(1.22);
          transform-origin: center;
        }
        .agent-shadow {
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: 2px;
          height: 10px;
          border-radius: 50%;
          background: radial-gradient(closest-side, rgba(0,0,0,0.25), transparent);
        }
        .agent-head {
          position: absolute;
          top: 8px;
          left: 50%;
          transform: translateX(-50%);
          width: 40px;
          height: 34px;
          border-radius: 12px;
          background: linear-gradient(160deg, #fef08a 0%, #facc15 55%, #eab308 100%);
          box-shadow:
            inset 0 2px 3px rgba(255,255,255,0.55),
            inset 0 -4px 6px rgba(0,0,0,0.15),
            0 2px 4px rgba(0,0,0,0.15);
        }
        .agent-antenna {
          position: absolute;
          top: 2px;
          left: 50%;
          transform: translateX(-50%);
          width: 3px;
          height: 8px;
          border-radius: 2px;
          background: #a16207;
        }
        .agent-antenna::after {
          content: '';
          position: absolute;
          top: -4px;
          left: 50%;
          transform: translateX(-50%);
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 30%, #fef9c3, #f59e0b);
          box-shadow: 0 0 6px rgba(250, 204, 21, 0.95);
          animation: agent-beacon 1.4s ease-in-out infinite;
        }
        @keyframes agent-beacon {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px rgba(250, 204, 21, 0.95); }
          50% { opacity: 0.6; box-shadow: 0 0 14px rgba(250, 204, 21, 1); }
        }
        .agent-face {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }
        .agent-eye {
          width: 7px;
          height: 9px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 0 0 1px rgba(0,0,0,0.08);
          position: relative;
          animation: agent-blink 3.4s infinite;
        }
        .agent-eye::after {
          content: '';
          position: absolute;
          left: 2px;
          top: 2px;
          width: 3px;
          height: 4px;
          border-radius: 50%;
          background: #713f12;
        }
        @keyframes agent-blink {
          0%, 91%, 100% { transform: scaleY(1); }
          94% { transform: scaleY(0.08); }
          97% { transform: scaleY(1); }
        }
        .agent-mouth {
          position: absolute;
          bottom: 6px;
          left: 50%;
          transform: translateX(-50%);
          width: 10px;
          height: 4px;
          border-radius: 0 0 8px 8px;
          background: #fefce8;
          box-shadow: 0 0 0 1px rgba(0,0,0,0.08);
        }
        .agent-ear {
          position: absolute;
          top: 50%;
          width: 8px;
          height: 12px;
          border-radius: 4px;
          background: linear-gradient(160deg, #fbbf24, #d97706);
        }
        .agent-ear-l { left: -6px; transform: translateY(-50%); }
        .agent-ear-r { right: -6px; transform: translateY(-50%); }
        .agent-body {
          position: absolute;
          bottom: 2px;
          left: 50%;
          transform: translateX(-50%);
          width: 30px;
          height: 18px;
          border-radius: 9px;
          background: linear-gradient(160deg, #fef08a 0%, #facc15 100%);
          box-shadow: inset 0 2px 3px rgba(255,255,255,0.5), 0 2px 4px rgba(0,0,0,0.15);
        }
        .agent-core {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 30%, #fef9c3, #b45309);
          animation: agent-pulse 1.6s ease-in-out infinite;
        }
        @keyframes agent-pulse {
          0%, 100% { opacity: 0.7; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.3); }
        }

        /* Overlay + popup */
        .agent-overlay {
          position: fixed;
          inset: 0;
          z-index: 60;
          background: rgba(17, 24, 39, 0.45);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: agent-fade 0.15s ease;
        }
        @keyframes agent-fade { from { opacity: 0; } to { opacity: 1; } }

        .agent-popup-wrap {
          width: 100%;
          max-width: 860px;
          animation: agent-pop 0.18s ease;
        }
        @keyframes agent-pop {
          from { transform: translateY(14px) scale(0.98); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }

        .agent-panel {
          display: flex;
          flex-direction: column;
          max-height: min(88vh, 820px);
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          box-shadow: 0 24px 60px rgba(17, 24, 39, 0.25);
          overflow: hidden;
        }
        .agent-panel__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid #f3f4f6;
          background: #fafafa;
        }
        .agent-panel__body {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        @media (max-width: 640px) {
          .agent-overlay { padding: 8px; }
          .agent-popup-wrap { max-width: 100%; }
        }
      `}</style>
    </>
  )
}
