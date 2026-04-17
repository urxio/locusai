'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Goal, CheckIn, HabitWithLogs } from '@/lib/types'

/* ── server-prop shape (for SSR seed) ────────────────── */

type Props = {
  goals:     Goal[]
  checkin:   CheckIn | null
  avgEnergy: number | null
  habits:    HabitWithLogs[]
}

/* ── live data shape (from /api/status) ──────────────── */

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

/* ── derive display values from live data ────────────── */

function toDisplayStats(d: LiveData) {
  const energyVal     = d.energy ?? d.avgEnergy
  const energyDisplay = energyVal != null ? `${energyVal} / 10` : '—'
  const energySub     = d.energy ? 'Today' : d.avgEnergy ? '7-day avg' : 'No check-in'

  const habitsDisplay = d.habitsTotal > 0
    ? `${d.habitsDone} / ${d.habitsTotal}`
    : d.habitsAll > 0 ? `${d.habitsAll} total` : '—'
  const habitsSub     = d.habitsTotal > 0 ? 'done today' : 'habits'

  const goalsDisplay = d.goalsActive > 0 ? `${d.goalsActive}` : '—'
  const goalsSub     = d.avgPct != null
    ? `active · ${d.avgPct}% avg`
    : d.goalsActive === 1 ? 'active goal' : 'active goals'

  const moodSub = d.hasCheckin ? 'last check-in' : 'no check-in yet'

  return {
    energyVal:    energyVal ?? 0,
    energyDisplay,
    energySub,
    habitsDisplay,
    habitsSub,
    habitsTotal:  d.habitsTotal,
    habitsDone:   d.habitsDone,
    goalsDisplay,
    goalsSub,
    avgPct:       d.avgPct ?? 0,
    mood:         d.mood,
    moodSub,
  }
}

/* ── seed live data from server props (no fetch needed on first paint) */

function todayStr() {
  return new Date().toISOString().split('T')[0]
}
function moodWord(note: string | null): string {
  if (!note) return '—'
  const cleaned = note.replace(/^(feeling|i('m| am|feel)\s+)/i, '').trim()
  return cleaned.split(/[\s,;.]+/).filter(Boolean).slice(0, 2).join(' ') || '—'
}

function propsToLive(goals: Goal[], checkin: CheckIn | null, avgEnergy: number | null, habits: HabitWithLogs[]): LiveData {
  const today          = todayStr()
  const scheduledToday = habits.filter(h => h.isScheduledToday)
  const doneToday      = scheduledToday.filter(h => h.logs.some(l => l.logged_date === today))
  const active         = goals.filter(g => g.status === 'active')
  const avgPct         = active.length
    ? Math.round(active.reduce((s, g) => s + g.progress_pct, 0) / active.length)
    : null
  return {
    energy:      checkin?.energy_level ?? null,
    avgEnergy:   avgEnergy,
    habitsDone:  doneToday.length,
    habitsTotal: scheduledToday.length,
    habitsAll:   habits.length,
    goalsActive: active.length,
    avgPct,
    mood:        moodWord(checkin?.mood_note ?? null),
    hasCheckin:  !!checkin,
  }
}

/* ── segment bar ─────────────────────────────────────── */

function SegmentBar({
  total,
  filled,
  color   = '#4ade80',
  maxBars = 12,
  loading = false,
}: {
  total:    number
  filled:   number
  color?:   string
  maxBars?: number
  loading?: boolean
}) {
  const bars     = Math.min(Math.max(total, 1), maxBars)
  const litCount = Math.min(Math.round((filled / Math.max(total, 1)) * bars), bars)

  return (
    <div style={{ display: 'flex', gap: '3px', alignItems: 'stretch', width: '100%', marginTop: '12px' }}>
      {Array.from({ length: bars }).map((_, i) => {
        const isLit     = i < litCount
        const isCurrent = i === litCount && litCount < bars
        return (
          <div
            key={i}
            style={{
              flex:          1,
              height:        '13px',
              borderRadius:  '3px',
              background:    loading
                ? 'rgba(255,255,255,0.05)'
                : isLit ? color : 'rgba(255,255,255,0.07)',
              boxShadow:     !loading && isLit
                ? `0 0 7px ${color}bb, 0 0 2px ${color}`
                : 'none',
              outline:       !loading && isCurrent
                ? '1.5px solid rgba(255,255,255,0.22)'
                : 'none',
              outlineOffset: '1px',
              transition:    'background 0.35s, box-shadow 0.35s',
              animation:     loading ? 'statusPulse 1.4s ease-in-out infinite' : 'none',
              animationDelay: loading ? `${i * 60}ms` : '0ms',
            }}
          />
        )
      })}
    </div>
  )
}

/* ── single pill card ────────────────────────────────── */

type PillConfig = {
  href:       string
  icon:       React.ReactNode
  iconBg:     string
  label:      string
  value:      string
  sub:        string
  barTotal?:  number
  barFilled?: number
  barColor?:  string
  loading?:   boolean
}

function Pill({ href, icon, iconBg, label, value, sub, barTotal, barFilled, barColor, loading }: PillConfig) {
  const hasBars = barTotal != null && barFilled != null && barColor != null
  return (
    <a
      href={href}
      style={{
        display:        'flex',
        flexDirection:  'column',
        flex:           '0 0 auto',
        minWidth:       '148px',
        background:     'var(--bg-1)',
        border:         '1px solid var(--border)',
        borderRadius:   '18px',
        padding:        '14px 14px 13px',
        textDecoration: 'none',
        cursor:         'pointer',
        transition:     'border-color 0.18s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-md)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '9px' }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '8px',
          background: iconBg, display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {icon}
        </div>
        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {label}
        </span>
      </div>

      {/* Value */}
      <div style={{
        fontSize: '21px', fontWeight: 700, color: 'var(--text-0)',
        lineHeight: 1, letterSpacing: '-0.02em',
        opacity: loading ? 0.4 : 1, transition: 'opacity 0.3s',
      }}>
        {value}
      </div>

      {/* Sub */}
      <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '3px', lineHeight: 1.3, flex: 1 }}>
        {sub}
      </div>

      {/* Bars */}
      {hasBars && (
        <SegmentBar total={barTotal!} filled={barFilled!} color={barColor!} loading={loading} />
      )}
    </a>
  )
}

/* ── icons ───────────────────────────────────────────── */

function EnergyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2L4 9h5l-2 5 7-8H9l2-4z" fill="#4ade8033" stroke="#4ade80" strokeWidth="1.8" />
    </svg>
  )
}
function HabitsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="8" cy="8" r="5.5" />
      <path d="M5.5 8.2l2 1.8 3-3.5" />
    </svg>
  )
}
function GoalsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#d4a853" strokeWidth="1.7" strokeLinecap="round">
      <circle cx="8" cy="8" r="6" />
      <circle cx="8" cy="8" r="3" />
      <circle cx="8" cy="8" r="0.8" fill="#d4a853" />
    </svg>
  )
}
function MoodIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#9080c8" strokeWidth="1.7" strokeLinecap="round">
      <path d="M2 2.5h8l3 2.5-3 2.5H2z" />
      <path d="M5 10.5h6l3 2-3 2H5z" opacity="0.55" />
    </svg>
  )
}

/* ── last-updated dot ────────────────────────────────── */

function LiveDot({ refreshing }: { refreshing: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <div style={{
        width: '5px', height: '5px', borderRadius: '50%',
        background: refreshing ? 'var(--gold)' : 'var(--sage)',
        boxShadow:  refreshing ? '0 0 6px var(--gold)' : '0 0 5px var(--sage)',
        transition: 'background 0.3s, box-shadow 0.3s',
        animation:  refreshing ? 'statusPulse 0.8s ease-in-out infinite' : 'none',
      }} />
    </div>
  )
}

/* ── main strip ──────────────────────────────────────── */

const POLL_INTERVAL_MS = 60_000 // re-fetch every 60 s while page is open

export default function StatusStrip({ goals, checkin, avgEnergy, habits }: Props) {
  const [live, setLive]           = useState<LiveData>(() => propsToLive(goals, checkin, avgEnergy, habits))
  const [refreshing, setRefresh]  = useState(false)
  const fetchingRef               = useRef(false)

  const refresh = useCallback(async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    setRefresh(true)
    try {
      const res = await fetch('/api/status', { cache: 'no-store' })
      if (res.ok) {
        const data: LiveData = await res.json()
        setLive(data)
      }
    } catch { /* silent — keep showing last known data */ }
    finally {
      fetchingRef.current = false
      setRefresh(false)
    }
  }, [])

  useEffect(() => {
    // Fetch fresh data immediately on mount
    refresh()

    // Re-fetch when the user tabs back or the window regains focus
    const onVisible = () => { if (!document.hidden) refresh() }
    const onFocus   = () => refresh()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)

    // Poll while the page is open
    const timer = setInterval(refresh, POLL_INTERVAL_MS)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
      clearInterval(timer)
    }
  }, [refresh])

  const s = toDisplayStats(live)

  const pills: PillConfig[] = [
    {
      href:      '/checkin',
      icon:      <EnergyIcon />,
      iconBg:    'rgba(74,222,128,0.12)',
      label:     'Energy',
      value:     s.energyDisplay,
      sub:       s.energySub,
      barTotal:  10,
      barFilled: Math.round(s.energyVal),
      barColor:  '#4ade80',
      loading:   refreshing,
    },
    {
      href:      '/habits',
      icon:      <HabitsIcon />,
      iconBg:    'rgba(74,222,128,0.10)',
      label:     'Habits',
      value:     s.habitsDisplay,
      sub:       s.habitsSub,
      barTotal:  Math.max(s.habitsTotal, 1),
      barFilled: s.habitsDone,
      barColor:  '#4ade80',
      loading:   refreshing,
    },
    {
      href:      '/goals',
      icon:      <GoalsIcon />,
      iconBg:    'rgba(212,168,83,0.12)',
      label:     'Goals',
      value:     s.goalsDisplay,
      sub:       s.goalsSub,
      barTotal:  100,
      barFilled: s.avgPct,
      barColor:  '#d4a853',
      loading:   refreshing,
    },
    {
      href:   '/checkin',
      icon:   <MoodIcon />,
      iconBg: 'rgba(144,128,200,0.12)',
      label:  'Mood',
      value:  s.mood,
      sub:    s.moodSub,
      loading: refreshing,
    },
  ]

  return (
    <div style={{ marginTop: '20px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
        <span style={{
          fontSize: '10px', fontWeight: 700, color: 'var(--text-3)',
          letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          Today&apos;s Status
        </span>
        <LiveDot refreshing={refreshing} />
      </div>

      {/* Horizontal scroll row */}
      <div style={{
        display:                 'flex',
        gap:                     '10px',
        overflowX:               'auto',
        paddingBottom:           '4px',
        scrollbarWidth:          'none',
        WebkitOverflowScrolling: 'touch',
        marginLeft:              '-2px',
        paddingLeft:             '2px',
      } as React.CSSProperties}>
        {pills.map(p => <Pill key={p.label} {...p} />)}
      </div>

      <style>{`
        @keyframes statusPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
      `}</style>
    </div>
  )
}
