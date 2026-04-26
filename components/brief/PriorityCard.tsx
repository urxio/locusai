'use client'

export const CATEGORY_COLORS: Record<string, { tag: string; border: string }> = {
  work:     { tag: 'rgba(122,158,138,0.12)', border: 'var(--sage)' },
  product:  { tag: 'rgba(122,158,138,0.12)', border: 'var(--sage)' },
  health:   { tag: 'rgba(180,130,100,0.12)', border: '#c89060' },
  personal: { tag: 'rgba(212,168,83,0.1)',   border: 'var(--gold)' },
  learning: { tag: 'rgba(100,130,180,0.12)', border: '#6090c8' },
}

type Props = {
  num: number
  title: string
  category: string
  time: string
  timeOfDay?: string
  reasoning?: string
  last?: boolean
  compact?: boolean
}

export default function PriorityCard({ num, title, category, time, timeOfDay, reasoning, last, compact = false }: Props) {
  const colors = CATEGORY_COLORS[category] ?? { tag: 'var(--bg-3)', border: 'var(--text-3)' }
  const rankStr = String(num).padStart(2, '0')

  return (
    <div style={{
      display: 'flex', gap: compact ? '12px' : '20px', alignItems: 'flex-start',
      padding: compact ? '14px 0' : '24px 0',
      borderBottom: last ? 'none' : '1px solid var(--border)',
    }}>
      {/* Rank */}
      <div style={{
        fontFamily: 'var(--font-serif)',
        fontSize: compact ? '26px' : '42px',
        fontWeight: 300, lineHeight: 1,
        color: 'var(--text-3)', opacity: 0.4, flexShrink: 0,
        width: compact ? '30px' : '48px',
        textAlign: 'right', letterSpacing: '-0.02em', paddingTop: '2px',
      }}>
        {rankStr}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: compact ? '13.5px' : '16px', fontWeight: 600,
          color: 'var(--text-0)', lineHeight: 1.3,
          marginBottom: compact ? '4px' : '6px', letterSpacing: '-0.01em',
        }}>
          {title}
        </div>
        {reasoning && !compact && (
          <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.65, fontStyle: 'italic' }}>
            {reasoning}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '9.5px', padding: '2px 7px', borderRadius: '4px', fontWeight: 600,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            background: colors.tag, color: colors.border,
          }}>
            {category}
          </span>
          {time && time !== '—' && (
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{time}</span>
          )}
          {!compact && timeOfDay && timeOfDay !== 'flexible' && timeOfDay !== 'anytime' && (
            <span style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'capitalize' }}>· {timeOfDay}</span>
          )}
        </div>
      </div>
    </div>
  )
}
