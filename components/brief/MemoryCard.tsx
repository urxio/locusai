'use client'

import { useState } from 'react'
import type { UserMemory } from '@/lib/ai/memory'

export default function MemoryCard({ memory }: { memory: UserMemory }) {
  const [expanded, setExpanded] = useState(false)

  // Don't render until there's enough data to be meaningful
  if (memory.checkin_count < 5) return null

  const { energy, habits, blockers, insights, checkin_count } = memory

  /* ── Energy summary string ── */
  const arrow = energy.trend === 'improving' ? '↑' : energy.trend === 'declining' ? '↓' : '→'
  const energyParts: string[] = [`avg ${energy.overall_avg}/10`]
  if (energy.best_day) energyParts.push(`peaks ${energy.best_day}s`)
  if (energy.worst_day && energy.worst_day !== energy.best_day) {
    energyParts.push(`dips ${energy.worst_day}s`)
  }
  energyParts.push(`${arrow} ${energy.trend}`)
  const energySummary = energyParts.join(' · ')

  const topHabit    = habits.strongest[0] ?? null
  const weakHabit   = habits.needs_work[0] ?? null
  const topBlocker  = blockers.frequent[0] ?? null
  const blockerCount = topBlocker ? blockers.frequencies[topBlocker] : 0

  const hasInsights = insights.length > 0
  const checkinLabel = checkin_count === 1 ? 'check-in' : 'check-ins'

  return (
    <div style={{
      background: 'var(--bg-1)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      marginBottom: '12px',
      transition: 'border-color 0.2s',
    }}>
      {/* Header — always visible, acts as toggle */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="icon-btn"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          {/* Pulsing learning dot */}
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: 'var(--sage)', flexShrink: 0,
            animation: 'pulse 2.5s ease-in-out infinite',
          }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.01em' }}>
            Locus knows you
          </span>
          <span style={{
            fontSize: '10px', fontWeight: 600, color: 'var(--sage)',
            background: 'var(--sage-dim)', padding: '2px 7px',
            borderRadius: '20px', letterSpacing: '0.03em',
          }}>
            {checkin_count} {checkinLabel}
          </span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-3)', transition: 'transform 0.2s', display: 'inline-block', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          ▾
        </span>
      </button>

      {/* Expandable body */}
      {expanded && (
        <div style={{
          padding: '0 18px 16px',
          borderTop: '1px solid var(--border)',
          animation: 'fadeUp 0.2s var(--ease) both',
        }}>

          {/* Stats grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '14px' }}>

            {/* Energy */}
            <Row
              label="Energy pattern"
              icon="⚡"
              value={energySummary}
            />

            {/* Strongest habit */}
            {topHabit && (
              <Row
                label="Most consistent"
                icon={topHabit.emoji}
                value={`${topHabit.name} — ${topHabit.rate_pct}% over 30 days`}
                positive
              />
            )}

            {/* Habit needing work */}
            {weakHabit && weakHabit.rate_pct < 40 && (
              <Row
                label="Needs attention"
                icon={weakHabit.emoji}
                value={`${weakHabit.name} — ${weakHabit.rate_pct}% over 30 days`}
              />
            )}

            {/* Recurring blocker */}
            {topBlocker && blockerCount >= 3 && (
              <Row
                label="Recurring blocker"
                icon="⚠"
                value={`"${topBlocker}" — reported ${blockerCount}×`}
              />
            )}
          </div>

          {/* AI-generated insights */}
          {hasInsights && (
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
              <div style={{
                fontSize: '10px', fontWeight: 700, color: 'var(--text-3)',
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px',
              }}>
                Patterns learned over time
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {insights.slice(0, 4).map((insight, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--sage)', flexShrink: 0, fontSize: '12px', marginTop: '1px' }}>•</span>
                    <span style={{
                      fontFamily: 'var(--font-serif)', fontSize: '14px', fontWeight: 300,
                      color: 'var(--text-1)', lineHeight: 1.55, letterSpacing: '0.01em',
                    }}>
                      {insight}
                    </span>
                  </div>
                ))}
              </div>
              {memory.last_insights_update && (
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '10px' }}>
                  Last updated {new Date(memory.last_insights_update).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              )}
            </div>
          )}

          {!hasInsights && checkin_count >= 7 && (
            <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-3)', fontStyle: 'italic' }}>
              Behavioral insights generate after your weekly review — deeper patterns take a little longer to emerge.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, icon, value, positive }: { label: string; icon: string; value: string; positive?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '14px', flexShrink: 0, width: '18px', textAlign: 'center' }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1px' }}>
          {label}
        </div>
        <div style={{ fontSize: '13px', color: positive ? 'var(--sage)' : 'var(--text-2)', lineHeight: 1.4 }}>
          {value}
        </div>
      </div>
    </div>
  )
}
