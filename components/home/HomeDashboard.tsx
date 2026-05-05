'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ThemeToggle from '@/components/layout/ThemeToggle'
import type { Goal, CheckIn, HabitWithLogs, Brief, MemoryNote } from '@/lib/types'

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

/* ── Live data shape (mirrors /api/status) ───────────── */

type LiveData = {
  energy:      number | null
  avgEnergy:   number | null
  habitsDone:  number
  habitsTotal: number
  habitsAll:   number
  goalsActive: number
  avgPct:      number | null
  mood:        string
  hasCheckin:  boolean
}

/* Seed LiveData from SSR props — no flicker on first paint */
function propsToLive(
  goals: Goal[],
  checkin: CheckIn | null,
  habits: HabitWithLogs[],
): LiveData {
  const today          = todayStr()
  const scheduledToday = habits.filter(h => h.isScheduledToday)
  const doneToday      = scheduledToday.filter(h => h.logs.some(l => l.logged_date === today))
  const active         = goals.filter(g => g.status === 'active')
  const avgPct         = active.length
    ? Math.round(active.reduce((s, g) => s + g.progress_pct, 0) / active.length)
    : null
  return {
    energy:      checkin?.energy_level ?? null,
    avgEnergy:   null,
    habitsDone:  doneToday.length,
    habitsTotal: scheduledToday.length,
    habitsAll:   habits.length,
    goalsActive: active.length,
    avgPct,
    mood:        moodWord(checkin?.mood_note ?? null),
    hasCheckin:  !!checkin,
  }
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
  href, label, mainVal, unit, sub, barPct, warm, moodDot, refreshing,
}: {
  href:       string
  label:      string
  mainVal:    string
  unit?:      string
  sub:        string
  barPct?:    number
  warm?:      boolean
  moodDot?:   boolean
  refreshing: boolean
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
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: '3px', marginBottom: '8px',
        opacity: refreshing ? 0.55 : 1,
        transition: 'opacity 0.3s',
      }}>
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
      <div style={{
        fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.3,
        marginBottom: barPct != null ? '14px' : '0',
      }}>
        {sub}
      </div>

      {/* Progress bar */}
      {barPct != null && <Bar pct={barPct} warm={warm} />}
    </a>
  )
}

/* ── Live dot indicator ───────────────────────────────── */

function LiveDot({ refreshing }: { refreshing: boolean }) {
  return (
    <div style={{
      width: '6px', height: '6px', borderRadius: '50%',
      background: refreshing ? 'var(--gold)' : 'var(--sage)',
      boxShadow: refreshing ? '0 0 6px var(--gold)' : '0 0 5px var(--sage)',
      transition: 'background 0.3s, box-shadow 0.3s',
      animation: refreshing ? 'homePulse 0.8s ease-in-out infinite' : 'none',
      flexShrink: 0,
    }} />
  )
}

/* ── Main component ────────────────────────────────────── */

type Props = {
  goals:        Goal[]
  checkin:      CheckIn | null
  habits:       HabitWithLogs[]
  brief?:       Brief | null
  userName?:    string | null
  memoryNotes?: MemoryNote[]
}

/* ── Pulse message builder ─────────────────────────────── */

type MessageSegment = { text: string; highlight?: 'sage' | 'gold' | 'muted' }
type MessageLine    = MessageSegment[]

function buildPulseMessage(opts: {
  firstName:    string
  hour:         number
  dayName:      string
  day:          number
  month:        string
  habitsTotal:  number
  goalsActive:  number
  firstGoal:    Goal | null
  energyScore:  number | null
  topNote:      MemoryNote | null
  brief:        Brief | null | undefined
}): MessageLine[] {
  const { firstName, hour, dayName, day, month,
          habitsTotal, goalsActive, firstGoal,
          energyScore, topNote, brief } = opts

  const greeting = hour < 12 ? 'Morning' : hour < 17 ? 'Hey' : 'Evening'
  const lines: MessageLine[] = []

  // ── Line 1: greeting + date ──
  lines.push([
    { text: `${greeting} ` },
    { text: firstName, highlight: 'sage' },
    { text: ', hope you slept well. Today is ' },
    { text: `${dayName}, ${day} ${month}`, highlight: 'muted' },
    { text: '.' },
  ])

  // ── Line 2: energy prediction ──
  const energy = energyScore ?? brief?.energy_score
  if (energy != null) {
    lines.push([
      { text: 'From your recent journal entries, I\'d expect your energy to be around a ' },
      { text: `${energy}`, highlight: 'gold' },
      { text: ' today — keep that in mind as you plan your morning.' },
    ])
  }

  // ── Line 3: memory note surface ──
  if (topNote) {
    const noteSnippet = topNote.content.length > 80
      ? topNote.content.slice(0, 77) + '…'
      : topNote.content
    lines.push([
      { text: 'I noticed you captured something worth revisiting: ' },
      { text: `"${noteSnippet}"`, highlight: 'muted' },
      { text: ' — might be worth acting on today.' },
    ])
  } else if (brief?.insight_text) {
    const snippet = brief.insight_text.split('.').slice(0, 1).join('.') + '.'
    lines.push([{ text: snippet }])
  }

  // ── Line 4: habits ──
  if (habitsTotal > 0) {
    lines.push([
      { text: 'Don\'t forget, you have ' },
      { text: `${habitsTotal} habit${habitsTotal !== 1 ? 's' : ''}`, highlight: 'gold' },
      { text: ' to check off today.' },
    ])
  }

  // ── Line 5: goals ──
  if (goalsActive > 0 && firstGoal) {
    lines.push([
      { text: 'Your goal of ' },
      { text: firstGoal.title, highlight: 'sage' },
      { text: ' is also getting some traction — keep the momentum going.' },
    ])
  } else if (goalsActive > 0) {
    lines.push([
      { text: `You have ` },
      { text: `${goalsActive} active goal${goalsActive !== 1 ? 's' : ''}`, highlight: 'sage' },
      { text: ' in progress — keep going.' },
    ])
  }

  // ── Line 6: closing ──
  lines.push([{ text: 'Let me know how the day goes when you\'re ready to check in.' }])

  return lines
}

/* ── Pulse message renderer ───────────────────────────── */

function PulseMessage({ lines }: { lines: MessageLine[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '620px' }}>
      {lines.map((line, i) => (
        <p key={i} style={{
          margin: 0,
          fontSize: 'clamp(14px, 1.8vw, 16px)',
          lineHeight: 1.75,
          color: 'var(--text-1)',
          fontWeight: i === 0 ? 500 : 400,
        }}>
          {line.map((seg, j) => {
            if (!seg.highlight) return <span key={j}>{seg.text}</span>
            if (seg.highlight === 'sage')
              return <span key={j} style={{ color: 'var(--sage)', fontWeight: 600 }}>{seg.text}</span>
            if (seg.highlight === 'gold')
              return <span key={j} style={{ color: 'var(--gold)', fontWeight: 600 }}>{seg.text}</span>
            return <span key={j} style={{ color: 'var(--text-0)', fontWeight: 500 }}>{seg.text}</span>
          })}
        </p>
      ))}
    </div>
  )
}

const POLL_MS = 60_000

export default function HomeDashboard({ goals, checkin, habits, brief, userName, memoryNotes }: Props) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => { setNow(new Date()) }, [])

  const hour      = now.getHours()
  const greeting  = getGreeting(hour)
  const week      = getWeekNumber(now)
  const season    = getSeason(now.getMonth())
  const { dayName, month, day } = formatDate(now)

  /* ── Live stats (seeded from SSR props instantly) ── */
  const [live, setLive]          = useState<LiveData>(() => propsToLive(goals, checkin, habits))
  const [refreshing, setRefresh] = useState(false)
  const fetchingRef              = useRef(false)

  const router = useRouter()

  const refresh = useCallback(async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    setRefresh(true)
    try {
      const res = await fetch('/api/status', { cache: 'no-store' })
      if (res.ok) setLive(await res.json())
      // Also invalidate the server component cache so SSR props re-fetch
      router.refresh()
    } catch { /* keep last known data */ }
    finally {
      fetchingRef.current = false
      setRefresh(false)
    }
  }, [router])

  useEffect(() => {
    refresh()
    const onVisible = () => { if (!document.hidden) refresh() }
    const onFocus   = () => refresh()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)
    const timer = setInterval(refresh, POLL_MS)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
      clearInterval(timer)
    }
  }, [refresh])

  /* ── Derived display values from live data ── */
  const energyVal     = live.energy ?? live.avgEnergy
  const energyDisplay = energyVal != null ? `${energyVal}` : '—'
  const energyUnit    = energyVal != null ? '/10' : undefined
  const energySub     = live.energy ? 'Today' : live.avgEnergy ? '7-day avg' : 'No check-in yet'
  const energyBarPct  = energyVal != null ? (energyVal / 10) * 100 : 0

  const habitsDisplay = live.habitsTotal > 0
    ? `${live.habitsDone}`
    : live.habitsAll > 0 ? `${live.habitsAll}` : '—'
  const habitsUnit    = live.habitsTotal > 0
    ? `/${live.habitsTotal}`
    : live.habitsAll > 0 ? ' total' : undefined
  const habitsSub     = live.habitsTotal > 0 ? 'done today' : 'habits'
  const habitsBarPct  = live.habitsTotal > 0 ? (live.habitsDone / live.habitsTotal) * 100 : 0

  const goalsDisplay  = live.goalsActive > 0 ? `${live.goalsActive}` : '—'
  const goalsSub      = live.goalsActive > 0
    ? live.avgPct != null ? `${live.avgPct}% avg` : 'active'
    : 'no active goals'
  const goalsBarPct   = live.avgPct ?? 0

  /* ── Pulse conversational message ── */
  const firstName   = userName?.split(' ')[0] ?? 'there'
  const firstGoal   = goals.find(g => g.status === 'active') ?? null
  const topNote     = memoryNotes?.[0] ?? null
  const energyScore = checkin?.energy_level ?? brief?.energy_score ?? null

  const pulseLines = buildPulseMessage({
    firstName,
    hour,
    dayName,
    day,
    month,
    habitsTotal: live.habitsTotal > 0 ? live.habitsTotal : live.habitsAll,
    goalsActive: live.goalsActive,
    firstGoal,
    energyScore,
    topNote,
    brief,
  })

  const stats = [
    {
      href: '/checkin', label: 'Energy',
      mainVal: energyDisplay, unit: energyUnit, sub: energySub,
      barPct: energyBarPct, warm: true,
    },
    {
      href: '/habits', label: 'Habits',
      mainVal: habitsDisplay, unit: habitsUnit, sub: habitsSub,
      barPct: habitsBarPct,
    },
    {
      href: '/goals', label: 'Goals',
      mainVal: goalsDisplay, sub: goalsSub,
      barPct: goalsBarPct,
    },
    {
      href: '/checkin', label: 'Mood',
      mainVal: live.mood,
      sub: live.hasCheckin ? 'last check-in' : 'no check-in yet',
      moodDot: true,
    },
  ]

  return (
    <div className="page-pad home-dashboard" style={{ maxWidth: '900px', width: '100%', marginLeft: 'auto', marginRight: 'auto' }}>

      {/* ── Header ── */}
      <header style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: '28px', gap: '16px',
        animation: 'fadeUp 0.35s var(--ease) both',
      }}>
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
            color: 'var(--text-0)', lineHeight: 1.05, margin: 0,
          }}>
            {dayName}, {month} {day}
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
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
          position: 'relative', overflow: 'hidden',
          marginBottom: '14px',
          animation: 'fadeUp 0.4s var(--ease) 0.05s both',
        }}
      >
        <div aria-hidden style={{
          position: 'absolute', top: '-80px', right: '-80px',
          width: '320px', height: '320px', borderRadius: '50%',
          background: 'radial-gradient(circle, oklch(0.78 0.09 75 / 0.10) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div aria-hidden style={{
          position: 'absolute', bottom: '-60px', left: '-60px',
          width: '240px', height: '240px', borderRadius: '50%',
          background: 'radial-gradient(circle, oklch(0.78 0.07 165 / 0.09) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: 'var(--card-overlay)', opacity: 0.28,
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* AI pulse badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            borderRadius: '20px', padding: '5px 13px 5px 9px', marginBottom: '22px',
          }}>
            <div style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: 'var(--sage)',
              animation: 'homePulse 2.4s ease-in-out infinite', flexShrink: 0,
            }} />
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.04em' }}>
              Locus AI · Today&apos;s pulse
            </span>
          </div>

          {/* Conversational message */}
          <div style={{ marginBottom: '28px' }}>
            <PulseMessage lines={pulseLines} />
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <Link
              href="/checkin"
              id="home-checkin-btn"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: 'var(--text-0)', color: 'var(--bg-0)',
                borderRadius: '14px', padding: '11px 22px',
                fontSize: '14px', fontWeight: 600, textDecoration: 'none',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              {live.hasCheckin ? 'View Brief' : 'Start Check-in'}
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>

            {!live.hasCheckin && (
              <Link
                href="/goals"
                id="home-skip-btn"
                style={{
                  display: 'inline-flex', alignItems: 'center',
                  background: 'transparent', color: 'var(--text-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px', padding: '11px 20px',
                  fontSize: '14px', fontWeight: 500, textDecoration: 'none',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
        <span style={{
          fontSize: '9px', fontWeight: 700, color: 'var(--text-3)',
          letterSpacing: '0.14em', textTransform: 'uppercase',
        }}>
          Today&apos;s Status
        </span>
        <LiveDot refreshing={refreshing} />
      </div>

      <div
        className="home-stat-grid"
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px',
          animation: 'fadeUp 0.45s var(--ease) 0.10s both',
        }}
      >
        {stats.map(s => (
          <StatPill key={s.label} {...s} refreshing={refreshing} />
        ))}
      </div>

      <style>{`
        @media (max-width: 600px) {
          .home-stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .home-pulse-card { padding: 24px !important; }
        }
        @keyframes homePulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
