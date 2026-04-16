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
}

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1400&q=80'

export default function DailyBrief({ goals, checkin, avgEnergy, habits, brief, memory, pastBriefs = [], coverUrl }: Props) {
  const cover = coverUrl || DEFAULT_COVER
  const energy = checkin?.energy_level ?? avgEnergy ?? 7
  const energyPct = ((energy - 1) / 9) * 100
  const now = new Date()

  const sw = 3.5
  const r = 22
  const circ = 2 * Math.PI * r
  const dashOffset = circ - (energyPct / 100) * circ

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', animation: 'fadeUp 0.3s var(--ease) both' }}>

      {/* ── Cover hero — energy ring + date ── */}
      <div style={{
        position: 'relative', height: '180px',
        background: `url(${cover}) center/cover no-repeat`,
        borderRadius: '0 0 20px 20px', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(19,17,16,0.92) 0%, rgba(19,17,16,0.25) 60%, transparent 100%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '18px 24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Energy ring */}
            <div style={{ position: 'relative', width: '52px', height: '52px', flexShrink: 0 }}>
              <svg width="52" height="52" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
                <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={sw} />
                <circle cx="26" cy="26" r={r} fill="none" stroke="var(--sage)" strokeWidth={sw}
                  strokeDasharray={circ} strokeDashoffset={dashOffset} strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1) 0.15s' }}
                />
              </svg>
              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                {Math.round(energyPct)}
              </span>
            </div>
            {/* Date */}
            <div>
              <div style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(212,168,83,0.85)', fontWeight: 600, marginBottom: '3px' }}>
                {now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '30px', fontWeight: 800, color: '#f2ebe0', lineHeight: 1, letterSpacing: '-0.02em' }}>{now.getDate()}</span>
                <span style={{ fontSize: '20px', fontWeight: 500, color: 'rgba(242,235,224,0.65)', lineHeight: 1 }}>{now.toLocaleDateString('en-US', { weekday: 'long' })}</span>
              </div>
            </div>
          </div>
          <div style={{ color: 'rgba(242,235,224,0.5)', cursor: 'pointer', paddingBottom: '4px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="9" x2="20" y2="9" />
              <line x1="4" y1="15" x2="20" y2="15" />
            </svg>
          </div>
        </div>
      </div>

      <div className="page-pad" style={{ paddingTop: '20px' }}>
        <WeeklyCalendarStrip />
        <GreetingWidget checkin={checkin} habits={habits} goals={goals} brief={brief} />

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
