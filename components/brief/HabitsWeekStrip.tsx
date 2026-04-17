'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { HabitWithLogs } from '@/lib/types'

/* ── slim API shape (from /api/habits/week) ──────────── */

type HabitWeekData = {
  id:           string
  name:         string
  emoji:        string
  frequency:    string
  days_of_week: number[] | null
  streak:       number
  logs:         { logged_date: string }[]
}

/* ── props ───────────────────────────────────────────── */

type Props = {
  habits: HabitWithLogs[]
}

/* ── constants ───────────────────────────────────────── */

// Week starts Monday — Mon Tue Wed Thu Fri Sat Sun
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const HABIT_COLORS = [
  '#7a9e8a', '#d4a853', '#7090c0', '#c09040',
  '#9080b0', '#50a0a0', '#c07080', '#70a070',
]

/* ── helpers ─────────────────────────────────────────── */

function habitColor(id: string): string {
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff
  return HABIT_COLORS[hash % HABIT_COLORS.length]
}

/** Local date string (YYYY-MM-DD) — never use toISOString() which gives UTC */
function localDateStr(d: Date): string {
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

/**
 * Returns 7 days Mon→Sun for the current local week.
 * dow values follow JS convention: 0=Sun, 1=Mon … 6=Sat.
 */
function getWeekDays(): { date: string; dow: number }[] {
  const now            = new Date()
  const dayOfWeek      = now.getDay()                  // 0=Sun … 6=Sat (local)
  const daysSinceMonday = (dayOfWeek + 6) % 7          // 0=Mon … 6=Sun
  const days: { date: string; dow: number }[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() - daysSinceMonday + i)
    const dow = (1 + i) % 7                            // 1=Mon…6=Sat, 0=Sun
    days.push({ date: localDateStr(d), dow })
  }
  return days
}

function isScheduledOn(dow: number, daysOfWeek: number[] | null): boolean {
  if (!daysOfWeek || daysOfWeek.length === 0) return true
  return daysOfWeek.includes(dow)
}

/** Convert server props → HabitWeekData[] for the initial seed */
function propsToWeekData(habits: HabitWithLogs[]): HabitWeekData[] {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 6)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  return habits.map(h => ({
    id:           h.id,
    name:         h.name,
    emoji:        h.emoji,
    frequency:    h.frequency,
    days_of_week: h.days_of_week,
    streak:       h.streak,
    logs:         h.logs
      .filter(l => l.logged_date >= cutoffStr)
      .map(l => ({ logged_date: l.logged_date })),
  }))
}

/* ── day cell ────────────────────────────────────────── */

type CellState = 'done' | 'missed' | 'unscheduled' | 'future'

function DayCell({ label, state, isToday, color }: {
  label:   string
  state:   CellState
  isToday: boolean
  color:   string
}) {
  const isDone        = state === 'done'
  const isMissed      = state === 'missed'
  const isUnscheduled = state === 'unscheduled'
  const isFuture      = state === 'future'

  const cellBg = isDone        ? color
    : isMissed                 ? 'rgba(255,255,255,0.06)'
    : isUnscheduled            ? 'transparent'
    : isFuture                 ? 'rgba(255,255,255,0.04)'
    :                            'rgba(255,255,255,0.06)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', flex: 1 }}>
      <span style={{
        fontSize: '9px', fontWeight: isToday ? 800 : 600, lineHeight: 1,
        color: isToday ? 'var(--text-1)' : 'var(--text-3)', letterSpacing: '0.04em',
      }}>
        {label}
      </span>
      <div style={{
        width: '100%', height: '6px', borderRadius: '5px',
        background:  cellBg,
        boxShadow:   isDone ? `0 0 8px ${color}cc, 0 0 2px ${color}` : 'none',
        border:      isToday
          ? `1.5px solid rgba(255,255,255,${isDone ? '0.35' : '0.18'})`
          : isMissed
          ? '1px solid rgba(255,255,255,0.08)'
          : isUnscheduled
          ? '1px dashed rgba(255,255,255,0.07)'
          : '1px solid transparent',
        transition: 'background 0.3s, box-shadow 0.3s',
      }} />
    </div>
  )
}

/* ── single habit row ────────────────────────────────── */

function HabitRow({ habit, weekDays, todayDate }: {
  habit:     HabitWeekData
  weekDays:  { date: string; dow: number }[]
  todayDate: string
}) {
  const color    = habitColor(habit.id)
  const logDates = new Set(habit.logs.map(l => l.logged_date))

  const cells = weekDays.map(({ date, dow }) => {
    const scheduled = isScheduledOn(dow, habit.days_of_week)
    const done      = logDates.has(date)
    const isFuture  = date > todayDate
    const isToday   = date === todayDate
    let state: CellState
    if (!scheduled)    state = 'unscheduled'
    else if (done)     state = 'done'
    else if (isFuture) state = 'future'
    else               state = 'missed'
    return { date, state, isToday }
  })

  const doneThisWeek   = cells.filter(c => c.state === 'done').length
  const totalScheduled = cells.filter(c => c.state !== 'unscheduled').length

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '10px',
      padding: '14px 14px 13px',
      background: 'var(--bg-1)', border: '1px solid var(--border)',
      borderRadius: '16px',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: `${color}22`, border: `1px solid ${color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px', flexShrink: 0,
        }}>
          {habit.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '13px', fontWeight: 600, color: 'var(--text-0)',
            lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {habit.name}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>
            {habit.frequency}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 500 }}>
            {doneThisWeek}/{totalScheduled}
          </span>
          {habit.streak > 0 && (
            <span style={{
              fontSize: '10px', fontWeight: 700, color,
              background: `${color}18`, border: `1px solid ${color}33`,
              borderRadius: '10px', padding: '2px 7px', letterSpacing: '0.02em',
            }}>
              {habit.streak} 🔥
            </span>
          )}
        </div>
      </div>

      {/* Sparkline */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {cells.map(({ date, state, isToday }, i) => (
          <DayCell key={date} label={DAY_LABELS[i]} state={state} isToday={isToday} color={color} />
        ))}
      </div>
    </div>
  )
}

/* ── main section ────────────────────────────────────── */

export default function HabitsWeekStrip({ habits }: Props) {
  const [data, setData]           = useState<HabitWeekData[]>(() => propsToWeekData(habits))
  const [refreshing, setRefresh]  = useState(false)
  const fetchingRef               = useRef(false)

  const refresh = useCallback(async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    setRefresh(true)
    try {
      const res = await fetch('/api/habits/week', { cache: 'no-store' })
      if (res.ok) setData(await res.json())
    } catch { /* keep last known data */ }
    finally { fetchingRef.current = false; setRefresh(false) }
  }, [])

  useEffect(() => {
    refresh()
    const onVisible = () => { if (!document.hidden) refresh() }
    const onFocus   = () => refresh()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh])

  if (data.length === 0) return null

  const weekDays  = getWeekDays()
  const todayDate = localDateStr(new Date())

  return (
    <div style={{ marginTop: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{
            fontSize: '10px', fontWeight: 700, color: 'var(--text-3)',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            Habits This Week
          </span>
          {/* Live dot */}
          <div style={{
            width: '5px', height: '5px', borderRadius: '50%',
            background:  refreshing ? 'var(--gold)' : 'var(--sage)',
            boxShadow:   refreshing ? '0 0 6px var(--gold)' : '0 0 5px var(--sage)',
            transition:  'background 0.3s, box-shadow 0.3s',
            animation:   refreshing ? 'statusPulse 0.8s ease-in-out infinite' : 'none',
          }} />
        </div>
        <a href="/habits" style={{ fontSize: '11px', color: 'var(--text-3)', textDecoration: 'none', fontWeight: 500 }}>
          All habits →
        </a>
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: refreshing ? 0.7 : 1, transition: 'opacity 0.3s' }}>
        {data.map(h => (
          <HabitRow key={h.id} habit={h} weekDays={weekDays} todayDate={todayDate} />
        ))}
      </div>
    </div>
  )
}
