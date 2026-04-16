'use client'

import type { Goal, CheckIn, HabitWithLogs, Brief } from '@/lib/types'
import type { UserMemory } from '@/lib/ai/memory'
import BriefHistory from './BriefHistory'
import WeeklyCalendarStrip from './WeeklyCalendarStrip'
import GreetingWidget from './GreetingWidget'

type Props = {
  goals: Goal[]
  checkin: CheckIn | null
  avgEnergy: number | null
  habits: HabitWithLogs[]
  brief?: Brief | null
  needsGeneration?: boolean | null
  memory?: UserMemory | null
  pastBriefs?: Brief[]
  coverUrl?: string | null
  userName?: string | null
}

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1400&q=80'

export default function DailyBrief({ goals, checkin, avgEnergy, habits, brief, memory, pastBriefs = [], coverUrl, userName }: Props) {
  const cover = coverUrl || DEFAULT_COVER
  const now = new Date()

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', animation: 'fadeUp 0.3s var(--ease) both' }}>

      {/* ── Cover hero ── */}
      <div style={{
        position: 'relative', height: '180px',
        background: `url(${cover}) center/cover no-repeat`,
        borderRadius: '0 0 20px 20px', overflow: 'hidden',
      }}>
        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(19,17,16,0.88) 0%, rgba(19,17,16,0.20) 60%, transparent 100%)' }} />
        {/* Bottom row: date only */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '18px 24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(212,168,83,0.85)', fontWeight: 600, marginBottom: '4px' }}>
              {now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#f2ebe0', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {now.toLocaleDateString('en-US', { weekday: 'long' })}
            </div>
          </div>
          <div style={{ color: 'rgba(242,235,224,0.45)', cursor: 'pointer', paddingBottom: '4px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="9" x2="20" y2="9" />
              <line x1="4" y1="15" x2="20" y2="15" />
            </svg>
          </div>
        </div>
      </div>

      <div className="page-pad" style={{ paddingTop: '20px' }}>
        <WeeklyCalendarStrip />
        <GreetingWidget checkin={checkin} habits={habits} goals={goals} brief={brief} pastBriefs={pastBriefs} userName={userName} />

        {/* Weekly Review link */}
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

        {/* Brief history */}
        <BriefHistory briefs={pastBriefs} />
      </div>
    </div>
  )
}
