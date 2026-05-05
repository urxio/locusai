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

function RingProgress({ value, size = 120 }: { value: number; size?: number }) {
  const r = size * 0.38
  const c = 2 * Math.PI * r
  const offset = c - (value / 100) * c
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg style={{ position: 'absolute', inset: 0 }} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="7" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="var(--sage)" strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="font-serif-display" style={{ fontSize: size * 0.2 + 'px', color: 'var(--ink-900)', fontWeight: 500 }}>
        {value}%
      </span>
    </div>
  )
}

export default function DailyBrief({
  goals, checkin, avgEnergy, habits, brief, todayDate, yesterday = '', userName, missedYesterday = [],
}: Props) {
  const router = useRouter()
  const now = new Date()
  const today = todayDate || browserDate()

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
  const topHabit = scheduledToday[0] ?? null
  const energyVal = checkin?.energy_level ?? null

  return (
    <div
      className="brief-shell"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '14px 16px 16px',
        gap: '14px',
        animation: 'fadeUp 0.4s var(--ease) both',
      }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 0.9; }
        }
        .big3-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          flex: 1;
          min-height: 0;
        }
        .big3-card {
          display: flex;
          flex-direction: column;
          padding: 28px 24px 22px;
          border-radius: var(--radius-card);
          text-decoration: none;
          color: inherit;
          cursor: pointer;
          transition: transform 0.18s var(--ease), box-shadow 0.2s var(--ease);
          overflow: hidden;
          position: relative;
        }
        .big3-card:hover {
          transform: translateY(-3px);
        }
        .big3-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: var(--ink-400);
          margin-bottom: 4px;
        }
        .big3-sublabel {
          font-size: 13px;
          color: var(--ink-500);
          font-weight: 400;
          line-height: 1.4;
        }
        .big3-center {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }
        .big3-action {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 16px;
        }
        .big3-arrow {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: rgba(255,255,255,0.18);
          border: 1px solid rgba(255,255,255,0.28);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--ink-500);
          flex-shrink: 0;
        }
        .habit-checkbox {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: 2px solid var(--ink-300);
          background: rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.18s, border-color 0.18s, transform 0.15s;
          flex-shrink: 0;
        }
        .habit-checkbox.done {
          border-color: var(--sage);
          background: oklch(0.62 0.06 165 / 0.22);
        }
        .habit-checkbox:active {
          transform: scale(0.92);
        }
        @media (max-width: 720px) {
          .big3-grid {
            grid-template-columns: 1fr;
            grid-template-rows: repeat(3, auto);
          }
          .big3-card {
            padding: 22px 20px 18px;
            min-height: 180px;
          }
          .big3-center {
            flex-direction: row;
            justify-content: flex-start;
            gap: 20px;
          }
        }
      `}</style>

      {/* ── Header ── */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexShrink: 0 }}>
        {/* Left: brand + greeting */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '12px',
            background: 'var(--glass-card-bg-tint)',
            border: '1.5px solid var(--glass-card-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--sea-soft, #c8ddd7) 0%, var(--sage) 100%)' }} />
          </div>
          <div className="glass-pill" style={{ display: 'flex', alignItems: 'center', gap: '10px', borderRadius: '20px', padding: '5px 14px 5px 8px', minWidth: 0 }}>
            <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--ink-900)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--glass-card-bg)' }} />
            </span>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink-400)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {greeting}{userName ? `, ${userName.split(' ')[0]}` : ''}
            </span>
          </div>
        </div>

        {/* Center: date */}
        <div className="glass-pill" style={{ display: 'flex', alignItems: 'center', gap: '10px', borderRadius: '20px', padding: '6px 16px', flexShrink: 0 }}>
          {checkin && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--sage)', flexShrink: 0 }} />}
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3, alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-900)', whiteSpace: 'nowrap' }}>{dayLabel} · {dateLabel}</span>
            <span style={{ fontSize: '10px', color: 'var(--ink-400)' }}>
              {checkin ? 'Check-in logged' : 'No check-in yet'}
            </span>
          </div>
        </div>

        {/* Right: capture */}
        <a href="/capture" className="glass-pill" style={{
          width: '36px', height: '36px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ink-400)', textDecoration: 'none', flexShrink: 0,
        }}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" width="16" height="16">
            <path d="M10 4v12M4 10h12" strokeLinecap="round" />
          </svg>
        </a>
      </header>

      {/* ── Missed habits banner ── */}
      {missedYesterday.length > 0 && (
        <a href="/checkin" style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 16px', borderRadius: '14px',
          background: 'rgba(255,200,100,0.10)',
          border: '1px solid rgba(255,200,100,0.20)',
          textDecoration: 'none', flexShrink: 0,
        }}>
          <span style={{ fontSize: '16px' }}>⚠️</span>
          <span style={{ fontSize: '12px', color: 'var(--ink-500)', flex: 1 }}>
            You missed <strong style={{ color: 'var(--ink-900)' }}>{missedYesterday.length} habit{missedYesterday.length > 1 ? 's' : ''}</strong> yesterday —{' '}
            {missedYesterday.slice(0, 2).map(h => `${h.emoji ?? ''} ${h.name}`).join(', ')}
            {missedYesterday.length > 2 ? ` +${missedYesterday.length - 2} more` : ''}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--ink-400)' }}>→</span>
        </a>
      )}

      {/* ── Big 3 ── */}
      <div className="big3-grid">

        {/* ─ FEEL ─ */}
        <a href="/checkin" className="big3-card glass-card">
          <div>
            <div className="big3-label">Feel</div>
            <div className="big3-sublabel">How is your energy today?</div>
          </div>

          <div className="big3-center">
            {checkin ? (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span className="font-serif-display" style={{ fontSize: '80px', lineHeight: 1, color: 'var(--ink-900)', fontWeight: 400 }}>
                    {checkin.energy_level}
                  </span>
                  <span style={{ fontSize: '20px', color: 'var(--ink-400)', marginBottom: '8px' }}>/10</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--sage)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--sage)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Logged today</span>
                </div>
              </>
            ) : (
              <>
                <span style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{
                    position: 'absolute', width: '72px', height: '72px', borderRadius: '50%',
                    background: 'oklch(0.62 0.06 165 / 0.15)',
                    animation: 'pulse 2s ease-in-out infinite',
                  }} />
                  <span style={{
                    width: '52px', height: '52px', borderRadius: '50%',
                    background: 'oklch(0.62 0.06 165 / 0.25)',
                    border: '2px solid var(--sage)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg viewBox="0 0 20 20" fill="none" stroke="var(--sage)" strokeWidth="1.6" width="22" height="22">
                      <path d="M10 6v4l2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="10" cy="10" r="7" />
                    </svg>
                  </span>
                </span>
                <p className="font-serif-display" style={{ fontSize: '16px', fontStyle: 'italic', color: 'var(--ink-500)', textAlign: 'center', lineHeight: 1.4 }}>
                  Tap to log<br />your energy
                </p>
              </>
            )}
          </div>

          <div className="big3-action">
            {avgEnergy != null && (
              <span style={{ fontSize: '12px', color: 'var(--ink-400)' }}>
                7-day avg: <strong style={{ color: 'var(--ink-900)' }}>{avgEnergy.toFixed(1)}</strong>
              </span>
            )}
            <div className="big3-arrow" style={{ marginLeft: 'auto' }}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" width="12" height="12">
                <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </a>

        {/* ─ DO ─ */}
        <div className="big3-card glass-card-soft" style={{ cursor: 'default' }}>
          <div>
            <div className="big3-label">Do</div>
            <div className="big3-sublabel">
              {scheduledToday.length > 0
                ? `${doneToday.length} of ${scheduledToday.length} habits done`
                : 'Your habits for today'}
            </div>
          </div>

          <div className="big3-center" style={{ gap: '20px' }}>
            {topHabit ? (
              <>
                <div
                  className={`habit-checkbox${doneMap[topHabit.id] ? ' done' : ''}`}
                  onClick={() => toggleHabit(topHabit.id)}
                >
                  {doneMap[topHabit.id] && (
                    <svg viewBox="0 0 20 20" fill="none" stroke="var(--sage)" strokeWidth="2.2" width="24" height="24">
                      <path d="M4 10l5 5 7-8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', marginBottom: '6px' }}>{topHabit.emoji ?? '✦'}</div>
                  <div style={{ fontSize: '17px', fontWeight: 600, color: doneMap[topHabit.id] ? 'var(--ink-400)' : 'var(--ink-900)', textDecoration: doneMap[topHabit.id] ? 'line-through' : 'none', transition: 'color 0.2s' }}>
                    {topHabit.name}
                  </div>
                  {scheduledToday.length > 1 && (
                    <div style={{ fontSize: '12px', color: 'var(--ink-400)', marginTop: '4px' }}>
                      +{scheduledToday.length - 1} more habit{scheduledToday.length - 1 > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="font-serif-display" style={{ fontSize: '16px', fontStyle: 'italic', color: 'var(--ink-400)', textAlign: 'center' }}>
                No habits scheduled today
              </p>
            )}
          </div>

          <div className="big3-action">
            {scheduledToday.length > 0 && doneToday.length === scheduledToday.length ? (
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--sage)', letterSpacing: '0.08em' }}>
                All done today 🎉
              </span>
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--ink-400)' }}>
                {topStreak(habits) > 0 ? `${topStreak(habits)}-day streak` : 'Build your streak'}
              </span>
            )}
            <a href="/habits" className="big3-arrow" style={{ textDecoration: 'none' }}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" width="12" height="12">
                <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </div>

        {/* ─ TRACK ─ */}
        <a href="/goals" className="big3-card glass-card-soft" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div>
            <div className="big3-label">Track</div>
            <div className="big3-sublabel">
              {activeGoals.length > 0
                ? `${activeGoals.length} active goal${activeGoals.length > 1 ? 's' : ''}`
                : 'Your top goal'}
            </div>
          </div>

          <div className="big3-center">
            {topGoal ? (
              <>
                <RingProgress value={topGoal.progress_pct} size={120} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '17px', fontWeight: 600, color: 'var(--ink-900)', lineHeight: 1.3 }}>
                    {topGoal.title.length > 24 ? topGoal.title.slice(0, 24) + '…' : topGoal.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-500)', marginTop: '4px' }}>
                    {topGoal.category} · {topGoal.timeframe}
                  </div>
                </div>
              </>
            ) : (
              <p className="font-serif-display" style={{ fontSize: '16px', fontStyle: 'italic', color: 'var(--ink-400)', textAlign: 'center' }}>
                Set your first goal
              </p>
            )}
          </div>

          <div className="big3-action">
            {activeGoals.length > 1 && (
              <span style={{ fontSize: '12px', color: 'var(--ink-400)' }}>
                +{activeGoals.length - 1} more goal{activeGoals.length - 1 > 1 ? 's' : ''}
              </span>
            )}
            <div className="big3-arrow" style={{ marginLeft: 'auto' }}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" width="12" height="12">
                <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </a>

      </div>

      {/* ── Bottom CTA — only shown when not checked in ── */}
      {!checkin && (
        <a href="/checkin" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          padding: '16px', borderRadius: '16px',
          background: 'var(--sage)', color: 'oklch(0.15 0.02 165)',
          textDecoration: 'none', fontWeight: 700, fontSize: '15px',
          letterSpacing: '0.04em', flexShrink: 0,
          transition: 'opacity 0.18s',
        }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Start your day — Check in now
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      )}
    </div>
  )
}

function topStreak(habits: HabitWithLogs[]) {
  return Math.max(0, ...habits.map(h => h.streak))
}
