'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import type { Goal, CheckIn, HabitWithLogs, Brief, GoalWithSteps } from '@/lib/types'
import type { UserMemory } from '@/lib/ai/memory'
import GreetingWidget from './GreetingWidget'
import StatusStrip from './StatusStrip'
import HabitsWeekStrip from './HabitsWeekStrip'
import HabitAuditStrip from './HabitAuditStrip'
import type { MissedHabit } from './HabitAuditStrip'
import GoalsWeekStrip from './GoalsWeekStrip'
import CorrelationsCard from './CorrelationsCard'
import MemoryCard from './MemoryCard'
import AIInsightCard from './AIInsightCard'
import PriorityCard from './PriorityCard'

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

  const [selectedTab, setSelectedTab] = useState<'insight' | 'priorities' | 'memory'>('insight')

  return (
    <div style={{ display: 'flex', height: '100%', animation: 'fadeUp 0.3s var(--ease) both' }}>

      {/* ── Main scrollable content ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* ── Header ── */}
        <div className="page-pad" style={{ paddingTop: '24px', paddingBottom: '0' }}>
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
          {/* Tab strip */}
          <div style={{ display: 'flex', gap: '2px', marginBottom: '20px', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '10px', padding: '3px' }}>
            {(['insight', 'priorities', 'memory'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  borderRadius: '7px',
                  background: selectedTab === tab ? 'var(--bg-0)' : 'transparent',
                  border: 'none',
                  boxShadow: selectedTab === tab ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                  color: selectedTab === tab ? 'var(--text-0)' : 'var(--text-3)',
                  fontSize: '13px',
                  fontWeight: selectedTab === tab ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.15s var(--ease)',
                  textTransform: 'capitalize',
                  letterSpacing: '0.01em',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {selectedTab === 'insight' && (
            <>
              <GreetingWidget
                checkin={checkin}
                habits={habits}
                goals={goals}
                brief={brief}
                todayDate={todayDate}
                userName={userName}
              />
              {brief?.insight_text && (
                <AIInsightCard text={brief.insight_text} />
              )}
              <CorrelationsCard memory={memory ?? null} />
            </>
          )}
          {selectedTab === 'priorities' && (
            <>
              {missedYesterday.length > 0 && (
                <HabitAuditStrip missed={missedYesterday} yesterday={yesterday} />
              )}
              {brief?.priorities && brief.priorities.length > 0 ? (
                <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '16px', padding: '0 20px', marginBottom: '16px' }}>
                  {brief.priorities.map((p, i) => (
                    <PriorityCard
                      key={i}
                      num={i + 1}
                      title={p.title}
                      category={p.category}
                      time={p.estimated_time}
                      timeOfDay={p.time_of_day}
                      reasoning={p.reasoning}
                      last={i === brief.priorities.length - 1}
                    />
                  ))}
                </div>
              ) : null}
              <StatusStrip
                goals={goals}
                checkin={checkin}
                avgEnergy={avgEnergy}
                habits={habits}
              />
              <HabitsWeekStrip habits={habits} />
              <GoalsWeekStrip goals={goalsWithSteps} />
            </>
          )}
          {selectedTab === 'memory' && (
            <>
              {memory && <MemoryCard memory={memory} />}
            </>
          )}

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

      {/* ── Right photo panel — sticky, matches left sidebar width ── */}
      <div style={{
        width: '256px',
        flexShrink: 0,
        display: 'none',
        flexDirection: 'column',
        position: 'sticky',
        top: '0px',
        alignSelf: 'flex-start',
        height: 'calc(100vh - 32px)',
      }} className="brief-photo-panel">
        <div style={{
          position: 'relative',
          flex: 1,
          overflow: 'hidden',
          borderRadius: '32px',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--shadow-glass)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          height: '100%',
        }}>
          {/* Photo */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `url(${cover}) center/cover no-repeat`,
          }} />
          {/* Gradient overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(45,42,39,0.72) 0%, rgba(45,42,39,0.08) 55%, transparent 100%)',
          }} />
          {/* Top glass shimmer strip */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: '64px',
            background: 'linear-gradient(to bottom, var(--glass) 0%, transparent 100%)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
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
