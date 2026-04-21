'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { HabitWithLogs } from '@/lib/types'

type HabitWeekData = {
  id:           string
  name:         string
  emoji:        string
  frequency:    string
  days_of_week: number[] | null
  streak:       number
  logs:         { logged_date: string }[]
}

type Props = {
  habits: HabitWithLogs[]
}

function localDateStr(d: Date): string {
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function isScheduledToday(h: HabitWeekData, dow: number): boolean {
  if (!h.days_of_week || h.days_of_week.length === 0) return true
  return h.days_of_week.includes(dow)
}

function isDoneToday(h: HabitWeekData, today: string): boolean {
  return h.logs.some(l => l.logged_date === today)
}

function propsToWeekData(habits: HabitWithLogs[]): HabitWeekData[] {
  return habits.map(h => ({
    id:           h.id,
    name:         h.name,
    emoji:        h.emoji,
    frequency:    h.frequency,
    days_of_week: h.days_of_week,
    streak:       h.streak,
    logs:         h.logs.map(l => ({ logged_date: l.logged_date })),
  }))
}

function HabitRow({
  habit,
  todayDate,
  onMark,
}: {
  habit: HabitWeekData
  todayDate: string
  onMark: () => void
}) {
  const done = isDoneToday(habit, todayDate)

  return (
    <button
      onClick={onMark}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px',
        borderRadius: '16px',
        border: `1px solid ${done ? 'transparent' : 'var(--border)'}`,
        background: done ? 'oklch(1 0 0 / 0.03)' : 'var(--bg-1)',
        boxShadow: done ? 'none' : '0 2px 12px oklch(0 0 0 / 0.03)',
        textAlign: 'left',
        cursor: 'pointer',
        width: '100%',
        transition: 'background 0.2s, box-shadow 0.2s',
      }}
    >
      {/* Circle */}
      <span style={{
        flexShrink: 0,
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: done ? 'var(--sea)' : 'transparent',
        border: done ? 'none' : '2.5px solid color-mix(in oklch, var(--ink-faint) 40%, transparent)',
        fontSize: '11px',
        fontWeight: 700,
        color: 'white',
        boxShadow: done ? '0 2px 8px color-mix(in oklch, var(--sea) 35%, transparent)' : 'none',
      }}>
        {done && '✓'}
      </span>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{
          fontSize: '15px',
          fontWeight: done ? 500 : 700,
          color: done ? 'var(--ink-faint)' : 'var(--text-0)',
          textDecoration: done ? 'line-through' : 'none',
          textDecorationColor: 'color-mix(in oklch, var(--ink-faint) 40%, transparent)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {habit.name}
        </span>
        <span style={{ fontSize: '12px', color: 'var(--ink-faint)' }}>
          {habit.frequency}
        </span>
      </div>

      {/* Badge */}
      <span style={{
        flexShrink: 0,
        padding: '4px 10px',
        borderRadius: '8px',
        fontSize: '11px',
        fontWeight: 700,
        background: done ? 'oklch(1 0 0 / 0.03)' : 'var(--bg-2)',
        border: done ? 'none' : '1px solid var(--border)',
        color: done ? 'var(--ink-faint)' : 'var(--text-1)',
      }}>
        {done ? 'Done' : 'Mark'}
      </span>
    </button>
  )
}

export default function HabitsWeekStrip({ habits }: Props) {
  const router = useRouter()
  const [data, setData] = useState<HabitWeekData[]>(() => propsToWeekData(habits))
  const fetchingRef = useRef(false)

  const refresh = useCallback(async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      const res = await fetch('/api/habits/week', { cache: 'no-store' })
      if (res.ok) setData(await res.json())
    } catch {
      // keep last known data
    } finally {
      fetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    refresh()
    const onVisible = () => { if (!document.hidden) refresh() }
    const onFocus = () => refresh()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh])

  if (data.length === 0) return null

  const todayDate = localDateStr(new Date())
  const todayDow  = new Date().getDay()
  const scheduled = data.filter(h => isScheduledToday(h, todayDow))
  const visible   = scheduled.length > 0 ? scheduled : data
  const done      = visible.filter(h => isDoneToday(h, todayDate)).length

  return (
    <div style={{ marginTop: '24px' }}>
      <section style={{
        padding: '24px 24px 20px',
        background: 'var(--glass)',
        border: '1px solid var(--glass-border)',
        borderRadius: '2.5rem',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        boxShadow: 'var(--shadow-glass)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 4px',
          marginBottom: '20px',
        }}>
          <div>
            <div style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--ink-faint)',
              marginBottom: '4px',
            }}>
              Habits — today
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-0)', lineHeight: 1.2 }}>
              {visible.every(h => isScheduledToday(h, todayDow)) ? 'Morning routine' : 'Daily habits'}
            </h3>
          </div>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink-soft)' }}>
            {done} of {visible.length} done
          </span>
        </div>

        {/* Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {visible.map(habit => (
            <HabitRow
              key={habit.id}
              habit={habit}
              todayDate={todayDate}
              onMark={() => router.push('/habits')}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
