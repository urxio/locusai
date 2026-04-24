'use client'

import React from 'react'

type Props = {
  text: string
  onRegenerate?: () => void
  updating?: boolean
}

/* ── Tiny inline markdown renderer ─────────────────────────────────────────
   Handles: **bold**, *italic*, paragraphs (blank line), plain text + emojis.
   No dependency needed — avoids ESM issues with react-markdown v9+.
─────────────────────────────────────────────────────────────────────────── */

function renderInline(raw: string, key: string): React.ReactNode {
  // Split on **bold**, *italic*, __underline__, and <<highlight>> tokens
  const parts = raw.split(/(\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|<<.+?>>)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${key}-b${i}`} style={{ fontWeight: 600, color: 'var(--text-0)' }}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={`${key}-i${i}`} style={{ fontStyle: 'italic', color: 'var(--text-3)', fontWeight: 300 }}>{part.slice(1, -1)}</em>
    }
    if (part.startsWith('__') && part.endsWith('__')) {
      return <span key={`${key}-u${i}`} style={{ textDecoration: 'underline', textUnderlineOffset: '3px', textDecorationColor: 'rgba(242,235,224,0.35)' }}>{part.slice(2, -2)}</span>
    }
    if (part.startsWith('<<') && part.endsWith('>>')) {
      return (
        <mark key={`${key}-h${i}`} style={{
          background:   'rgba(212,168,83,0.18)',
          color:        'var(--gold)',
          borderRadius: '3px',
          padding:      '1px 4px',
          fontStyle:    'normal',
        }}>
          {part.slice(2, -2)}
        </mark>
      )
    }
    return part
  })
}

function MarkdownInsight({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map(p => p.replace(/\n/g, ' ').trim())
    .filter(Boolean)

  return (
    <div>
      {paragraphs.map((para, i) => (
        <p key={i} style={{
          fontFamily:    'var(--font-serif)',
          fontSize:      '17px',
          fontWeight:    300,
          color:         'var(--ai-card-text)',
          lineHeight:    1.7,
          letterSpacing: '0.01em',
          margin:        i < paragraphs.length - 1 ? '0 0 16px' : '0',
        }}>
          {renderInline(para, String(i))}
        </p>
      ))}
    </div>
  )
}

export default function AIInsightCard({ text, onRegenerate, updating }: Props) {
  return (
    <div style={{
      background:          'var(--glass-card-bg)',
      backdropFilter:      'blur(32px) saturate(180%)',
      WebkitBackdropFilter:'blur(32px) saturate(180%)',
      border:              '1px solid var(--glass-card-border)',
      boxShadow:           'var(--glass-card-shadow)',
      borderRadius:        'var(--radius-xl)',
      padding:             '26px 28px',
      position:            'relative',
      overflow:            'hidden',
      marginBottom:  '20px',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: '-40px', right: '-40px',
        width: '200px', height: '200px',
        background: 'radial-gradient(circle, rgba(212,168,83,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'var(--gold-dim)', border: '1px solid rgba(212,168,83,0.2)',
          borderRadius: '20px', padding: '3px 10px 3px 7px',
          fontSize: '10.5px', color: 'var(--gold)', fontWeight: 600,
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--gold)', animation: 'pulse 2s ease-in-out infinite' }} />
          Locus AI · Daily Insight
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {updating && (
            <span style={{ fontSize: '11px', color: 'var(--text-3)', fontStyle: 'italic' }}>Refining brief…</span>
          )}
          {onRegenerate && !updating && (
            <button
              onClick={onRegenerate}
              style={{
                background: 'none', border: '1px solid var(--border-md)',
                borderRadius: '6px', color: 'var(--text-2)',
                fontSize: '11px', padding: '3px 9px',
                cursor: 'pointer', letterSpacing: '0.03em', flexShrink: 0,
              }}
            >
              Regenerate
            </button>
          )}
        </div>
      </div>

      {/* Rendered insight */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <MarkdownInsight text={text} />
      </div>

      <div style={{ marginTop: '18px', fontSize: '12px', color: 'var(--text-3)', position: 'relative', zIndex: 1 }}>
        Based on your check-ins and goal data · Updated today
      </div>
    </div>
  )
}
