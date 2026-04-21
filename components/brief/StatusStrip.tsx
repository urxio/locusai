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

/* ── simple progress bar ─────────────────────────────── */

function ProgressBar({
  pct,
  color   = '#4ade80',
  loading = false,
}: {
  pct:     number
  color?:  string
  loading?: boolean
}) {
  return (
    <div style={{ marginTop: '12px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <div style={{
        height:     '100%',
        width:      loading ? '30%' : `${Math.min(Math.max(pct, 0), 100)}%`,
        borderRadius: '2px',
        background: color,
        transition: loading ? 'none' : 'width 0.5s var(--ease)',
        animation:  loading ? 'statusPulse 1.4s ease-in-out infinite' : 'none',
      }} />
    </div>
  )
}

/* ── single stat card ────────────────────────────────── */

type PillConfig = {
  href:      string
  label:     string
  value:     string
  sub:       string
  barPct?:   number
  barColor?: string
  loading?:  boolean
  moodDot?:  boolean
}

function Pill({ href, label, value, sub, barPct, barColor, loading, moodDot }: PillConfig) {
  return (
    <a
      href={href}
      style={{
        display:        'flex',
        flexDirection:  'column',
        flex:           1,
        minWidth:       0,
        background:     'var(--bg-1)',
        border:         '1px solid var(--border)',
        borderRadius:   '16px',
        padding:        '16px',
        textDecoration: 'none',
        cursor:         'pointer',
        transition:     'border-color 0.18s',
        position:       'relative',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-md)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      {/* Label */}
      <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>
        {label}
      </span>

      {/* Value */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', flex: 1 }}>
        <span style={{
          fontFamily:   'var(--font-serif)',
          fontSize:     '32px',
          fontWeight:   500,
          color:        'var(--text-0)',
          lineHeight:   1,
          letterSpacing:'-0.02em',
          opacity:      loading ? 0.4 : 1,
          transition:   'opacity 0.3s',
        }}>
          {value.split('/')[0].split(' ')[0]}
        </span>
        {value.includes('/') && (
          <span style={{ fontSize: '13px', color: 'var(--text-3)', fontWeight: 400 }}>
            /{value.split('/')[1]}
          </span>
        )}
      </div>

      {/* Sub */}
      <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px', lineHeight: 1.3 }}>
        {sub}
      </div>

      {/* Mood dot indicator */}
      {moodDot && (
        <div style={{
          position: 'absolute', top: '14px', right: '14px',
          width: '20px', height: '20px', borderRadius: '50%',
          border: '1.5px solid var(--border)', background: 'transparent',
        }} />
      )}

      {/* Progress bar */}
      {barPct != null && barColor && (
        <ProgressBar pct={barPct} color={barColor} loading={loading} />
      )}
    </a>
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
      href:     '/checkin',
      label:    'Energy',
      value:    s.energyDisplay,
      sub:      s.energySub,
      barPct:   (s.energyVal / 10) * 100,
      barColor: '#d4a853',
      loading:  refreshing,
    },
    {
      href:     '/habits',
      label:    'Habits',
      value:    s.habitsDisplay,
      sub:      s.habitsSub,
      barPct:   s.habitsTotal > 0 ? (s.habitsDone / s.habitsTotal) * 100 : 0,
      barColor: 'var(--sage)',
      loading:  refreshing,
    },
    {
      href:     '/goals',
      label:    'Goals',
      value:    s.goalsDisplay,
      sub:      s.goalsSub,
      barPct:   s.avgPct,
      barColor: 'var(--sage)',
      loading:  refreshing,
    },
    {
      href:    '/checkin',
      label:   'Mood',
      value:   s.mood,
      sub:     s.moodSub,
      loading: refreshing,
      moodDot: true,
    },
  ]

  return (
    <div style={{ marginTop: '16px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
        <span style={{
          fontSize: '9px', fontWeight: 700, color: 'var(--text-3)',
          letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          Today&apos;s Status
        </span>
        <LiveDot refreshing={refreshing} />
      </div>

      {/* 4-column grid */}
      <div style={{ display: 'flex', gap: '10px' }}>
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
