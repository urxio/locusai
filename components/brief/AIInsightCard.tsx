'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

type Props = {
  text: string
  onRegenerate?: () => void
  updating?: boolean
}

const mdComponents: Components = {
  // Paragraphs
  p: ({ children }) => (
    <p style={{
      fontFamily:    'var(--font-serif)',
      fontSize:      '17px',
      fontWeight:    300,
      color:         'var(--ai-card-text)',
      lineHeight:    1.7,
      letterSpacing: '0.01em',
      margin:        '0 0 14px',
    }}>
      {children}
    </p>
  ),
  // Bold
  strong: ({ children }) => (
    <strong style={{ fontWeight: 600, color: 'var(--text-0)' }}>
      {children}
    </strong>
  ),
  // Italics
  em: ({ children }) => (
    <em style={{ fontStyle: 'italic', color: 'var(--text-2)', fontWeight: 300 }}>
      {children}
    </em>
  ),
  // No headers — fallback to bold paragraph text if AI hallucinates one
  h1: ({ children }) => (
    <p style={{ fontFamily: 'var(--font-serif)', fontSize: '17px', fontWeight: 600, color: 'var(--text-0)', lineHeight: 1.6, margin: '0 0 12px' }}>
      {children}
    </p>
  ),
  h2: ({ children }) => (
    <p style={{ fontFamily: 'var(--font-serif)', fontSize: '17px', fontWeight: 600, color: 'var(--text-0)', lineHeight: 1.6, margin: '0 0 12px' }}>
      {children}
    </p>
  ),
  h3: ({ children }) => (
    <p style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', fontWeight: 600, color: 'var(--text-0)', lineHeight: 1.6, margin: '0 0 12px' }}>
      {children}
    </p>
  ),
  // Strip any links (nothing useful to link to in a personal brief)
  a: ({ children }) => <span>{children}</span>,
  // No bullet lists — strip wrapper, keep text
  ul: ({ children }) => <div style={{ margin: '0 0 12px' }}>{children}</div>,
  ol: ({ children }) => <div style={{ margin: '0 0 12px' }}>{children}</div>,
  li: ({ children }) => (
    <p style={{ fontFamily: 'var(--font-serif)', fontSize: '17px', fontWeight: 300, color: 'var(--ai-card-text)', lineHeight: 1.7, margin: '0 0 6px' }}>
      {children}
    </p>
  ),
}

export default function AIInsightCard({ text, onRegenerate, updating }: Props) {
  return (
    <div style={{
      background:    'var(--ai-card-bg)',
      border:        '1px solid var(--border-md)',
      borderRadius:  'var(--radius-xl)',
      padding:       '26px 28px',
      position:      'relative',
      overflow:      'hidden',
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

      {/* Markdown insight */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={mdComponents}
        >
          {text}
        </ReactMarkdown>
      </div>

      <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-3)', position: 'relative', zIndex: 1 }}>
        Based on your check-ins and goal data · Updated today
      </div>
    </div>
  )
}
