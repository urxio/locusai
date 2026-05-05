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
        display: 'flex', flexDirection: 'column', gap: '0',
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

      {/* Label + optional dot */}
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

      {/* Value */}
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

      {/* Sub */}
      <div style={{ fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.3, marginBottom: barPct != null ? '14px' : '0' }}>
        {sub}
      </div>

      {/* Bar */}
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
  const timePart = hour < 12 ? 'The morning is clear.' : hour < 17 ? 'The afternoon is yours.' : 'Wind down with intention.'

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
        ? avgGoalPct > 0 ? `active · ${avgGoalPct}% avg` : 'active goals'
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
    <div className="page-pad" style={{ maxWidth: '900px' }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: '28px',
        gap: '16px',
      }}>
        {/* Left: greeting + date */}
        <div>
          <div style={{
            fontSize: '10px', fontWeight: 700,
            color: 'var(--text-3)', letterSpacing: '0.18em',
            textTransform: 'uppercase', marginBottom: '6px',
          }}>
            {greeting} · Today
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

        {/* Right: week + season + toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px',
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
      </div>

      {/* ── Pulse card ── */}
      <div
        className="glass-card"
        style={{
          padding: 'clamp(28px, 4vw, 48px)',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '16px',
        }}
      >
        {/* Ambient top-right glow */}
        <div aria-hidden style={{
          position: 'absolute', top: '-80px', right: '-80px',
          width: '340px', height: '340px', borderRadius: '50%',
          background: 'radial-gradient(circle, oklch(0.78 0.09 75 / 0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        {/* Ambient bottom-left glow */}
        <div aria-hidden style={{
          position: 'absolute', bottom: '-60px', left: '-60px',
          width: '260px', height: '260px', borderRadius: '50%',
          background: 'radial-gradient(circle, oklch(0.78 0.07 165 / 0.10) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Card overlay */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: 'var(--card-overlay)', opacity: 0.3,
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            padding: '5px 12px 5px 8px',
            marginBottom: '24px',
          }}>
            <div style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: 'var(--sage)',
              boxShadow: '0 0 6px var(--sage)',
              animation: 'pulse 2.4s ease-in-out infinite',
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: '11px', fontWeight: 600,
              color: 'var(--text-2)', letterSpacing: '0.04em',
            }}>
              Locus AI · Today&apos;s pulse
            </span>
          </div>

          {/* Main heading */}
          <div style={{
            fontSize: 'clamp(22px, 3.5vw, 32px)',
            fontWeight: 500,
            lineHeight: 1.35,
            color: 'var(--text-0)',
            marginBottom: '16px',
            fontFamily: 'var(--font-serif)',
            maxWidth: '640px',
          }}>
            {hasBothData ? (
              <>
                You have{' '}
                <span style={{ color: 'var(--sage)', fontWeight: 600 }}>{goalsCount} goal{goalsCount !== 1 ? 's' : ''}</span>
                {' '}and{' '}
                <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{habitsCount} habit{habitsCount !== 1 ? 's' : ''}</span>
                {' '}aligned for today. {timePart}
              </>
            ) : hasGoals ? (
              <>
                You have{' '}
                <span style={{ color: 'var(--sage)', fontWeight: 600 }}>{goalsCount} active goal{goalsCount !== 1 ? 's' : ''}</span>
                {' '}to work toward. {timePart}
              </>
            ) : hasHabits ? (
              <>
                You have{' '}
                <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{habitsCount} habit{habitsCount !== 1 ? 's' : ''}</span>
                {' '}scheduled for today. {timePart}
              </>
            ) : (
              <>
                Welcome back. Set your first{' '}
                <span style={{ color: 'var(--sage)', fontWeight: 600 }}>goal</span>
                {' '}or{' '}
                <span style={{ color: 'var(--gold)', fontWeight: 600 }}>habit</span>
                {' '}to get started.
              </>
            )}
          </div>

          {/* Subtitle */}
          <p style={{
            fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.7,
            margin: '0 0 32px', maxWidth: '520px',
          }}>
            {insightText ?? (
              hour < 12
                ? 'Your focus sessions are most productive in the morning. Consider tackling your deepest work before the afternoon dip.'
                : hour < 17
                ? 'Mid-day energy tends to hold up well. A good time to work through goal steps or connect with your team.'
                : 'End the day with a check-in to track your wins and set a clear intention for tomorrow.'
            )}
          </p>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {checkin ? (
              <Link
                href="/checkin"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  background: 'var(--text-0)', color: 'var(--bg-0)',
                  borderRadius: '14px', padding: '12px 22px',
                  fontSize: '14px', fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                View Brief
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
            ) : (
              <Link
                href="/checkin"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  background: 'var(--text-0)', color: 'var(--bg-0)',
                  borderRadius: '14px', padding: '12px 22px',
                  fontSize: '14px', fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                Start Check-in
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
            )}

            {!checkin && (
              <Link
                href="/goals"
                style={{
                  display: 'inline-flex', alignItems: 'center',
                  background: 'transparent',
                  color: 'var(--text-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px', padding: '12px 20px',
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
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '10px',
      }}
        className="home-stat-grid"
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
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px var(--sage); }
          50% { opacity: 0.5; box-shadow: 0 0 2px var(--sage); }
        }
      `}</style>
    </div>
  )
}
