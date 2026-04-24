'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Goal, CheckIn, HabitWithLogs, Brief, GoalWithSteps } from '@/lib/types'
import type { UserMemory } from '@/lib/ai/memory'
import type { MissedHabit } from './HabitAuditStrip'
import { logHabitAction, unlogHabitAction } from '@/app/actions/habits'

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

function browserDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function weekNum(d: Date) {
  return Math.ceil(
    (Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000) + 1) / 7
  )
}

/* ── Card shell ── */
function BentoCard({
  children, tone = 'light', className = '', href, style = {}
}: {
  children: React.ReactNode
  tone?: 'light' | 'tint'
  className?: string
  href?: string
  style?: React.CSSProperties
}) {
  const base: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    overflow: 'hidden',
    aspectRatio: '1 / 1',
    padding: '20px',
    textDecoration: 'none',
    color: 'inherit',
    cursor: href ? 'pointer' : 'default',
    transition: 'transform 0.18s var(--ease), box-shadow 0.2s var(--ease)',
    ...style,
  }
  const cls = tone === 'tint' ? 'glass-card-soft' : 'glass-card'
  const content = (
    <div
      className={`${cls} ${className}`}
      style={base}
      onMouseEnter={href ? e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' } : undefined}
      onMouseLeave={href ? e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' } : undefined}
    >
      {children}
    </div>
  )
  if (href) return <a href={href} style={{ textDecoration: 'none', color: 'inherit', display: 'contents' }}>{content}</a>
  return content
}

function CardLabel({ title, meta }: { title: string; meta?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--ink-400)' }}>
        {title}
      </span>
      {meta && <span style={{ fontSize: '10px', fontWeight: 500, color: 'var(--ink-400)', tabularNums: true } as React.CSSProperties}>{meta}</span>}
    </div>
  )
}

/* ── Circular progress ring ── */
function RingProgress({ value }: { value: number }) {
  const r = 28, c = 2 * Math.PI * r
  const offset = c - (value / 100) * c
  return (
    <div style={{ position: 'relative', width: '72px', height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg style={{ position: 'absolute', inset: 0 }} viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="5" />
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--ink-900)" strokeWidth="5"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          transform="rotate(-90 36 36)" />
      </svg>
      <span className="font-serif-display" style={{ fontSize: '15px', color: 'var(--ink-900)', fontWeight: 500 }}>{value}%</span>
    </div>
  )
}

export default function DailyBrief({
  goals, checkin, avgEnergy, habits, brief, todayDate, yesterday = '', userName, missedYesterday = [], goalsWithSteps = []
}: Props) {
  const router = useRouter()
  const now = new Date()
  const today = todayDate || browserDate()
  const wk = weekNum(now)

  const [doneMap, setDoneMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {}
    habits.forEach(h => { map[h.id] = h.logs.some(l => l.logged_date === today) })
    return map
  })
  const [, startTransition] = useTransition()

  function toggleHabit(habitId: string) {
    const wasDone = doneMap[habitId] ?? false
    setDoneMap(prev => ({ ...prev, [habitId]: !wasDone }))
    startTransition(async () => {
      try {
        if (wasDone) await unlogHabitAction(habitId)
        else await logHabitAction(habitId)
        router.refresh()
      } catch {
        setDoneMap(prev => ({ ...prev, [habitId]: wasDone }))
      }
    })
  }

  useEffect(() => {
    const onVisibility = () => { if (!document.hidden) router.refresh() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [router])

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const dayLabel = now.toLocaleDateString('en-US', { weekday: 'long' })
  const dateLabel = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  const scheduledToday = habits.filter(h => h.isScheduledToday)
  const doneToday = scheduledToday.filter(h => doneMap[h.id])
  const activeGoals = goals.filter(g => g.status === 'active')
  const topGoal = activeGoals[0] ?? null
  const secondGoal = activeGoals[1] ?? null
  const energyVal = checkin?.energy_level ?? avgEnergy
  const insightText = brief?.insight_text ?? null
  const priorities = brief?.priorities ?? []
  const totalHabitsDoneWeek = habits.reduce((s, h) => s + h.weekCompletions, 0)
  const totalHabitsWeek = habits.reduce((s, h) => s + (h.target_count ?? 1), 0)
  const topStreak = Math.max(0, ...habits.map(h => h.streak))

  const avgGoalPct = activeGoals.length
    ? Math.round(activeGoals.reduce((s, g) => s + g.progress_pct, 0) / activeGoals.length)
    : null

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '14px 16px 16px', gap: '14px', animation: 'fadeUp 0.4s var(--ease) both' }}>

      {/* ── OS Top Bar ── */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexShrink: 0 }}>
        {/* Left: brand + greeting */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '12px',
            background: 'var(--glass-card-bg-tint)',
            border: '1.5px solid var(--glass-card-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--sea-soft, #c8ddd7) 0%, var(--sage) 100%)' }} />
          </div>
          <div className="glass-pill" style={{ display: 'flex', alignItems: 'center', gap: '10px', borderRadius: '20px', padding: '5px 14px 5px 8px' }}>
            <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--ink-900)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--glass-card-bg)' }} />
            </span>
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ink-400)' }}>
              {greeting}{userName ? `, ${userName.split(' ')[0]}` : ''}
            </span>
          </div>
        </div>

        {/* Center: date pill */}
        <div className="glass-pill" style={{ display: 'flex', alignItems: 'center', gap: '10px', borderRadius: '20px', padding: '6px 16px' }}>
          {checkin && (
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--sage)', flexShrink: 0 }} />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3, alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-900)' }}>{dayLabel} · {dateLabel}</span>
            {checkin && <span style={{ fontSize: '10px', color: 'var(--ink-400)' }}>Check-in logged</span>}
            {!checkin && <span style={{ fontSize: '10px', color: 'var(--ink-400)' }}>No check-in yet</span>}
          </div>
        </div>

        {/* Right: week + search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="glass-pill" style={{ display: 'flex', alignItems: 'center', gap: '2px', borderRadius: '20px', padding: '4px' }}>
            <span style={{ borderRadius: '16px', padding: '5px 12px', fontSize: '12px', fontWeight: 500, color: 'var(--ink-400)' }}>Overview</span>
            <span style={{ borderRadius: '16px', background: 'var(--ink-900)', padding: '5px 12px', fontSize: '12px', fontWeight: 500, color: 'var(--glass-card-bg)' }}>Today</span>
          </div>
          <a href="/patterns" className="glass-pill" style={{
            width: '36px', height: '36px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--ink-400)', textDecoration: 'none',
          }}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" width="16" height="16">
              <circle cx="8.5" cy="8.5" r="5.5" />
              <path d="M14.5 14.5l3 3" strokeLinecap="round" />
            </svg>
          </a>
        </div>
      </header>

      {/* ── Bento Grid ── */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
        gap: '14px',
        minHeight: 0,
      }}>

        {/* 1 — Capture */}
        <BentoCard tone="tint" href="/capture">
          <CardLabel title="Capture" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <span style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.75)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--ink-500)',
            }}>
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
                <path d="M10 4v12M4 10h12" strokeLinecap="round" />
              </svg>
            </span>
            <p className="font-serif-display" style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--ink-500)', textAlign: 'center', lineHeight: 1.3 }}>
              Capture a thought
            </p>
          </div>
          <div style={{ height: '12px' }} />
        </BentoCard>

        {/* 2 — Morning Brief (AI Insight) */}
        <BentoCard>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <h3 className="font-serif-display" style={{ fontSize: '18px', lineHeight: 1.2, color: 'var(--ink-900)', fontWeight: 400 }}>
              Morning<br />Brief
            </h3>
            <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--ink-400)' }}>AI</span>
          </div>
          <p style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--ink-500)', flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>
            {insightText
              ? `"${insightText.slice(0, 120)}${insightText.length > 120 ? '…' : ''}"`
              : checkin
                ? '"Your check-in is logged. AI brief will generate shortly."'
                : '"Start your day with a check-in to unlock your AI brief."'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '-6px' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: i === 0 ? 'linear-gradient(135deg, var(--sea-soft,#c8ddd7), var(--sage))' : i === 1 ? 'rgba(255,255,255,0.70)' : 'linear-gradient(135deg, var(--ink-400), var(--ink-900))',
                  border: '2px solid rgba(255,255,255,0.8)',
                  marginLeft: i > 0 ? '-6px' : '0',
                }} />
              ))}
            </div>
            <a href="/checkin" style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.80)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--ink-900)', textDecoration: 'none',
            }}>
              <svg viewBox="0 0 16 16" fill="currentColor" width="10" height="10">
                <path d="M3 2l10 6-10 6V2z" />
              </svg>
            </a>
          </div>
        </BentoCard>

        {/* 3 — Energy */}
        <BentoCard>
          <CardLabel title="Energy" meta="Today" />
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span className="font-serif-display" style={{ fontSize: '48px', lineHeight: 1, color: 'var(--ink-900)', fontWeight: 400 }}>
                  {energyVal != null ? energyVal : '—'}
                </span>
                {energyVal != null && <span style={{ fontSize: '12px', color: 'var(--ink-400)' }}>/10</span>}
              </div>
              <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--sage)', marginTop: '4px' }}>
                {checkin ? '↑ Logged today' : avgEnergy ? '≈ 7-day avg' : 'No data yet'}
              </p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', height: '40px', alignItems: 'flex-end', gap: '3px' }}>
              {[55, 70, 45, 80, 60, 90, energyVal ? energyVal * 10 : 50].map((h, i) => (
                <div key={i} style={{
                  width: '5px', borderRadius: '2px',
                  height: `${h}%`,
                  background: i === 6 ? 'var(--sage)' : 'rgba(var(--ink-300-raw, 180, 190, 185), 0.50)',
                  opacity: i === 6 ? 1 : 0.55,
                }} />
              ))}
            </div>
          </div>
          <div>
            <div style={{ height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.35)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '3px', background: 'linear-gradient(to right, var(--sage), oklch(0.72 0.05 165))', width: `${(energyVal ?? 0) * 10}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
              <span style={{ fontSize: '10px', color: 'var(--ink-400)', fontWeight: 500 }}>Weekly avg</span>
              <span style={{ fontSize: '11px', color: 'var(--ink-900)', fontWeight: 600 }}>{avgEnergy != null ? avgEnergy.toFixed(1) : '—'}</span>
            </div>
          </div>
        </BentoCard>

        {/* 4 — Top Goal */}
        {topGoal ? (
          <BentoCard tone="tint" href="/goals">
            <div>
              <h3 className="font-serif-display" style={{ fontSize: '18px', lineHeight: 1.25, color: 'var(--ink-900)', fontWeight: 400 }}>
                {topGoal.title.split(' ').slice(0, 3).join('\n').replace(/ /g, '\n')}
              </h3>
              <p style={{ marginTop: '4px', fontSize: '11px', color: 'var(--ink-500)' }}>
                {topGoal.category} · {topGoal.timeframe}
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <RingProgress value={topGoal.progress_pct} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-400)' }}>
                {activeGoals.length} active goal{activeGoals.length !== 1 ? 's' : ''}
              </span>
              <span style={{
                width: '26px', height: '26px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.80)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', color: 'var(--ink-500)',
              }}>→</span>
            </div>
          </BentoCard>
        ) : (
          <BentoCard tone="tint" href="/goals">
            <CardLabel title="Goals" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <p className="font-serif-display" style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--ink-500)', textAlign: 'center' }}>Set your first goal</p>
            </div>
            <div />
          </BentoCard>
        )}

        {/* 5 — Habits */}
        <BentoCard>
          <CardLabel title="Habits" meta={scheduledToday.length > 0 ? `${doneToday.length}/${scheduledToday.length}` : undefined} />
          <ul style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflowHidden: true } as React.CSSProperties}>
            {scheduledToday.slice(0, 4).map(h => {
              const done = doneMap[h.id] ?? false
              return (
                <li
                  key={h.id}
                  onClick={() => toggleHabit(h.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}
                >
                  <span style={{
                    width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0,
                    border: done ? '1px solid var(--sage)' : '1px solid var(--ink-300)',
                    background: done ? 'oklch(0.62 0.06 165 / 0.25)' : 'rgba(255,255,255,0.50)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s ease, border-color 0.15s ease',
                  }}>
                    {done && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--sage)' }} />}
                  </span>
                  <span style={{
                    fontSize: '12px', flex: 1,
                    color: done ? 'var(--ink-400)' : 'var(--ink-900)',
                    textDecoration: done ? 'line-through' : 'none',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    transition: 'color 0.15s ease',
                  }}>
                    {h.emoji ? `${h.emoji} ` : ''}{h.name}
                  </span>
                </li>
              )
            })}
            {scheduledToday.length === 0 && (
              <li style={{ fontSize: '12px', color: 'var(--ink-400)', fontStyle: 'italic' }}>No habits today</li>
            )}
          </ul>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '-4px' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: '18px', height: '18px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--sea-soft,#c8ddd7), var(--sage))',
                  border: '2px solid rgba(255,255,255,0.8)',
                  marginLeft: i > 0 ? '-4px' : '0',
                }} />
              ))}
            </div>
            <span style={{ fontSize: '10px', fontWeight: 500, color: 'var(--ink-400)' }}>
              {topStreak > 0 ? `${topStreak}d streak` : 'Build your streak'}
            </span>
          </div>
        </BentoCard>

        {/* 6 — Today's Plan (priorities) */}
        <BentoCard tone="tint">
          <CardLabel title="Today" meta={now.toLocaleDateString('en-US', { weekday: 'short' })} />
          <ol style={{
            flex: 1, display: 'flex', flexDirection: 'column', gap: '10px',
            position: 'relative',
            listStyle: 'none',
          }}>
            {/* Timeline line */}
            <div style={{ position: 'absolute', left: '34px', top: '4px', bottom: '4px', width: '1px', background: 'rgba(var(--ink-300-raw, 180,190,185), 0.40)' }} />
            {priorities.slice(0, 3).map((p, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
                <span style={{ width: '32px', textAlign: 'right', fontSize: '10px', fontWeight: 600, color: 'var(--ink-400)', flexShrink: 0, tabularNums: true } as React.CSSProperties}>
                  {p.time_of_day === 'morning' ? '09:00' : p.time_of_day === 'afternoon' ? '13:00' : p.time_of_day === 'evening' ? '18:00' : '—'}
                </span>
                <span style={{
                  width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0, zIndex: 1,
                  background: i === 0 ? 'var(--sage)' : 'rgba(255,255,255,0.80)',
                  border: i === 0 ? 'none' : '1px solid var(--ink-300)',
                  boxShadow: i === 0 ? '0 0 0 3px oklch(0.62 0.06 165 / 0.20)' : 'none',
                }} />
                <span style={{ fontSize: '12px', color: i === 0 ? 'var(--ink-900)' : 'var(--ink-500)', fontWeight: i === 0 ? 600 : 400, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.title}
                </span>
              </li>
            ))}
            {priorities.length === 0 && (
              <li style={{ fontSize: '12px', color: 'var(--ink-400)', fontStyle: 'italic', paddingLeft: '42px' }}>
                {checkin ? 'AI brief generating…' : 'Check in to see your plan'}
              </li>
            )}
          </ol>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--sage)' }}>
              {missedYesterday.length > 0 ? `${missedYesterday.length} missed yesterday` : 'Focus · on track'}
            </span>
            <a href="/checkin" style={{
              width: '26px', height: '26px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.80)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', color: 'var(--ink-500)', textDecoration: 'none',
            }}>→</a>
          </div>
        </BentoCard>

        {/* 7 — Weekly Overview */}
        <BentoCard>
          <div>
            <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--ink-400)' }}>Week {wk}</p>
            <h3 className="font-serif-display" style={{ marginTop: '4px', fontSize: '16px', lineHeight: 1.3, color: 'var(--ink-900)', fontWeight: 400 }}>
              {activeGoals.length > 0
                ? `${activeGoals.filter(g => g.progress_pct > 50).length} of ${activeGoals.length} goals\nadvanced`
                : 'Set goals to\ntrack progress'}
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {[
              { label: 'Habits', value: `${totalHabitsDoneWeek}/${totalHabitsWeek}` },
              { label: 'Goals', value: `${activeGoals.length}` },
              { label: 'Energy', value: avgEnergy != null ? avgEnergy.toFixed(1) : '—' },
              { label: 'Progress', value: avgGoalPct != null ? `${avgGoalPct}%` : '—' },
            ].map(s => (
              <div key={s.label} style={{
                borderRadius: '10px', border: '1px solid rgba(255,255,255,0.55)',
                background: 'rgba(255,255,255,0.35)', padding: '8px 10px',
              }}>
                <div style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-400)' }}>{s.label}</div>
                <div className="font-serif-display" style={{ fontSize: '15px', lineHeight: 1.2, color: 'var(--ink-900)', fontWeight: 400 }}>{s.value}</div>
              </div>
            ))}
          </div>
        </BentoCard>

        {/* 8 — Second goal or Review link */}
        {secondGoal ? (
          <BentoCard tone="tint" href="/goals">
            <CardLabel title={secondGoal.category} meta="Goal" />
            <div>
              <h3 className="font-serif-display" style={{ fontSize: '18px', lineHeight: 1.3, color: 'var(--ink-900)', fontWeight: 400 }}>
                {secondGoal.progress_pct}%
              </h3>
              <p style={{ marginTop: '2px', fontSize: '11px', color: 'var(--ink-500)' }}>
                {secondGoal.title.length > 28 ? secondGoal.title.slice(0, 28) + '…' : secondGoal.title}
              </p>
            </div>
            <div>
              <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.50)', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{ height: '100%', borderRadius: '2px', background: 'var(--sage)', width: `${secondGoal.progress_pct}%` }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {(['M','T','W','T','F','S','S']).map((d, i) => (
                    <span key={i} style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '9px', fontWeight: 500,
                      background: i < 4 ? 'oklch(0.62 0.06 165 / 0.25)' : 'rgba(255,255,255,0.45)',
                      color: i < 4 ? 'var(--ink-900)' : 'var(--ink-400)',
                    }}>{d}</span>
                  ))}
                </div>
              </div>
            </div>
          </BentoCard>
        ) : (
          <BentoCard tone="tint" href="/review">
            <CardLabel title="Review" meta="Weekly" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.75)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--ink-500)',
              }}>
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
                  <path d="M4 10a6 6 0 1 0 6-6" strokeLinecap="round" />
                  <path d="M4 6v4h4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="font-serif-display" style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--ink-500)', textAlign: 'center' }}>
                This week's review
              </p>
            </div>
            <div />
          </BentoCard>
        )}
      </div>
    </div>
  )
}
