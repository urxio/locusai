'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ThemeToggle from '@/components/layout/ThemeToggle'
import type { Goal, CheckIn, HabitWithLogs, Brief } from '@/lib/types'

/* ── Helpers ─────────────────────────────────────────── */

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function getSeason(month: number): string {
  if (month < 3 || month === 11) return 'Winter'
  if (month < 6) return 'Spring'
  if (month < 9) return 'Summer'
  return 'Autumn'
}

function formatDate(date: Date): { dayName: string; month: string; day: number } {
  return {
    dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
    month:   date.toLocaleDateString('en-US', { month: 'long' }),
    day:     date.getDate(),
  }
}

function moodWord(note: string | null): string {
  if (!note) return '—'
  const cleaned = note.replace(/^(feeling|i('m| am|feel)\s+)/i, '').trim()
  return cleaned.split(/[\s,;.]+/).filter(Boolean).slice(0, 2).join(' ') || '—'
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

/* ── Progress bar ─────────────────────────────────────── */

function Bar({ pct, warm }: { pct: number; warm?: boolean }) {
  return (
    <div style={{
      height: '3px', borderRadius: '2px',
      background: 'var(--progress-track)', overflow: 'hidden',
    }}>
      <div style={{
        height: '100%', borderRadius: '2px',
        width: `${Math.min(Math.max(pct, 0), 100)}%`,
        background: warm
          ? 'linear-gradient(to right, var(--sun, #f0dfa0), var(--sea-soft, #c8ddd7))'
          : 'linear-gradient(to right, var(--sea-soft, #c8ddd7), var(--sage))',
        transition: 'width 0.6s var(--ease)',
      }} />
    </div>
  )
}

/* ── Stat pill ────────────────────────────────────────── */

function StatPill({
  href, label, mainVal, unit, sub, barPct, warm, moodDot,
}: {
  href: string
  label: string
  mainVal: string
  unit?: string
  sub: string
  barPct?: number
  warm?: boolean
  moodDot?: boolean
}) {
  return (
    <a
      href={href}
      style={{
        display: 'flex', flexDirection: 'column',
        flex: 1, minWidth: 0,
        background: 'var(--bg-1)',
        borderRadius: '24px',
        padding: '20px 20px 18px',
        textDecoration: 'none',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
        transition: 'transform 0.18s var(--ease), box-shadow 0.25s var(--ease)',
        gap: 0,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)' }}
    >
      {/* Glow blob */}
      <div style={{
        position: 'absolute', top: '-20px', right: '-20px',
        width: '80px', height: '80px', borderRadius: '50%',
        background: warm ? 'rgba(240,223,160,0.16)' : 'rgba(200,221,215,0.16)',
        filter: 'blur(20px)', pointerEvents: 'none',
      }} />

      {/* Label + optional mood dot */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <span style={{
          fontSize: '9px', fontWeight: 700,
          color: 'var(--text-3)', letterSpacing: '0.20em',
          textTransform: 'uppercase',
        }}>
          {label}
        </span>
        {moodDot && (
          <div style={{
            width: '22px', height: '22px', borderRadius: '50%',
            border: '1px solid var(--border-md)',
            background: 'var(--surface-strong-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: '9px', height: '9px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--sun, #f0dfa0), var(--sea-soft, #c8ddd7))',
            }} />
          </div>
        )}
      </div>

      {/* Value row */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', marginBottom: '8px' }}>
        <span style={{
          fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em',
          color: 'var(--text-0)', lineHeight: 1,
        }}>
          {mainVal}
        </span>
        {unit && (
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-3)' }}>
            {unit}
          </span>
        )}
      </div>

      {/* Sub label */}
      <div style={{ fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.3, marginBottom: barPct != null ? '14px' : '0' }}>
        {sub}
      </div>

      {/* Progress bar */}
      {barPct != null && <Bar pct={barPct} warm={warm} />}
    </a>
  )
}

/* ── Main component ────────────────────────────────────── */

type Props = {
  goals:   Goal[]
  checkin: CheckIn | null
  habits:  HabitWithLogs[]
  brief?:  Brief | null
}

export default function HomeDashboard({ goals, checkin, habits, brief }: Props) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    /* update greeting/date after hydration so server/client match */
    setNow(new Date())
  }, [])

  const hour      = now.getHours()
  const greeting  = getGreeting(hour)
  const week      = getWeekNumber(now)
  const season    = getSeason(now.getMonth())
  const { dayName, month, day } = formatDate(now)

  /* ── Derived stats ── */
  const today           = todayStr()
  const activeGoals     = goals.filter(g => g.status === 'active')
  const scheduledHabits = habits.filter(h => h.isScheduledToday)
  const doneHabits      = scheduledHabits.filter(h => h.logs.some(l => l.logged_date === today))

  const goalsCount  = activeGoals.length
  const habitsCount = scheduledHabits.length
  const habitsDone  = doneHabits.length

  const avgGoalPct = activeGoals.length
    ? Math.round(activeGoals.reduce((s, g) => s + g.progress_pct, 0) / activeGoals.length)
    : 0

  const energyLevel = checkin?.energy_level ?? null
  const mood        = moodWord(checkin?.mood_note ?? null)

  /* ── Hero pulse text ── */
  const timePart = hour < 12
    ? 'The morning is clear.'
    : hour < 17
    ? 'The afternoon is yours.'
    : 'Wind down with intention.'

  const hasBothData = goalsCount > 0 && habitsCount > 0
  const hasGoals    = goalsCount > 0
  const hasHabits   = habitsCount > 0

  /* ── Brief insight snippet ── */
  const insightText = brief?.insight_text
    ? brief.insight_text.split('.').slice(0, 2).join('.') + '.'
    : null

  /* ── Stat pill data ── */
  const stats = [
    {
      href: '/checkin', label: 'Energy',
      mainVal: energyLevel != null ? `${energyLevel}` : '—',
      unit: energyLevel != null ? '/10' : undefined,
      sub: energyLevel != null ? 'Today' : 'No check-in yet',
      barPct: energyLevel != null ? (energyLevel / 10) * 100 : 0,
      warm: true,
    },
    {
      href: '/habits', label: 'Habits',
      mainVal: habitsCount > 0 ? `${habitsDone}` : habits.length > 0 ? `${habits.length}` : '—',
      unit: habitsCount > 0 ? `/${habitsCount}` : habitsCount === 0 && habits.length > 0 ? ' total' : undefined,
      sub: habitsCount > 0 ? 'done today' : 'habits',
      barPct: habitsCount > 0 ? (habitsDone / habitsCount) * 100 : 0,
    },
    {
      href: '/goals', label: 'Goals',
      mainVal: goalsCount > 0 ? `${goalsCount}` : '—',
      sub: goalsCount > 0
        ? avgGoalPct > 0 ? `${avgGoalPct}% avg` : 'active'
        : 'no active goals',
      barPct: avgGoalPct,
    },
    {
      href: '/checkin', label: 'Mood',
      mainVal: mood,
      sub: checkin ? 'last check-in' : 'no check-in yet',
      moodDot: true,
    },
  ]

  return (
    <div className="page-pad home-dashboard" style={{ maxWidth: '900px' }}>

      {/* ── Header ── */}
      <header style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: '28px', gap: '16px',
        animation: 'fadeUp 0.35s var(--ease) both',
      }}>
        {/* Left: eyebrow + date */}
        <div>
          <div style={{
            fontSize: '10px', fontWeight: 700,
            color: 'var(--text-3)', letterSpacing: '0.18em',
            textTransform: 'uppercase', marginBottom: '5px',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <span>{greeting}</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>Today</span>
          </div>
          <h1 style={{
            fontSize: 'clamp(28px, 5vw, 42px)',
            fontWeight: 700, letterSpacing: '-0.03em',
            color: 'var(--text-0)', lineHeight: 1.05,
            margin: 0,
          }}>
            {dayName}, {month} {day}
          </h1>
        </div>

        {/* Right: week + season + theme toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '14px',
          flexShrink: 0,
        }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.2 }}>
              Week {week}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>
              {season} · Clear sky
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* ── Pulse card ── */}
      <div
        className="glass-card home-pulse-card"
        style={{
          padding: 'clamp(28px, 4vw, 44px)',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '14px',
          animation: 'fadeUp 0.4s var(--ease) 0.05s both',
        }}
      >
        {/* Ambient top-right warm glow */}
        <div aria-hidden style={{
          position: 'absolute', top: '-80px', right: '-80px',
          width: '320px', height: '320px', borderRadius: '50%',
          background: 'radial-gradient(circle, oklch(0.78 0.09 75 / 0.10) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        {/* Ambient bottom-left sage glow */}
        <div aria-hidden style={{
          position: 'absolute', bottom: '-60px', left: '-60px',
          width: '240px', height: '240px', borderRadius: '50%',
          background: 'radial-gradient(circle, oklch(0.78 0.07 165 / 0.09) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        {/* Card overlay shimmer */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: 'var(--card-overlay)', opacity: 0.28,
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* ── AI pulse badge ── */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            padding: '5px 13px 5px 9px',
            marginBottom: '22px',
          }}>
            <div style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: 'var(--sage)',
              animation: 'homePulse 2.4s ease-in-out infinite',
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: '11px', fontWeight: 600,
              color: 'var(--text-2)', letterSpacing: '0.04em',
            }}>
              Locus AI · Today&apos;s pulse
            </span>
          </div>

          {/* ── Main serif headline ── */}
          <div style={{
            fontSize: 'clamp(20px, 3.2vw, 30px)',
            fontWeight: 500,
            lineHeight: 1.4,
            color: 'var(--text-0)',
            marginBottom: '14px',
            fontFamily: 'var(--font-serif)',
            maxWidth: '640px',
          }}>
            {hasBothData ? (
              <>
                You have{' '}
                <a href="/goals" style={{ color: 'var(--sage)', fontWeight: 700, textDecoration: 'none' }}>
                  {goalsCount} {goalsCount !== 1 ? 'goals' : 'goal'}
                </a>
                {' '}and{' '}
                <a href="/habits" style={{ color: 'var(--gold)', fontWeight: 700, textDecoration: 'none' }}>
                  {habitsCount} {habitsCount !== 1 ? 'habits' : 'habit'}
                </a>
                {' '}aligned for today. {timePart}
              </>
            ) : hasGoals ? (
              <>
                You have{' '}
                <a href="/goals" style={{ color: 'var(--sage)', fontWeight: 700, textDecoration: 'none' }}>
                  {goalsCount} active {goalsCount !== 1 ? 'goals' : 'goal'}
                </a>
                {' '}to work toward. {timePart}
              </>
            ) : hasHabits ? (
              <>
                You have{' '}
                <a href="/habits" style={{ color: 'var(--gold)', fontWeight: 700, textDecoration: 'none' }}>
                  {habitsCount} {habitsCount !== 1 ? 'habits' : 'habit'}
                </a>
                {' '}scheduled for today. {timePart}
              </>
            ) : (
              <>
                Welcome back. Set your first{' '}
                <a href="/goals" style={{ color: 'var(--sage)', fontWeight: 700, textDecoration: 'none' }}>goal</a>
                {' '}or{' '}
                <a href="/habits" style={{ color: 'var(--gold)', fontWeight: 700, textDecoration: 'none' }}>habit</a>
                {' '}to get started.
              </>
            )}
          </div>

          {/* ── Subtitle / insight ── */}
          <p style={{
            fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.75,
            margin: '0 0 28px', maxWidth: '520px',
          }}>
            {insightText ?? (
              hour < 12
                ? 'Your focus sessions have been most productive before 10 am. Consider scheduling your deepest work before the afternoon dip.'
                : hour < 17
                ? 'Mid-day energy tends to hold up well. A good time to work through goal steps or connect with your team.'
                : 'End the day with a check-in to track your wins and set a clear intention for tomorrow.'
            )}
          </p>

          {/* ── CTA buttons ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {checkin ? (
              <Link
                href="/checkin"
                id="home-view-brief-btn"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  background: 'var(--text-0)', color: 'var(--bg-0)',
                  borderRadius: '14px', padding: '11px 22px',
                  fontSize: '14px', fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                View Brief
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            ) : (
              <Link
                href="/checkin"
                id="home-start-checkin-btn"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  background: 'var(--text-0)', color: 'var(--bg-0)',
                  borderRadius: '14px', padding: '11px 22px',
                  fontSize: '14px', fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                Start Check-in
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            )}

            {!checkin && (
              <Link
                href="/goals"
                id="home-skip-btn"
                style={{
                  display: 'inline-flex', alignItems: 'center',
                  background: 'transparent',
                  color: 'var(--text-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px', padding: '11px 20px',
                  fontSize: '14px', fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'var(--bg-2)'
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-md)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                }}
              >
                Skip today
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Status pills ── */}
      <div
        className="home-stat-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px',
          animation: 'fadeUp 0.45s var(--ease) 0.10s both',
        }}
      >
        {stats.map(s => (
          <StatPill key={s.label} {...s} />
        ))}
      </div>

      <style>{`
        @media (max-width: 600px) {
          .home-stat-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .home-pulse-card {
            padding: 24px !important;
          }
        }
        @keyframes homePulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px var(--sage); }
          50%       { opacity: 0.45; box-shadow: 0 0 2px var(--sage); }
        }
      `}</style>
    </div>
  )
}
