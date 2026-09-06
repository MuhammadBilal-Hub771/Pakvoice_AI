import React from 'react'

/**
 * A tiny, dependency-free Markdown renderer for generated content.
 *
 * Supports the subset the AI is asked to produce:
 *   - "## text" / "### text" / "# text"  -> headings
 *   - "**text**"                          -> <strong>
 *   - "*text*"                            -> <em>
 *   - "`text`"                            -> <code>
 *   - "- item" / "* item"                 -> unordered list
 *   - "1. item" / "1) item"               -> ordered list
 *   - consecutive lines inside a paragraph -> <br> line breaks
 * It strips stray "---" dividers and never leaks raw markdown symbols.
 */

const HEADING_RE = /^#{1,6}\s/
const DIVIDER_RE = /^(-{3,}|\*{3,}|_{3,})\s*$/
const BULLET_RE = /^[-*+]\s+/
const NUMBERED_RE = /^\d+[.)]\s+/
const INLINE_RE = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g

export function MarkdownText({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  const lines = (text ?? '').replace(/\r\n?/g, '\n').split('\n')
  const blocks: React.ReactNode[] = []
  let key = 0

  const renderInline = (source: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = []
    INLINE_RE.lastIndex = 0
    let lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = INLINE_RE.exec(source)) !== null) {
      if (match.index > lastIndex) nodes.push(source.slice(lastIndex, match.index))
      const token = match[0]
      if (token.startsWith('**') && token.endsWith('**')) {
        nodes.push(<strong key={key++}>{token.slice(2, -2)}</strong>)
      } else if (token.startsWith('`') && token.endsWith('`')) {
        nodes.push(
          <code key={key++} className="rounded bg-muted px-1 py-0.5 text-[0.9em]">
            {token.slice(1, -1)}
          </code>
        )
      } else {
        nodes.push(<em key={key++}>{token.slice(1, -1)}</em>)
      }
      lastIndex = INLINE_RE.lastIndex
    }
    if (lastIndex < source.length) nodes.push(source.slice(lastIndex))
    return nodes
  }

  let para: React.ReactNode[] = []
  const flushParagraph = () => {
    if (para.length === 0) return
    const content: React.ReactNode[] = []
    para.forEach((node, i) => {
      if (i > 0) content.push(<br key={key++} />)
      content.push(node)
    })
    blocks.push(
      <p key={key++} className="my-1.5 leading-relaxed">
        {content}
      </p>
    )
    para = []
  }

  let listItems: React.ReactNode[] = []
  let listType: 'ul' | 'ol' | null = null
  const flushList = () => {
    if (listType && listItems.length) {
      const Tag = listType === 'ol' ? 'ol' : 'ul'
      blocks.push(
        <Tag
          key={key++}
          className={`my-1.5 space-y-1 pl-5 ${listType === 'ol' ? 'list-decimal' : 'list-disc'}`}
        >
          {listItems}
        </Tag>
      )
    }
    listItems = []
    listType = null
  }

  for (const raw of lines) {
    const trimmed = raw.trim()

    if (DIVIDER_RE.test(trimmed)) {
      flushParagraph()
      flushList()
      continue
    }
    if (trimmed === '') {
      flushParagraph()
      flushList()
      continue
    }
    if (HEADING_RE.test(trimmed)) {
      flushParagraph()
      flushList()
      const level = trimmed.match(/^#+/)?.[0].length ?? 2
      const heading = trimmed.replace(/^#{1,6}\s+/, '')
      let Tag: 'h2' | 'h3' | 'h4' = 'h3'
      let cls = 'mt-3 mb-1 text-lg font-bold'
      if (level === 1) {
        Tag = 'h2'
        cls = 'mt-3 mb-1 text-xl font-bold'
      } else if (level >= 3) {
        Tag = 'h4'
        cls = 'mt-3 mb-1 text-base font-semibold'
      }
      blocks.push(
        <Tag key={key++} className={cls}>
          {renderInline(heading)}
        </Tag>
      )
      continue
    }
    if (BULLET_RE.test(trimmed)) {
      flushParagraph()
      if (listType !== 'ul') {
        flushList()
        listType = 'ul'
      }
      listItems.push(<li key={key++}>{renderInline(trimmed.replace(BULLET_RE, ''))}</li>)
      continue
    }
    if (NUMBERED_RE.test(trimmed)) {
      flushParagraph()
      if (listType !== 'ol') {
        flushList()
        listType = 'ol'
      }
      listItems.push(<li key={key++}>{renderInline(trimmed.replace(NUMBERED_RE, ''))}</li>)
      continue
    }

    flushList()
    para.push(...renderInline(trimmed))
  }

  flushParagraph()
  flushList()

  return <div className={className}>{blocks}</div>
}
