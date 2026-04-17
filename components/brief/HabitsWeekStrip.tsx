'use client'

import type { HabitWithLogs } from '@/lib/types'

type Props = {
  habits: HabitWithLogs[]
}

/* ── constants ───────────────────────────────────────── */

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] // Sun=0 … Sat=6

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

/** Returns [ISO-date, dayOfWeek(0=Sun)] for each day of the current week Sun–Sat */
function getWeekDays(): { date: string; dow: number }[] {
  const now   = new Date()
  const today = now.getDay() // 0=Sun
  const days: { date: string; dow: number }[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() - today + i)
    days.push({ date: d.toISOString().split('T')[0], dow: i })
  }
  return days
}

function isScheduledOn(dow: number, daysOfWeek: number[] | null): boolean {
  if (!daysOfWeek || daysOfWeek.length === 0) return true
  return daysOfWeek.includes(dow)
}

/* ── day cell ────────────────────────────────────────── */

type CellState = 'done' | 'missed' | 'unscheduled' | 'future'

function DayCell({
  label,
  state,
  isToday,
  color,
}: {
  label:   string
  state:   CellState
  isToday: boolean
  color:   string
}) {
  const isDone        = state === 'done'
  const isMissed      = state === 'missed'
  const isUnscheduled = state === 'unscheduled'
  const isFuture      = state === 'future'

  const cellBg = isDone
    ? color
    : isMissed
    ? 'rgba(255,255,255,0.06)'
    : isUnscheduled
    ? 'transparent'
    : isFuture
    ? 'rgba(255,255,255,0.04)'
    : 'rgba(255,255,255,0.06)'

  const glow = isDone ? `0 0 8px ${color}cc, 0 0 2px ${color}` : 'none'

  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      gap:            '5px',
      flex:           1,
    }}>
      {/* Day letter */}
      <span style={{
        fontSize:      '9px',
        fontWeight:    isToday ? 800 : 600,
        color:         isToday ? 'var(--text-1)' : 'var(--text-3)',
        letterSpacing: '0.04em',
        lineHeight:    1,
      }}>
        {label}
      </span>

      {/* Cell block */}
      <div style={{
        width:        '100%',
        height:       '10px',
        borderRadius: '5px',
        background:   cellBg,
        boxShadow:    glow,
        border:       isToday
          ? `1.5px solid rgba(255,255,255,${isDone ? '0.35' : '0.18'})`
          : isMissed
          ? '1px solid rgba(255,255,255,0.08)'
          : isUnscheduled
          ? '1px dashed rgba(255,255,255,0.07)'
          : '1px solid transparent',
        transition:   'background 0.3s, box-shadow 0.3s',
        position:     'relative',
        overflow:     'hidden',
      }}>
        {/* Dot inside unscheduled cell */}
        {isUnscheduled && (
          <div style={{
            position:     'absolute',
            inset:        0,
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
          }}>
            <div style={{
              width:        '3px',
              height:       '3px',
              borderRadius: '50%',
              background:   'rgba(255,255,255,0.12)',
            }} />
          </div>
        )}
      </div>
    </div>
  )
}

/* ── single habit row ────────────────────────────────── */

function HabitRow({
  habit,
  weekDays,
  todayDate,
}: {
  habit:     HabitWithLogs
  weekDays:  { date: string; dow: number }[]
  todayDate: string
}) {
  const color   = habitColor(habit.id)
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

    return { date, dow, state, isToday }
  })

  const doneThisWeek = cells.filter(c => c.state === 'done').length
  const totalScheduled = cells.filter(c => c.state !== 'unscheduled').length

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      gap:           '10px',
      padding:       '14px 14px 13px',
      background:    'var(--bg-1)',
      border:        '1px solid var(--border)',
      borderRadius:  '16px',
      transition:    'border-color 0.18s',
    }}>
      {/* Top row: emoji + name + streak */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Colored emoji square */}
        <div style={{
          width:           '32px',
          height:          '32px',
          borderRadius:    '8px',
          background:      `${color}22`,
          border:          `1px solid ${color}44`,
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          fontSize:        '16px',
          flexShrink:      0,
        }}>
          {habit.emoji}
        </div>

        {/* Name + frequency */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize:     '13px',
            fontWeight:   600,
            color:        'var(--text-0)',
            lineHeight:   1.2,
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
          }}>
            {habit.name}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>
            {habit.frequency}
          </div>
        </div>

        {/* Right side: done count + streak */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <span style={{
            fontSize:   '11px',
            color:      'var(--text-3)',
            fontWeight: 500,
          }}>
            {doneThisWeek}/{totalScheduled}
          </span>
          {habit.streak > 0 && (
            <span style={{
              fontSize:      '10px',
              fontWeight:    700,
              color:         color,
              background:    `${color}18`,
              border:        `1px solid ${color}33`,
              borderRadius:  '10px',
              padding:       '2px 7px',
              letterSpacing: '0.02em',
            }}>
              {habit.streak} 🔥
            </span>
          )}
        </div>
      </div>

      {/* 7-day sparkline cells */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {cells.map(({ date, state, isToday }, i) => (
          <DayCell
            key={date}
            label={DAY_LABELS[i]}
            state={state}
            isToday={isToday}
            color={color}
          />
        ))}
      </div>
    </div>
  )
}

/* ── main section ────────────────────────────────────── */

export default function HabitsWeekStrip({ habits }: Props) {
  if (habits.length === 0) return null

  const weekDays  = getWeekDays()
  const todayDate = new Date().toISOString().split('T')[0]

  return (
    <div style={{ marginTop: '24px' }}>
      {/* Header */}
      <div style={{
        display:       'flex',
        alignItems:    'center',
        justifyContent:'space-between',
        marginBottom:  '10px',
      }}>
        <span style={{
          fontSize:      '10px',
          fontWeight:    700,
          color:         'var(--text-3)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          Habits This Week
        </span>
        <a
          href="/habits"
          style={{
            fontSize:       '11px',
            color:          'var(--text-3)',
            textDecoration: 'none',
            fontWeight:     500,
          }}
        >
          All habits →
        </a>
      </div>

      {/* Habit rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {habits.map(h => (
          <HabitRow
            key={h.id}
            habit={h}
            weekDays={weekDays}
            todayDate={todayDate}
          />
        ))}
      </div>
    </div>
  )
}
