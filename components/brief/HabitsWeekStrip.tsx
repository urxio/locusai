'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
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

type Props = {
  habits: HabitWithLogs[]
}

const HABIT_COLORS = [
  '#7a9e8a', '#d4a853', '#7090c0', '#c09040',
  '#9080b0', '#50a0a0', '#c07080', '#70a070',
]

function habitColor(id: string): string {
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff
  return HABIT_COLORS[hash % HABIT_COLORS.length]
}

function localDateStr(d: Date): string {
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function isScheduledToday(habit: HabitWeekData, todayDow: number): boolean {
  if (!habit.days_of_week || habit.days_of_week.length === 0) return true
  return habit.days_of_week.includes(todayDow)
}

function isDoneToday(habit: HabitWeekData, todayDate: string): boolean {
  return habit.logs.some(log => log.logged_date === todayDate)
}

function propsToWeekData(habits: HabitWithLogs[]): HabitWeekData[] {
  return habits.map(h => ({
    id:           h.id,
    name:         h.name,
    emoji:        h.emoji,
    frequency:    h.frequency,
    days_of_week: h.days_of_week,
    streak:       h.streak,
    logs:         h.logs.map(log => ({ logged_date: log.logged_date })),
  }))
}

function HabitRow({ habit, todayDate, onMark }: { habit: HabitWeekData; todayDate: string; onMark: () => void }) {
  const done = isDoneToday(habit, todayDate)
  const color = habitColor(habit.id)

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '14px',
      padding: '16px',
      background: 'var(--bg-1)',
      border: '1px solid var(--border)',
      borderRadius: '20px',
      minHeight: '72px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '16px',
          display: 'grid',
          placeItems: 'center',
          background: done ? color : 'rgba(255,255,255,0.05)',
          border: done ? `1px solid ${color}` : '1px solid rgba(255,255,255,0.1)',
          color: done ? 'white' : 'var(--text-0)',
          fontSize: '18px',
        }}>
          {done ? '✓' : habit.emoji}
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: '15px',
            fontWeight: 600,
            color: done ? 'var(--text-3)' : 'var(--text-0)',
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {habit.name}
          </div>
          <div style={{ fontSize: '11px', color: done ? 'var(--text-3)' : 'var(--text-2)', marginTop: '4px' }}>
            {habit.frequency}
          </div>
        </div>
      </div>

      <button
        onClick={onMark}
        disabled={done}
        style={{
          minWidth: '88px',
          padding: '10px 14px',
          borderRadius: '999px',
          border: done ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.18)',
          background: done ? 'rgba(255,255,255,0.04)' : 'transparent',
          color: done ? 'var(--text-3)' : 'var(--text-1)',
          fontSize: '12px',
          fontWeight: 700,
          cursor: done ? 'default' : 'pointer',
          transition: 'background 0.2s, border-color 0.2s, color 0.2s',
        }}
      >
        {done ? 'Done' : 'Mark'}
      </button>
    </div>
  )
}

export default function HabitsWeekStrip({ habits }: Props) {
  const router = useRouter()
  const [data, setData] = useState<HabitWeekData[]>(() => propsToWeekData(habits))
  const [refreshing, setRefreshing] = useState(false)
  const fetchingRef = useRef(false)

  const refresh = useCallback(async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    setRefreshing(true)
    try {
      const res = await fetch('/api/habits/week', { cache: 'no-store' })
      if (res.ok) setData(await res.json())
    } catch {
      // keep last known data
    } finally {
      fetchingRef.current = false
      setRefreshing(false)
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
  const todayDow = new Date().getDay()
  const scheduledToday = data.filter(habit => isScheduledToday(habit, todayDow))
  const visibleHabits = scheduledToday.length > 0 ? scheduledToday : data
  const completedCount = visibleHabits.filter(habit => isDoneToday(habit, todayDate)).length

  return (
    <div style={{ marginTop: '24px' }}>
      <div style={{
        padding: '20px',
        background: 'var(--bg-1)',
        border: '1px solid var(--border)',
        borderRadius: '28px',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '18px', marginBottom: '18px' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--text-3)',
              marginBottom: '8px',
            }}>
              Habits — Today
            </div>
            <div style={{
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--text-0)',
              lineHeight: 1.1,
            }}>
              {visibleHabits.every(habit => isScheduledToday(habit, todayDow)) ? 'Today’s routine' : 'Daily habits'}
            </div>
          </div>
          <div style={{ textAlign: 'right', minWidth: '96px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 500, marginBottom: '4px' }}>
              {completedCount} of {visibleHabits.length} done
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '999px',
              padding: '4px 10px',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-2)',
              fontSize: '11px',
            }}>
              {refreshing ? 'Refreshing…' : 'Updated today'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {visibleHabits.map(habit => (
            <HabitRow
              key={habit.id}
              habit={habit}
              todayDate={todayDate}
              onMark={() => router.push('/habits')}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
