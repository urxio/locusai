'use client'

import { useState } from 'react'
import WeeklyReview from '@/components/weekly/WeeklyReview'
import PatternsView from '@/components/patterns/PatternsView'
import type { CheckIn, HabitWithLogs, Goal } from '@/lib/types'
import type { WeeklyReflection } from '@/lib/ai/weekly-prompts'
import type { PatternsContext } from '@/lib/ai/patterns-context'
import type { StoredWeeklyReflection } from '@/lib/db/weekly-reflections'

type Tab = 'reflection' | 'patterns'

type Props = {
  /* weekly review */
  checkins:           CheckIn[]
  habits:             HabitWithLogs[]
  goals:              Goal[]
  initialReflection:  WeeklyReflection | null
  pastReflections:    StoredWeeklyReflection[]
  /* patterns */
  ctx:                PatternsContext
  cachedNarratives:   string[] | null
  cachedGeneratedAt:  string | null
}

export default function ReviewTabs(props: Props) {
  const [tab, setTab] = useState<Tab>('reflection')

  return (
    <div>
      {/* ── Tab bar ── */}
      <div style={{
        padding: '16px 20px 0',
        display: 'flex',
        justifyContent: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'var(--bg-0)',
        paddingBottom: '12px',
        borderBottom: '1px solid var(--border)',
        marginBottom: '4px',
      }}>
        <div style={{
          display: 'inline-flex',
          background: 'var(--bg-2)',
          borderRadius: '11px',
          padding: '3px',
          border: '1px solid var(--border)',
          gap: '2px',
        }}>
          {(['reflection', 'patterns'] as const).map(t => {
            const active = tab === t
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  background:  active ? 'var(--bg-0)' : 'transparent',
                  border:      active ? '1px solid var(--border-md)' : '1px solid transparent',
                  borderRadius: '8px',
                  padding:     '7px 22px',
                  fontSize:    '13px',
                  fontWeight:  active ? 700 : 500,
                  color:       active ? 'var(--text-0)' : 'var(--text-3)',
                  cursor:      'pointer',
                  transition:  'all 0.15s ease',
                  letterSpacing: '0.02em',
                  whiteSpace:  'nowrap',
                }}
              >
                {t === 'reflection' ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ReflectionTabIcon active={active} />
                    Reflection
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <PatternsTabIcon active={active} />
                    Patterns
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div key={tab} style={{ animation: 'fadeUp 0.22s var(--ease) both' }}>
        {tab === 'reflection' ? (
          <WeeklyReview
            checkins={props.checkins}
            habits={props.habits}
            goals={props.goals}
            initialReflection={props.initialReflection}
            pastReflections={props.pastReflections}
          />
        ) : (
          <PatternsView
            ctx={props.ctx}
            cachedNarratives={props.cachedNarratives}
            cachedGeneratedAt={props.cachedGeneratedAt}
          />
        )}
      </div>
    </div>
  )
}

/* ── Tab icons ── */
function ReflectionTabIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"
      style={{ opacity: active ? 1 : 0.6 }}>
      <path d="M2 4h12M2 8h8M2 12h10" strokeLinecap="round" />
    </svg>
  )
}

function PatternsTabIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"
      style={{ opacity: active ? 1 : 0.6 }}>
      <path d="M2 11l3-4 2.5 2.5 2.5-3.5L13 11" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="5" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="7.5" cy="9.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="10" cy="6" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
