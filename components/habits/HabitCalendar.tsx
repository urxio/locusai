'use client'

import { useState, useEffect } from 'react'
import type { HabitWithLogs } from '@/lib/types'
import { logHabitAction, unlogHabitAction } from '@/app/actions/habits'

/* ── CONSTANTS ── */
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const HABIT_COLORS = [
  '#7a9e8a', // sage-ish
  '#d4a853', // gold
  '#6090c8', // blue
  '#c89060', // amber
  '#a070c8', // purple
  '#60b8c8', // teal
  '#c86080', // rose
  '#80c860', // green
]

/* ── HELPERS ── */
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay() // 0 = Sunday
}
function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

type LogMap = Map<string, Set<string>> // habitId → Set<dateStr>

/* ── MAIN COMPONENT ── */
export default function HabitCalendar({ habits, today }: {
  habits: HabitWithLogs[]
  today: string
}) {
  const todayDate = new Date(today + 'T12:00:00')
  const [year,  setYear]  = useState(todayDate.getFullYear())
  const [month, setMonth] = useState(todayDate.getMonth())
  const [logMap, setLogMap] = useState<LogMap>(new Map())
  const [loading, setLoading] = useState(true)
  const [pendingSet, setPendingSet] = useState<Set<string>>(new Set())

  const isCurrentMonth =
    year  === todayDate.getFullYear() &&
    month === todayDate.getMonth()

  /* Fetch logs whenever month changes */
  useEffect(() => {
    setLoading(true)
    fetch(`/api/habits/logs?year=${year}&month=${month + 1}`)
      .then(r => r.json())
      .then((data: { habitId: string; dates: string[] }[]) => {
        const m = new Map<string, Set<string>>()
        data.forEach(({ habitId, dates }) => m.set(habitId, new Set(dates)))
        setLogMap(m)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [year, month])

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (isCurrentMonth) return
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const toggleLog = async (habitId: string, date: string) => {
    const key = `${habitId}:${date}`
    if (pendingSet.has(key) || date > today) return

    const wasDone = (logMap.get(habitId) ?? new Set()).has(date)

    // Optimistic update
    setLogMap(prev => {
      const next = new Map(prev)
      const d = new Set(next.get(habitId) ?? [])
      wasDone ? d.delete(date) : d.add(date)
      next.set(habitId, d)
      return next
    })
    setPendingSet(p => new Set([...p, key]))

    try {
      if (wasDone) await unlogHabitAction(habitId, date)
      else         await logHabitAction(habitId, date)
    } catch {
      // Revert on error
      setLogMap(prev => {
        const next = new Map(prev)
        const d = new Set(next.get(habitId) ?? [])
        wasDone ? d.add(date) : d.delete(date)
        next.set(habitId, d)
        return next
      })
    } finally {
      setPendingSet(p => { const n = new Set(p); n.delete(key); return n })
    }
  }

  /* Build calendar cells */
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay    = getFirstDayOfMonth(year, month)
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div style={{ marginTop: '20px' }}>

      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <button
          onClick={prevMonth}
          className="icon-btn"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 16px', color: 'var(--text-1)', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}
        >
          ‹
        </button>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: 400, color: 'var(--text-0)', letterSpacing: '-0.01em' }}>
          {MONTHS[month]} {year}
        </div>
        <button
          onClick={nextMonth}
          className="icon-btn"
          disabled={isCurrentMonth}
          style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 16px', color: isCurrentMonth ? 'var(--text-3)' : 'var(--text-1)', cursor: isCurrentMonth ? 'default' : 'pointer', fontSize: '20px', lineHeight: 1, opacity: isCurrentMonth ? 0.35 : 1 }}
        >
          ›
        </button>
      </div>

      {/* Habit colour legend */}
      {habits.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginBottom: '14px' }}>
          {habits.map((h, i) => (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: HABIT_COLORS[i % HABIT_COLORS.length], flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>{h.emoji} {h.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      <div style={{
        background: 'var(--bg-1)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        opacity: loading ? 0.55 : 1,
        transition: 'opacity 0.2s',
      }}>
        {/* Day-of-week headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} style={{ padding: '10px 4px', textAlign: 'center', fontSize: '10px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {cells.map((day, idx) => {
            if (day === null) {
              return (
                <div
                  key={`pad-${idx}`}
                  style={{ borderRight: idx % 7 !== 6 ? '1px solid var(--border)' : 'none', borderBottom: '1px solid var(--border)', minHeight: '72px', background: 'var(--bg-0)', opacity: 0.4 }}
                />
              )
            }
            const dateStr  = toDateStr(year, month, day)
            const isToday  = dateStr === today
            const isFuture = dateStr > today

            const doneHabitIndices = habits
              .map((h, i) => ({ h, i, done: (logMap.get(h.id) ?? new Set()).has(dateStr) }))

            const allDone = !isFuture && habits.length > 0 && doneHabitIndices.every(x => x.done)

            return (
              <DayCell
                key={dateStr}
                day={day}
                dateStr={dateStr}
                isToday={isToday}
                isFuture={isFuture}
                isLastCol={idx % 7 === 6}
                habits={habits}
                habitColors={HABIT_COLORS}
                doneMap={logMap}
                allDone={allDone}
                pendingSet={pendingSet}
                onToggle={toggleLog}
              />
            )
          })}
        </div>
      </div>

      {/* Summary row */}
      {habits.length > 0 && !loading && (
        <CalendarSummary habits={habits} logMap={logMap} year={year} month={month} today={today} />
      )}

      {habits.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-3)', fontSize: '14px' }}>
          Add habits to see your monthly progress.
        </div>
      )}
    </div>
  )
}

/* ── DAY CELL ── */
function DayCell({ day, dateStr, isToday, isFuture, isLastCol, habits, habitColors, doneMap, allDone, pendingSet, onToggle }: {
  day: number
  dateStr: string
  isToday: boolean
  isFuture: boolean
  isLastCol: boolean
  habits: HabitWithLogs[]
  habitColors: string[]
  doneMap: LogMap
  allDone: boolean
  pendingSet: Set<string>
  onToggle: (habitId: string, date: string) => void
}) {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div
      style={{
        borderRight: !isLastCol ? '1px solid var(--border)' : 'none',
        borderBottom: '1px solid var(--border)',
        minHeight: '72px',
        padding: '8px 6px 6px',
        background: allDone
          ? 'rgba(122,158,138,0.09)'
          : isToday
          ? 'rgba(212,168,83,0.06)'
          : 'transparent',
        position: 'relative',
      }}
    >
      {/* Day number */}
      <div style={{ marginBottom: '5px', lineHeight: 1 }}>
        {isToday ? (
          <span style={{
            background: 'var(--gold)', color: '#131110', borderRadius: '50%',
            width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '11px', fontWeight: 800,
          }}>
            {day}
          </span>
        ) : (
          <span style={{
            fontSize: '12px',
            fontWeight: 400,
            color: isFuture ? 'var(--text-3)' : 'var(--text-2)',
          }}>
            {day}
          </span>
        )}
        {allDone && (
          <span style={{ fontSize: '9px', color: 'var(--sage)', marginLeft: '3px' }}>✓</span>
        )}
      </div>

      {/* Per-habit dots (not shown for future days) */}
      {!isFuture && habits.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
          {habits.map((h, i) => {
            const done    = (doneMap.get(h.id) ?? new Set()).has(dateStr)
            const color   = habitColors[i % habitColors.length]
            const isPend  = pendingSet.has(`${h.id}:${dateStr}`)
            const isHov   = hovered === h.id

            return (
              <button
                key={h.id}
                onClick={() => onToggle(h.id, dateStr)}
                onMouseEnter={() => setHovered(h.id)}
                onMouseLeave={() => setHovered(null)}
                title={`${h.emoji} ${h.name} — ${done ? 'done · click to undo' : 'not done · click to log'}`}
                className="icon-btn"
                style={{
                  width: '11px',
                  height: '11px',
                  borderRadius: '50%',
                  background: done ? color : 'transparent',
                  border: `1.5px solid ${done ? color : 'var(--bg-4)'}`,
                  cursor: isPend ? 'wait' : 'pointer',
                  opacity: isPend ? 0.35 : isHov ? 0.65 : 1,
                  transition: 'all 0.12s',
                  padding: 0,
                  flexShrink: 0,
                  transform: isHov && !isPend ? 'scale(1.25)' : 'scale(1)',
                }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── MONTHLY SUMMARY ── */
function CalendarSummary({ habits, logMap, year, month, today }: {
  habits: HabitWithLogs[]
  logMap: LogMap
  year: number
  month: number
  today: string
}) {
  const daysInMonth = getDaysInMonth(year, month)

  // Only count days up to today (or end of month)
  const pastDays = Array.from({ length: daysInMonth }, (_, i) => {
    const d = toDateStr(year, month, i + 1)
    return d <= today ? d : null
  }).filter(Boolean) as string[]

  if (pastDays.length === 0) return null

  // Per-habit completion rate
  const habitStats = habits.map(h => {
    const loggedDates = logMap.get(h.id) ?? new Set()
    const doneCount = pastDays.filter(d => loggedDates.has(d)).length
    return { h, doneCount, pct: Math.round((doneCount / pastDays.length) * 100) }
  })

  // Perfect days (all habits done)
  const perfectDays = pastDays.filter(d =>
    habits.every(h => (logMap.get(h.id) ?? new Set()).has(d))
  ).length

  return (
    <div style={{ marginTop: '14px', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>
        Month summary · {pastDays.length} days tracked
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {habitStats.map(({ h, doneCount, pct }, i) => (
          <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '14px', flexShrink: 0 }}>{h.emoji}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-1)', minWidth: '0', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</span>
            <div style={{ flex: 2, height: '4px', background: 'var(--bg-3)', borderRadius: '4px', overflow: 'hidden', minWidth: '60px' }}>
              <div style={{ height: '100%', width: `${pct}%`, borderRadius: '4px', background: HABIT_COLORS[i % HABIT_COLORS.length], transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)' }} />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-2)', flexShrink: 0, minWidth: '44px', textAlign: 'right' }}>{doneCount}/{pastDays.length}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-3)', flexShrink: 0, minWidth: '30px', textAlign: 'right' }}>{pct}%</span>
          </div>
        ))}
      </div>
      {habits.length > 1 && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-2)' }}>
          <span style={{ color: 'var(--sage)', fontWeight: 600 }}>{perfectDays}</span> perfect {perfectDays === 1 ? 'day' : 'days'} — all habits completed
        </div>
      )}
    </div>
  )
}
