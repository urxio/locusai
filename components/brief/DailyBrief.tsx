'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import type { Goal, CheckIn, HabitWithLogs, Brief } from '@/lib/types'
import type { UserMemory } from '@/lib/ai/memory'
import WeeklyCalendarStrip from './WeeklyCalendarStrip'
import GreetingWidget from './GreetingWidget'
import StatusStrip from './StatusStrip'
import HabitsWeekStrip from './HabitsWeekStrip'

type Props = {
  goals: Goal[]
  checkin: CheckIn | null
  avgEnergy: number | null
  habits: HabitWithLogs[]
  brief?: Brief | null
  memory?: UserMemory | null
  todayDate?: string
  coverUrl?: string | null
  userName?: string | null
}

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1400&q=80'

export default function DailyBrief({ goals, checkin, avgEnergy, habits, brief, todayDate, coverUrl, userName }: Props) {
  const router = useRouter()
  const cover  = coverUrl || DEFAULT_COVER
  const now    = new Date()

  // Re-fetch whenever the user tabs back so stats stay current
  useEffect(() => {
    const onVisibility = () => { if (!document.hidden) router.refresh() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [router])

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', animation: 'fadeUp 0.3s var(--ease) both' }}>

      {/* ── Cover hero ── */}
      <div style={{
        position: 'relative', height: '180px',
        background: `url(${cover}) center/cover no-repeat`,
        borderRadius: '0 0 20px 20px', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(19,17,16,0.88) 0%, rgba(19,17,16,0.20) 60%, transparent 100%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '18px 24px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(212,168,83,0.85)', fontWeight: 600, marginBottom: '4px' }}>
            {now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#f2ebe0', lineHeight: 1, letterSpacing: '-0.02em' }}>
            {now.toLocaleDateString('en-US', { weekday: 'long' })}
          </div>
        </div>
      </div>

      <div className="page-pad" style={{ paddingTop: '20px' }}>
        <WeeklyCalendarStrip />

        {/* Greeting + pulse summary (uses brief insight for the AI pulse card) */}
        <GreetingWidget
          checkin={checkin}
          habits={habits}
          goals={goals}
          brief={brief}
          todayDate={todayDate}
          userName={userName}
        />

        {/* ── Today's Status Strip ── */}
        <StatusStrip
          goals={goals}
          checkin={checkin}
          avgEnergy={avgEnergy}
          habits={habits}
        />

        {/* ── Habits This Week ── */}
        <HabitsWeekStrip habits={habits} />

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
  )
}
