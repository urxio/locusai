'use client'

import type { UserMemory } from '@/lib/ai/memory'

type Props = { memory: UserMemory | null }

export default function CorrelationsCard({ memory }: Props) {
  const c = memory?.correlations
  if (!c) return null

  // Build display entries — habits first, then keywords
  type Entry = { label: string; diff: number; sub: string }
  const entries: Entry[] = []

  c.habits.forEach(h => {
    if (Math.abs(h.diff) < 0.5) return
    const direction = h.diff > 0 ? `+${h.diff}` : `${h.diff}`
    entries.push({
      label: `${h.habit_emoji} ${h.habit_name}`,
      diff:  h.diff,
      sub:   `${direction} energy next day · ${h.sample_size} days of data`,
    })
  })

  c.keywords.forEach(k => {
    if (Math.abs(k.diff) < 0.7) return
    const direction = k.diff > 0 ? `+${k.diff}` : `${k.diff}`
    entries.push({
      label: `Mentioning "${k.word}"`,
      diff:  k.diff,
      sub:   `${direction} energy that day · ${k.sample_size} occurrences`,
    })
  })

  if (entries.length < 2) return null   // not enough signal to be worth showing

  // Sort strongest first
  entries.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
  const visible = entries.slice(0, 4)

  return (
    <div style={{ marginTop: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
        <span style={{
          fontSize: '10px', fontWeight: 700, color: 'var(--text-3)',
          letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          What Locus has noticed
        </span>
        <div style={{
          width: '5px', height: '5px', borderRadius: '50%',
          background: 'var(--sage)', boxShadow: '0 0 5px rgba(122,184,152,0.5)',
        }} />
      </div>

      <div style={{
        background: 'var(--bg-1)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '2px',
      }}>
        <p style={{
          fontSize: '11px', color: 'var(--text-3)', marginBottom: '10px', lineHeight: 1.5,
        }}>
          Patterns found in your data — not advice, just what the numbers show.
        </p>

        {visible.map((e, i) => {
          const isPositive = e.diff > 0
          const color      = isPositive ? 'var(--sage)' : '#c07878'
          const bgColor    = isPositive ? 'rgba(122,184,152,0.08)' : 'rgba(192,120,120,0.08)'
          const border     = isPositive ? 'rgba(122,184,152,0.18)' : 'rgba(192,120,120,0.18)'
          const arrow      = isPositive ? '↑' : '↓'

          return (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px', borderRadius: '10px',
                background: bgColor, border: `1px solid ${border}`,
                marginBottom: i < visible.length - 1 ? '6px' : 0,
              }}
            >
              {/* Arrow indicator */}
              <div style={{
                width: '24px', height: '24px', borderRadius: '6px', flexShrink: 0,
                background: isPositive ? 'rgba(122,184,152,0.15)' : 'rgba(192,120,120,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', color,
              }}>
                {arrow}
              </div>

              {/* Label + sub */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-0)', lineHeight: 1.3 }}>
                  {e.label}
                </div>
                <div style={{ fontSize: '11px', color, marginTop: '1px', lineHeight: 1.3 }}>
                  {e.sub}
                </div>
              </div>
            </div>
          )
        })}

        <p style={{
          fontSize: '10px', color: 'var(--text-3)', marginTop: '8px',
          fontStyle: 'italic', lineHeight: 1.4,
        }}>
          Based on your last {memory?.checkin_count ?? '?'} check-ins · updates after each check-in
        </p>
      </div>
    </div>
  )
}
