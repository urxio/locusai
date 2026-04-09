'use client'

import { useState } from 'react'
import type { HabitWithLogs } from '@/lib/types'
import { logHabitAction, unlogHabitAction } from '@/app/actions/habits'

type Props = {
  habits: HabitWithLogs[]
  today: string
}

const FREQ_LABEL: Record<string, string> = {
  daily:    'Daily',
  '3x_week': '3× / week',
  weekdays: 'Weekdays',
}

// Last 7 days as date strings, oldest → newest
function getLast7Days(today: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
}

// Short day label (M T W T F S S)
function dayLabel(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'narrow' })
}

export default function HabitTracker({ habits, today }: Props) {
  // Initialise logged set from server data
  const initialLogged = new Set(
    habits.filter(h => h.logs.some(l => l.logged_date === today)).map(h => h.id)
  )
  const [logged, setLogged] = useState<Set<string>>(initialLogged)
  const [pending, setPending] = useState<Set<string>>(new Set())

  const doneCount = logged.size
  const totalCount = habits.length
  const progressPct = totalCount > 0 ? (doneCount / totalCount) * 100 : 0

  const toggle = async (habitId: string) => {
    if (pending.has(habitId)) return
    const wasDone = logged.has(habitId)

    // Optimistic update
    setLogged(prev => {
      const next = new Set(prev)
      wasDone ? next.delete(habitId) : next.add(habitId)
      return next
    })
    setPending(prev => new Set([...prev, habitId]))

    try {
      if (wasDone) await unlogHabitAction(habitId)
      else await logHabitAction(habitId)
    } catch {
      // Revert
      setLogged(prev => {
        const next = new Set(prev)
        wasDone ? next.add(habitId) : next.delete(habitId)
        return next
      })
    } finally {
      setPending(prev => { const n = new Set(prev); n.delete(habitId); return n })
    }
  }

  const now = new Date()
  const last7 = getLast7Days(today)

  return (
    <div style={{ padding: '36px 40px 60px', maxWidth: '720px', animation: 'fadeUp 0.3s var(--ease) both' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 600, marginBottom: '6px', opacity: 0.85 }}>
          {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '34px', fontWeight: 400, color: 'var(--text-0)', lineHeight: 1.15 }}>
          Today's <em style={{ fontStyle: 'italic', color: 'var(--text-1)' }}>habits.</em>
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-2)', marginTop: '6px' }}>
          Tap a habit to mark it done. Your streaks update instantly.
        </div>
      </div>

      {/* Progress bar */}
      {habits.length > 0 && (
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 22px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Today's progress
            </span>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: 400, color: doneCount === totalCount ? 'var(--sage)' : 'var(--text-0)' }}>
              {doneCount}<span style={{ fontSize: '14px', color: 'var(--text-2)', fontFamily: 'inherit' }}>/{totalCount}</span>
            </span>
          </div>
          <div style={{ height: '5px', background: 'var(--bg-4)', borderRadius: '5px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              borderRadius: '5px',
              background: doneCount === totalCount
                ? 'linear-gradient(90deg, var(--sage), #a0c8a8)'
                : 'linear-gradient(90deg, var(--gold), #e8b86d)',
              width: `${progressPct}%`,
              transition: 'width 0.5s cubic-bezier(0.22,1,0.36,1)',
            }} />
          </div>
          {doneCount === totalCount && totalCount > 0 && (
            <div style={{ fontSize: '12px', color: 'var(--sage)', marginTop: '8px', fontWeight: 600 }}>
              ✓ All habits complete for today
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {habits.length === 0 && (
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-xl)', padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🌱</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: 300, color: 'var(--text-1)', marginBottom: '8px' }}>No habits yet.</div>
          <div style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '20px' }}>Set up habits in your onboarding to start tracking.</div>
          <a href="/onboarding?redo=true" style={{ display: 'inline-block', background: 'var(--gold)', color: '#131110', borderRadius: '8px', padding: '10px 22px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
            Add habits →
          </a>
        </div>
      )}

      {/* Habit list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {habits.map(habit => {
          const isDone = logged.has(habit.id)
          const isPending = pending.has(habit.id)
          const loggedDates = new Set(habit.logs.map(l => l.logged_date))

          return (
            <HabitCard
              key={habit.id}
              habit={habit}
              isDone={isDone}
              isPending={isPending}
              last7={last7}
              loggedDates={loggedDates}
              onToggle={() => toggle(habit.id)}
            />
          )
        })}
      </div>

    </div>
  )
}

function HabitCard({
  habit, isDone, isPending, last7, loggedDates, onToggle
}: {
  habit: HabitWithLogs
  isDone: boolean
  isPending: boolean
  last7: string[]
  loggedDates: Set<string>
  onToggle: () => void
}) {
  return (
    <div
      onClick={onToggle}
      role="button"
      aria-pressed={isDone}
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' || e.key === ' ' ? onToggle() : null}
      style={{
        background: isDone
          ? 'linear-gradient(135deg, rgba(122,158,138,0.15) 0%, rgba(122,158,138,0.06) 100%)'
          : 'var(--bg-1)',
        border: `1px solid ${isDone ? 'rgba(122,158,138,0.35)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '18px 20px',
        cursor: isPending ? 'wait' : 'pointer',
        transition: 'all 0.2s var(--ease)',
        userSelect: 'none',
        opacity: isPending ? 0.7 : 1,
        outline: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

        {/* Check button */}
        <div style={{
          width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
          background: isDone ? 'var(--sage)' : 'var(--bg-3)',
          border: `2px solid ${isDone ? 'var(--sage)' : 'var(--border-md)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s var(--ease)',
          boxShadow: isDone ? '0 2px 10px rgba(122,158,138,0.3)' : 'none',
        }}>
          {isDone
            ? <CheckIcon />
            : <span style={{ fontSize: '20px' }}>{habit.emoji}</span>
          }
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            {!isDone && <span style={{ fontSize: '16px' }}>{habit.emoji}</span>}
            <span style={{
              fontSize: '15px', fontWeight: 600,
              color: isDone ? 'var(--sage)' : 'var(--text-0)',
              textDecoration: isDone ? 'none' : 'none',
              transition: 'color 0.2s',
            }}>
              {habit.name}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              {FREQ_LABEL[habit.frequency] ?? habit.frequency}
            </span>
          </div>

          {/* 7-day dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {last7.map(date => {
              const done = loggedDates.has(date) || (date === last7[6] && isDone && !loggedDates.has(date) ? false : loggedDates.has(date))
              const isToday = date === last7[6]
              return (
                <div key={date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                  <div style={{
                    width: isToday ? '10px' : '8px',
                    height: isToday ? '10px' : '8px',
                    borderRadius: '50%',
                    background: done
                      ? 'var(--sage)'
                      : isToday
                        ? (isDone ? 'var(--sage)' : 'var(--gold)')
                        : 'var(--bg-4)',
                    border: isToday ? `2px solid ${isDone ? 'var(--sage)' : 'var(--gold)'}` : 'none',
                    transition: 'background 0.2s',
                    opacity: done ? 1 : isToday ? 1 : 0.5,
                  }} />
                  <span style={{ fontSize: '8px', color: isToday ? 'var(--text-2)' : 'var(--text-3)', fontWeight: isToday ? 700 : 400 }}>
                    {dayLabel(date)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Streak */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '26px',
            fontWeight: 300,
            color: habit.streak > 0 ? 'var(--gold)' : 'var(--text-3)',
            lineHeight: 1,
          }}>
            {habit.streak}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginTop: '2px' }}>
            {habit.streak === 1 ? 'day' : 'days'}
          </div>
          {habit.streak >= 3 && (
            <div style={{ fontSize: '14px', marginTop: '2px' }}>
              {habit.streak >= 30 ? '🔥🔥' : habit.streak >= 14 ? '🔥' : '⚡'}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M4 9.5l3.5 3.5 6.5-7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
