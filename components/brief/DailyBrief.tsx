'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import type { Goal, CheckIn, HabitWithLogs, Brief, GoalWithSteps } from '@/lib/types'
import type { UserMemory } from '@/lib/ai/memory'
import GreetingWidget from './GreetingWidget'
import StatusStrip from './StatusStrip'
import HabitAuditStrip from './HabitAuditStrip'
import type { MissedHabit } from './HabitAuditStrip'
import GoalsWeekStrip from './GoalsWeekStrip'
import CorrelationsCard from './CorrelationsCard'

type Props = {
  goals: Goal[]
  checkin: CheckIn | null
  avgEnergy: number | null
  habits: HabitWithLogs[]
  brief?: Brief | null
  memory?: UserMemory | null
  todayDate?: string
  yesterday?: string
  coverUrl?: string | null
  userName?: string | null
  missedYesterday?: MissedHabit[]
  goalsWithSteps?: GoalWithSteps[]
}

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1400&q=80'

export default function DailyBrief({ goals, checkin, avgEnergy, habits, brief, memory, todayDate, yesterday = '', coverUrl, userName, missedYesterday = [], goalsWithSteps = [] }: Props) {
  const router = useRouter()
  const cover  = coverUrl || DEFAULT_COVER
  const now    = new Date()

  // Re-fetch whenever the user tabs back so stats stay current
  useEffect(() => {
    const onVisibility = () => { if (!document.hidden) router.refresh() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [router])

  const weekNum = Math.ceil(
    (Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000) + 1) / 7
  )

  return (
    <div style={{ display: 'flex', height: '100%', animation: 'fadeUp 0.3s var(--ease) both' }}>

      {/* ── Main scrollable content ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* ── Header ── */}
        <div className="page-pad" style={{ paddingBottom: '0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
            <div>
              <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--sage)', fontWeight: 600, marginBottom: '4px' }}>
                {now.toLocaleDateString('en-US', { weekday: 'long' }).slice(0, 3).toUpperCase() === now.toLocaleDateString('en-US', { weekday: 'long' }).slice(0, 3).toUpperCase()
                  ? `Good ${now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'} · Today`
                  : 'Today'}
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '36px', fontWeight: 600, color: 'var(--text-0)', lineHeight: 1, letterSpacing: '-0.02em' }}>
                {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
            </div>
            <div style={{ textAlign: 'right', marginTop: '4px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: 500 }}>Week {weekNum}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>Spring</div>
            </div>
          </div>
        </div>

        <div className="page-pad" style={{ paddingTop: '0' }}>
          {/* Greeting + pulse summary (uses brief insight for the AI pulse card) */}
          <GreetingWidget
            checkin={checkin}
            habits={habits}
            goals={goals}
            brief={brief}
            todayDate={todayDate}
            userName={userName}
          />

          {/* ── Yesterday's missed habits audit — shown right after greeting ── */}
          {missedYesterday.length > 0 && (
            <HabitAuditStrip missed={missedYesterday} yesterday={yesterday} />
          )}

          {/* ── Today's Status Strip ── */}
          <StatusStrip
            goals={goals}
            checkin={checkin}
            avgEnergy={avgEnergy}
            habits={habits}
          />

          {/* ── Goals This Week ── */}
          <GoalsWeekStrip goals={goalsWithSteps} />

          {/* ── What Locus has noticed (correlations) ── */}
          <CorrelationsCard memory={memory ?? null} />

          {/* Weekly review link */}
          <a
            href="/review"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginTop: '16px', padding: '13px 16px',
              background: 'var(--bg-1)', border: '1px solid var(--border)',
              borderRadius: '12px', textDecoration: 'none',
              color: 'var(--text-1)', fontSize: '13px', fontWeight: 500,
              transition: 'border-color 0.15s',
            }}
          >
            <span>Weekly review</span>
            <span style={{ color: 'var(--gold)', fontSize: '13px' }}>This week →</span>
          </a>
        </div>
      </div>

      {/* ── Right photo panel — matches left sidebar width (256px) ── */}
      <div style={{
        width: '256px',
        flexShrink: 0,
        display: 'none',
        flexDirection: 'column',
        alignSelf: 'stretch',
      }} className="brief-photo-panel">
        <div style={{
          position: 'relative', flex: 1,
          overflow: 'hidden',
          borderRadius: '32px',
          border: '1px solid var(--glass-border, rgba(255,255,255,0.7))',
          boxShadow: 'var(--shadow-glass, 0 8px 32px rgba(0,0,0,0.04))',
        }}>
          {/* Photo */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `url(${cover}) center/cover no-repeat`,
          }} />
          {/* Gradient overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(45,42,39,0.65) 0%, rgba(45,42,39,0.10) 50%, transparent 100%)',
          }} />
          {/* Quote */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '24px',
            color: '#f7f3eb',
          }}>
            <div style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.20em', opacity: 0.80, marginBottom: '8px' }}>
              Today&apos;s intention
            </div>
            <p style={{ fontSize: '14px', fontWeight: 500, lineHeight: 1.4, margin: 0 }}>
              &ldquo;Move slowly, finish what matters, leave space for stillness.&rdquo;
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
