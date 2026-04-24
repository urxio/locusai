'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { HabitWithLogs, Habit } from '@/lib/types'
import {
  logHabitAction, unlogHabitAction,
  createHabitAction, updateHabitAction, deleteHabitAction,
  type HabitFormData,
} from '@/app/actions/habits'
import { deriveFrequencyMeta } from '@/lib/habits/utils'
import HabitCalendar from './HabitCalendar'

/* ── CONSTANTS ── */
const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DOW_NAMES  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const EMOJI_SUGGESTIONS = ['🏃', '📚', '🧘', '💪', '✍️', '💧', '🥗', '😴', '🎸', '🧹', '🌿', '🏊']
const HABIT_COLORS = ['#7a9e8a', '#d4a853', '#7090c0', '#c09040', '#9080b0', '#50a0a0', '#c07080', '#70a070']

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--bg-3)', border: '1px solid var(--border)',
  borderRadius: '8px', padding: '10px 13px', fontSize: '14px',
  color: 'var(--text-0)', outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 600, color: 'var(--text-2)',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px', display: 'block',
}

/* ── HELPERS ── */
function getLast7Days(today: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today + 'T12:00:00')
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
}

function getLast28Days(today: string): string[] {
  return Array.from({ length: 28 }, (_, i) => {
    const d = new Date(today + 'T12:00:00')
    d.setDate(d.getDate() - (27 - i))
    return d.toISOString().split('T')[0]
  })
}

function isScheduledOn(date: string, daysOfWeek: number[] | null): boolean {
  if (!daysOfWeek || daysOfWeek.length === 0) return true
  return daysOfWeek.includes(new Date(date + 'T12:00:00').getDay())
}

function computeStreak(loggedDates: Set<string>, today: string, daysOfWeek: number[] | null): number {
  if (loggedDates.size === 0) return 0
  let startDate: string | null = null
  let scan = today
  for (let i = 0; i < 14; i++) {
    if (isScheduledOn(scan, daysOfWeek) && loggedDates.has(scan)) {
      startDate = scan; break
    }
    const d = new Date(scan + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    scan = d.toISOString().split('T')[0]
  }
  if (!startDate) return 0
  let cur = startDate
  let streak = 0
  for (let i = 0; i < 200; i++) {
    if (!isScheduledOn(cur, daysOfWeek)) {
      const d = new Date(cur + 'T12:00:00')
      d.setDate(d.getDate() - 1)
      cur = d.toISOString().split('T')[0]
      continue
    }
    if (loggedDates.has(cur)) {
      streak++
      const d = new Date(cur + 'T12:00:00')
      d.setDate(d.getDate() - 1)
      cur = d.toISOString().split('T')[0]
    } else {
      break
    }
  }
  return streak
}

function freqDisplay(habit: Habit): string {
  if (habit.days_of_week && habit.days_of_week.length > 0 && habit.days_of_week.length < 7) {
    const sorted = [...habit.days_of_week].sort((a, b) => a - b)
    if (JSON.stringify(sorted) === JSON.stringify([1, 2, 3, 4, 5])) return 'Weekdays'
    if (JSON.stringify(sorted) === JSON.stringify([0, 6])) return 'Weekends'
    return sorted.map(d => DOW_NAMES[d]).join(' · ')
  }
  const legacy: Record<string, string> = { daily: 'Daily', '3x_week': '3× / week', weekdays: 'Weekdays' }
  return legacy[habit.frequency] ?? habit.frequency
}

function daysUntilEnd(endsAt: string | null): number | null {
  if (!endsAt) return null
  return Math.ceil((new Date(endsAt + 'T12:00:00').getTime() - Date.now()) / 86400000)
}

type LogMap = Map<string, Set<string>>
type ModalState = null | { mode: 'add' } | { mode: 'edit'; habit: HabitWithLogs }
type ViewMode = 'list' | 'calendar'

/* ── MAIN COMPONENT ── */
export default function HabitTracker({ habits: initial, today, activeGoals = [] }: { habits: HabitWithLogs[]; today: string; activeGoals?: import('@/lib/types').Goal[] }) {
  const [habits, setHabits] = useState<HabitWithLogs[]>(initial)
  const [modal, setModal]   = useState<ModalState>(null)
  const [view,  setView]    = useState<ViewMode>('list')
  const [showAll, setShowAll] = useState(false)
  const router = useRouter()

  const [logMap, setLogMap] = useState<LogMap>(() => {
    const m = new Map<string, Set<string>>()
    initial.forEach(h => m.set(h.id, new Set(h.logs.map(l => l.logged_date))))
    return m
  })

  const [pendingSet, setPendingSet] = useState<Set<string>>(new Set())

  const last7  = getLast7Days(today)
  const last28 = getLast28Days(today)

  const toggleLog = async (habitId: string, date: string) => {
    const key = `${habitId}:${date}`
    if (pendingSet.has(key)) return
    const dates  = logMap.get(habitId) ?? new Set<string>()
    const wasDone = dates.has(date)
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
      else await logHabitAction(habitId, date)
    } catch {
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

  const handleDeleted = (habitId: string) => {
    setHabits(hs => hs.filter(h => h.id !== habitId))
    setLogMap(prev => { const n = new Map(prev); n.delete(habitId); return n })
    router.refresh()
  }

  const handleSaved = (updated: HabitWithLogs) => {
    setHabits(hs => {
      const exists = hs.find(h => h.id === updated.id)
      return exists ? hs.map(h => h.id === updated.id ? updated : h) : [...hs, updated]
    })
    setLogMap(prev => {
      const n = new Map(prev)
      if (!n.has(updated.id)) n.set(updated.id, new Set())
      return n
    })
    setModal(null)
    router.refresh()
  }

  const scheduledToday   = habits.filter(h => h.isScheduledToday)
  const unscheduledToday = habits.filter(h => !h.isScheduledToday)

  const doneToday   = scheduledToday.filter(h => (logMap.get(h.id) ?? new Set()).has(today)).length
  const totalToday  = scheduledToday.length
  const progressPct = totalToday > 0 ? (doneToday / totalToday) * 100 : 0

  const displayedHabits = showAll ? habits : scheduledToday
  const now = new Date()

  // Stable color index per habit based on full list order
  const habitColorIndex = (id: string) => habits.findIndex(h => h.id === id) % HABIT_COLORS.length

  return (
    <>
      <div className="page-pad" style={{ maxWidth: '760px', animation: 'fadeUp 0.3s var(--ease) both' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 600, marginBottom: '6px', opacity: 0.85 }}>
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '34px', fontWeight: 400, color: 'var(--text-0)', lineHeight: 1.15 }}>
              {view === 'list'
                ? <>Today's <em style={{ fontStyle: 'italic', color: 'var(--text-1)' }}>habits.</em></>
                : <>Monthly <em style={{ fontStyle: 'italic', color: 'var(--text-1)' }}>progress.</em></>
              }
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-2)', marginTop: '6px' }}>
              {view === 'list'
                ? 'Tap the icon to log today. Tap any square to edit history.'
                : 'Click any past dot to toggle a habit log for that day.'}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0, marginTop: '6px' }}>
            <div style={{ display: 'flex', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '9px', padding: '3px', gap: '2px' }}>
              <button onClick={() => setView('list')} className="icon-btn"
                style={{ padding: '6px 14px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, transition: 'all 0.15s', background: view === 'list' ? 'var(--bg-0)' : 'transparent', color: view === 'list' ? 'var(--text-0)' : 'var(--text-3)', boxShadow: view === 'list' ? '0 1px 4px rgba(0,0,0,0.2)' : 'none' }}>
                List
              </button>
              <button onClick={() => setView('calendar')} className="icon-btn"
                style={{ padding: '6px 14px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, transition: 'all 0.15s', background: view === 'calendar' ? 'var(--bg-0)' : 'transparent', color: view === 'calendar' ? 'var(--text-0)' : 'var(--text-3)', boxShadow: view === 'calendar' ? '0 1px 4px rgba(0,0,0,0.2)' : 'none' }}>
                Calendar
              </button>
            </div>
            <button onClick={() => setModal({ mode: 'add' })}
              style={{ background: 'var(--gold)', color: '#131110', border: 'none', borderRadius: '10px', padding: '11px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              + Add habit
            </button>
          </div>
        </div>

        {/* Daily progress bar — list view only */}
        {view === 'list' && totalToday > 0 && (
          <div style={{ background: 'var(--glass-card-bg)', backdropFilter: 'blur(32px) saturate(180%)', WebkitBackdropFilter: 'blur(32px) saturate(180%)', border: '1px solid var(--glass-card-border)', boxShadow: 'var(--glass-card-shadow-sm)', borderRadius: '14px', padding: '16px 20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today's progress</span>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: 400, color: doneToday === totalToday ? 'var(--sage)' : 'var(--text-0)' }}>
                {doneToday}<span style={{ fontSize: '14px', color: 'var(--text-2)' }}>/{totalToday}</span>
              </span>
            </div>
            <div style={{ height: '5px', background: 'var(--bg-4)', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '5px', width: `${progressPct}%`, transition: 'width 0.5s cubic-bezier(0.22,1,0.36,1)', background: doneToday === totalToday ? 'linear-gradient(90deg, var(--sage), #a0c8a8)' : 'linear-gradient(90deg, var(--gold), #e8b86d)' }} />
            </div>
            {doneToday === totalToday && totalToday > 0 && (
              <div style={{ fontSize: '12px', color: 'var(--sage)', marginTop: '8px', fontWeight: 600 }}>✓ All habits complete for today</div>
            )}
          </div>
        )}

        {/* Empty state */}
        {habits.length === 0 && (
          <div style={{ background: 'var(--glass-card-bg)', backdropFilter: 'blur(32px) saturate(180%)', WebkitBackdropFilter: 'blur(32px) saturate(180%)', border: '1px solid var(--glass-card-border)', boxShadow: 'var(--glass-card-shadow-sm)', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🌱</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 300, color: 'var(--text-1)', marginBottom: '8px' }}>No habits yet.</div>
            <div style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '20px' }}>Build habits that compound. Start with one.</div>
            <button onClick={() => setModal({ mode: 'add' })} style={{ background: 'var(--gold)', color: '#131110', border: 'none', borderRadius: '8px', padding: '11px 24px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
              Add your first habit →
            </button>
          </div>
        )}

        {/* Calendar view */}
        {view === 'calendar' && (
          <HabitCalendar habits={habits} today={today} />
        )}

        {/* List view */}
        {view === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {scheduledToday.length === 0 && habits.length > 0 && !showAll && (
              <div style={{ background: 'var(--glass-card-bg)', backdropFilter: 'blur(32px) saturate(180%)', WebkitBackdropFilter: 'blur(32px) saturate(180%)', border: '1px solid var(--glass-card-border)', boxShadow: 'var(--glass-card-shadow-sm)', borderRadius: '14px', padding: '28px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>✌️</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '4px' }}>No habits scheduled for today.</div>
                <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>Enjoy the break — you've earned it.</div>
              </div>
            )}

            {displayedHabits.map(habit => {
              const loggedDates = logMap.get(habit.id) ?? new Set<string>()
              const streak = computeStreak(loggedDates, today, habit.days_of_week ?? null)
              return (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  loggedDates={loggedDates}
                  streak={streak}
                  colorIndex={habitColorIndex(habit.id)}
                  last28={last28}
                  today={today}
                  pendingSet={pendingSet}
                  onToggle={(date) => toggleLog(habit.id, date)}
                  onEdit={() => setModal({ mode: 'edit', habit })}
                  onDelete={() => handleDeleted(habit.id)}
                />
              )
            })}

            {view === 'list' && habits.length > 0 && (
              <button onClick={() => setShowAll(v => !v)}
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '12px', cursor: 'pointer', padding: '8px 0', textAlign: 'center', letterSpacing: '0.04em' }}>
                {showAll
                  ? '↑ Show today only'
                  : unscheduledToday.length > 0
                    ? `↓ Show all habits (${unscheduledToday.length} not scheduled today)`
                    : null
                }
              </button>
            )}
          </div>
        )}
      </div>

      {modal && (
        <HabitModal
          mode={modal.mode}
          habit={modal.mode === 'edit' ? modal.habit : undefined}
          today={today}
          activeGoals={activeGoals}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}

/* ── HABIT CARD ── */
function HabitCard({ habit, loggedDates, streak, colorIndex, last28, today, pendingSet, onToggle, onEdit, onDelete }: {
  habit: HabitWithLogs
  loggedDates: Set<string>
  streak: number
  colorIndex: number
  last28: string[]
  today: string
  pendingSet: Set<string>
  onToggle: (date: string) => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [hovered, setHovered]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showMonth, setShowMonth]   = useState(false)
  const [monthOffset, setMonthOffset] = useState(0)
  const [isPending, startTransition] = useTransition()

  const habitColor = HABIT_COLORS[colorIndex % HABIT_COLORS.length]
  const todayDone  = loggedDates.has(today)
  const endDays    = daysUntilEnd(habit.ends_at ?? null)

  // 28-day progress
  const scheduledLast28 = last28.filter(d => isScheduledOn(d, habit.days_of_week ?? null))
  const doneLast28      = scheduledLast28.filter(d => loggedDates.has(d))
  const progressPct     = scheduledLast28.length > 0 ? Math.round((doneLast28.length / scheduledLast28.length) * 100) : 0

  // Month calendar data
  const baseDate = new Date(today + 'T12:00:00')
  baseDate.setDate(1)
  baseDate.setMonth(baseDate.getMonth() + monthOffset)
  const year        = baseDate.getFullYear()
  const month       = baseDate.getMonth()
  const firstDow    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthName   = baseDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const handleDelete = () => {
    startTransition(async () => {
      await deleteHabitAction(habit.id)
      onDelete()
    })
  }

  return (
    <div
      style={{
        background: 'var(--glass-card-bg)',
        backdropFilter: 'blur(32px) saturate(180%)',
        WebkitBackdropFilter: 'blur(32px) saturate(180%)',
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.22)' : 'var(--glass-card-border)'}`,
        boxShadow: 'var(--glass-card-shadow-sm)',
        borderRadius: '16px',
        padding: '20px',
        transition: 'border-color 0.2s var(--ease)',
        opacity: habit.isScheduledToday ? 1 : 0.65,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false) }}
    >
      {/* ── Top row: icon · name · streak · actions ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>

        {/* Colored icon square — click to toggle today */}
        <button
          onClick={() => onToggle(today)}
          title={todayDone ? 'Mark undone' : 'Mark done today'}
          disabled={pendingSet.has(`${habit.id}:${today}`)}
          style={{
            width: '48px', height: '48px', borderRadius: '13px', flexShrink: 0,
            background: todayDone ? habitColor : `${habitColor}28`,
            border: `2px solid ${todayDone ? habitColor : `${habitColor}55`}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: pendingSet.has(`${habit.id}:${today}`) ? 'wait' : 'pointer',
            transition: 'all 0.2s var(--ease)',
            boxShadow: todayDone ? `0 4px 16px ${habitColor}44` : 'none',
            padding: 0,
          }}
        >
          {todayDone
            ? <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M5 11.5l4.5 4.5 7.5-9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            : <span style={{ fontSize: '22px', lineHeight: 1 }}>{habit.emoji}</span>
          }
        </button>

        {/* Name + meta */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-0)', lineHeight: 1.2 }}>{habit.name}</span>
            {!habit.isScheduledToday && (
              <span style={{ fontSize: '10px', color: 'var(--text-3)', fontStyle: 'italic' }}>not today</span>
            )}
            {habit.linkedGoal && (
              <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', fontWeight: 600, letterSpacing: '0.04em', background: 'var(--bg-3)', color: 'var(--text-3)', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: '3px', maxWidth: '120px' }}>
                <span>↗</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{habit.linkedGoal.title}</span>
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 500 }}>{freqDisplay(habit)}</span>
            {endDays !== null && (
              <span style={{ fontSize: '10px', fontWeight: 600, color: endDays <= 3 ? '#e07060' : 'var(--text-3)', background: endDays <= 3 ? 'rgba(200,80,60,0.08)' : 'var(--bg-3)', border: `1px solid ${endDays <= 3 ? 'rgba(200,80,60,0.2)' : 'var(--border)'}`, borderRadius: '5px', padding: '1px 6px' }}>
                {endDays <= 0 ? 'Ended' : endDays === 1 ? 'Ends tomorrow' : endDays <= 7 ? `${endDays}d left` : `Until ${habit.ends_at}`}
              </span>
            )}
          </div>
        </div>

        {/* Right: streak badge + edit/delete */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
          {/* Streak pill */}
          {streak > 0 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '20px', padding: '4px 10px 4px 8px' }}>
              <span style={{ fontSize: '14px', lineHeight: 1 }}>{streak >= 30 ? '🔥🔥' : streak >= 14 ? '🔥' : '⚡'}</span>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '17px', fontWeight: 400, color: 'var(--gold)', lineHeight: 1 }}>{streak}</span>
              <span style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                day{streak !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          {/* Edit / delete */}
          <div style={{ height: '26px', display: 'flex', alignItems: 'center' }}>
            {confirmDelete ? (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>Delete?</span>
                <button onClick={handleDelete} disabled={isPending} style={{ background: '#c0392b', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>Yes</button>
                <button onClick={() => setConfirmDelete(false)} style={{ background: 'var(--bg-3)', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer' }}>No</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '4px', opacity: hovered ? 1 : 0, pointerEvents: hovered ? 'auto' : 'none', transition: 'opacity 0.15s' }}>
                <SmallBtn title="Edit" onClick={onEdit}><PencilIcon /></SmallBtn>
                <SmallBtn title="Delete" danger onClick={() => setConfirmDelete(true)}><TrashIcon /></SmallBtn>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 28-day contribution grid ── */}
      <div style={{ marginTop: '18px' }}>
        {/* Day-of-week labels (align to first day in last28) */}
        {(() => {
          const firstDow28 = new Date(last28[0] + 'T12:00:00').getDay()
          const paddingCells = Array.from({ length: firstDow28 })
          const allCells = [...paddingCells, ...last28]
          const cols = 7
          const rows = Math.ceil(allCells.length / cols)

          return (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 12px)', gap: '3px', marginBottom: '3px' }}>
                {DOW_LABELS.map((d, i) => (
                  <div key={i} style={{ width: '12px', textAlign: 'center', fontSize: '8px', color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.02em' }}>{d}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 12px)', gap: '3px' }}>
                {/* Padding cells before first day */}
                {paddingCells.map((_, i) => (
                  <div key={`pad-${i}`} style={{ width: '12px', height: '12px', flexShrink: 0 }} />
                ))}
                {/* Actual day cells */}
                {last28.map(date => {
                  const done      = loggedDates.has(date)
                  const isToday   = date === today
                  const scheduled = isScheduledOn(date, habit.days_of_week ?? null)
                  const pending   = pendingSet.has(`${habit.id}:${date}`)
                  return (
                    <div
                      key={date}
                      role="button"
                      tabIndex={0}
                      onClick={() => onToggle(date)}
                      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onToggle(date)}
                      title={`${date} — ${done ? 'logged ✓' : scheduled ? 'not logged' : 'not scheduled'}`}
                      style={{
                        width: '12px', height: '12px',
                        borderRadius: '3px',
                        border: isToday ? `1.5px solid ${habitColor}` : 'none',
                        background: done
                          ? habitColor
                          : scheduled
                            ? 'var(--bg-3)'
                            : 'var(--bg-2)',
                        cursor: pending ? 'wait' : 'pointer',
                        opacity: pending ? 0.4 : scheduled ? 1 : 0.25,
                        transition: 'background 0.15s, opacity 0.15s',
                        flexShrink: 0,
                        boxSizing: 'border-box',
                      }}
                    />
                  )
                })}
              </div>
            </>
          )
        })()}
      </div>

      {/* ── Progress + month toggle ── */}
      <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Progress bar */}
        <div style={{ flex: 1 }}>
          <div style={{ height: '4px', background: 'var(--bg-3)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '4px', width: `${progressPct}%`, background: habitColor, transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)' }} />
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '4px', fontWeight: 500 }}>
            {progressPct}% completion · last 28 days
          </div>
        </div>
        {/* Month dropdown toggle */}
        <button
          onClick={() => setShowMonth(v => !v)}
          style={{
            background: showMonth ? `${habitColor}22` : 'var(--bg-2)',
            border: `1px solid ${showMonth ? `${habitColor}55` : 'var(--border)'}`,
            borderRadius: '8px', padding: '5px 11px',
            fontSize: '11px', fontWeight: 600,
            color: showMonth ? habitColor : 'var(--text-3)',
            cursor: 'pointer', transition: 'all 0.15s',
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            flexShrink: 0,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <rect x="1" y="2" width="12" height="11" rx="2"/>
            <path d="M4 1v2M10 1v2M1 6h12"/>
          </svg>
          {showMonth ? 'Hide ▲' : 'Month ▾'}
        </button>
      </div>

      {/* ── Monthly calendar dropdown ── */}
      {showMonth && (
        <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <button
              onClick={() => setMonthOffset(o => o - 1)}
              style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer', padding: '5px 10px', borderRadius: '7px', fontSize: '13px', fontWeight: 600, lineHeight: 1 }}
            >←</button>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>{monthName}</span>
            <button
              onClick={() => setMonthOffset(o => Math.min(o + 1, 0))}
              disabled={monthOffset >= 0}
              style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', color: monthOffset < 0 ? 'var(--text-2)' : 'var(--border)', cursor: monthOffset < 0 ? 'pointer' : 'default', padding: '5px 10px', borderRadius: '7px', fontSize: '13px', fontWeight: 600, lineHeight: 1 }}
            >→</button>
          </div>
          {/* Day labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
            {DOW_LABELS.map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: '9px', color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.04em', paddingBottom: '4px' }}>{d}</div>
            ))}
          </div>
          {/* Calendar grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
            {/* Leading empty cells */}
            {Array.from({ length: firstDow }, (_, i) => (
              <div key={`e-${i}`} />
            ))}
            {/* Day cells */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const dayNum  = i + 1
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
              const done      = loggedDates.has(dateStr)
              const scheduled = isScheduledOn(dateStr, habit.days_of_week ?? null)
              const isToday   = dateStr === today
              const isFuture  = dateStr > today
              return (
                <div
                  key={dateStr}
                  role="button"
                  tabIndex={isFuture ? -1 : 0}
                  onClick={() => !isFuture && onToggle(dateStr)}
                  onKeyDown={e => !isFuture && (e.key === 'Enter' || e.key === ' ') && onToggle(dateStr)}
                  style={{
                    aspectRatio: '1',
                    borderRadius: '7px',
                    border: isToday ? `2px solid ${habitColor}` : 'none',
                    background: done ? habitColor : scheduled && !isFuture ? 'var(--bg-3)' : 'transparent',
                    cursor: isFuture ? 'default' : 'pointer',
                    opacity: isFuture ? 0.25 : scheduled ? 1 : 0.2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: done ? 700 : 400,
                    color: done ? '#fff' : isToday ? habitColor : 'var(--text-2)',
                    transition: 'background 0.15s',
                    boxSizing: 'border-box',
                  }}
                >
                  {dayNum}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── HABIT MODAL ── */
function HabitModal({ mode, habit, today, activeGoals, onClose, onSaved }: {
  mode: 'add' | 'edit'
  habit?: HabitWithLogs
  today: string
  activeGoals: import('@/lib/types').Goal[]
  onClose: () => void
  onSaved: (h: HabitWithLogs) => void
}) {
  const [name,       setName]       = useState(habit?.name ?? '')
  const [emoji,      setEmoji]      = useState(habit?.emoji ?? '✨')
  const [motivation, setMotivation] = useState(habit?.motivation ?? '')
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(
    habit?.days_of_week && habit.days_of_week.length > 0 ? habit.days_of_week : []
  )
  const [endsAt,     setEndsAt]     = useState<string>(habit?.ends_at ?? '')
  const [goalId,          setGoalId]          = useState<string>(habit?.goal_id ?? '')
  const [goalTargetCount, setGoalTargetCount] = useState<number | null>(habit?.goal_target_count ?? null)
  const [error,           setError]           = useState('')
  const [isPending,  startTransition] = useTransition()

  const toggleDay = (d: number) => {
    setDaysOfWeek(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    )
  }

  const applyPreset = (preset: 'all' | 'weekdays' | 'weekends') => {
    if (preset === 'all')      setDaysOfWeek([])
    if (preset === 'weekdays') setDaysOfWeek([1, 2, 3, 4, 5])
    if (preset === 'weekends') setDaysOfWeek([0, 6])
  }

  const isPreset = (preset: 'all' | 'weekdays' | 'weekends') => {
    const sorted = [...daysOfWeek].sort((a, b) => a - b)
    if (preset === 'all')      return daysOfWeek.length === 0 || daysOfWeek.length === 7
    if (preset === 'weekdays') return JSON.stringify(sorted) === JSON.stringify([1, 2, 3, 4, 5])
    if (preset === 'weekends') return JSON.stringify(sorted) === JSON.stringify([0, 6])
    return false
  }

  const handleSubmit = () => {
    if (!name.trim()) { setError('Give your habit a name.'); return }
    setError('')
    const linkedGoalObj = activeGoals.find(g => g.id === goalId) ?? null
    const data: HabitFormData = { name: name.trim(), emoji, days_of_week: daysOfWeek, ends_at: endsAt || null, goal_id: goalId || null, goal_target_count: goalId ? goalTargetCount : null, motivation: motivation.trim() || null }
    const { target_count } = deriveFrequencyMeta(daysOfWeek)
    const todayDow = new Date(today + 'T12:00:00').getDay()
    const isScheduledToday = daysOfWeek.length === 0 || daysOfWeek.includes(todayDow)

    startTransition(async () => {
      try {
        if (mode === 'add') {
          const created = await createHabitAction(data)
          onSaved({
            ...created,
            days_of_week: daysOfWeek.length > 0 ? daysOfWeek : null,
            ends_at: endsAt || null,
            goal_id: goalId || null,
            goal_target_count: goalId ? goalTargetCount : null,
            motivation: motivation.trim() || null,
            target_count,
            logs: [],
            streak: 0,
            weekCompletions: 0,
            isScheduledToday,
            linkedGoal: linkedGoalObj ? { id: linkedGoalObj.id, title: linkedGoalObj.title, category: linkedGoalObj.category } : null,
          } as HabitWithLogs)
        } else if (habit) {
          await updateHabitAction(habit.id, data)
          onSaved({
            ...habit,
            name: name.trim(),
            emoji,
            days_of_week: daysOfWeek.length > 0 ? daysOfWeek : null,
            ends_at: endsAt || null,
            goal_id: goalId || null,
            goal_target_count: goalId ? goalTargetCount : null,
            motivation: motivation.trim() || null,
            target_count,
            isScheduledToday,
            linkedGoal: linkedGoalObj ? { id: linkedGoalObj.id, title: linkedGoalObj.title, category: linkedGoalObj.category } : null,
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  const presetBtn = (label: string, preset: 'all' | 'weekdays' | 'weekends') => (
    <button
      key={preset}
      onClick={() => applyPreset(preset)}
      style={{
        padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
        border: `1px solid ${isPreset(preset) ? 'rgba(212,168,83,0.4)' : 'var(--border)'}`,
        background: isPreset(preset) ? 'var(--gold-dim)' : 'var(--bg-3)',
        color: isPreset(preset) ? 'var(--gold)' : 'var(--text-2)',
        transition: 'all 0.15s',
      }}
    >{label}</button>
  )

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      className="modal-overlay"
      style={{ backdropFilter: 'blur(4px)', animation: 'fadeUp 0.15s var(--ease) both' }}
    >
      <div className="modal-box" style={{ padding: '32px', boxShadow: '0 8px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 400, color: 'var(--text-0)' }}>
            {mode === 'add' ? 'New habit' : 'Edit habit'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '22px', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Emoji</label>
              <input value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={4} style={{ ...inputStyle, textAlign: 'center', fontSize: '22px', padding: '8px 4px' }} />
            </div>
            <div>
              <label style={labelStyle}>Habit name</label>
              <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="e.g. Morning run" autoFocus style={inputStyle} />
            </div>
          </div>

          {/* ── Why field ── */}
          <div>
            <label style={labelStyle}>
              Why do you want this habit?
              <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-3)', fontSize: '10px' }}> (optional — helps the AI coach you)</span>
            </label>
            <textarea
              value={motivation}
              onChange={e => setMotivation(e.target.value)}
              placeholder="e.g. To have more energy in the mornings and feel less sluggish"
              rows={2}
              style={{
                ...inputStyle,
                resize: 'none',
                lineHeight: 1.5,
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div>
            <label style={labelStyle}>Quick pick</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {EMOJI_SUGGESTIONS.map(e => (
                <button key={e} onClick={() => setEmoji(e)}
                  style={{ width: '36px', height: '36px', borderRadius: '8px', background: emoji === e ? 'var(--gold-dim)' : 'var(--bg-3)', border: `1px solid ${emoji === e ? 'rgba(212,168,83,0.4)' : 'var(--border)'}`, fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Schedule</label>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
              {DOW_LABELS.map((lbl, d) => {
                const active = daysOfWeek.includes(d)
                const isAll  = daysOfWeek.length === 0
                return (
                  <button key={d} onClick={() => toggleDay(d)} title={DOW_NAMES[d]}
                    style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', background: active ? 'var(--gold)' : isAll ? 'rgba(212,168,83,0.12)' : 'var(--bg-3)', color: active ? '#131110' : isAll ? 'var(--gold)' : 'var(--text-2)', fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', outline: isAll && !active ? '1px dashed rgba(212,168,83,0.3)' : 'none' }}>
                    {lbl}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {presetBtn('Every day', 'all')}
              {presetBtn('Weekdays', 'weekdays')}
              {presetBtn('Weekends', 'weekends')}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '8px' }}>
              {daysOfWeek.length === 0
                ? 'Repeats every day'
                : `Repeats on: ${[...daysOfWeek].sort((a, b) => a - b).map(d => DOW_NAMES[d]).join(', ')}`
              }
              {' · '}
              <span style={{ color: 'var(--text-2)' }}>
                {daysOfWeek.length === 0 ? '7' : daysOfWeek.length}× per week
              </span>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Until <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-3)', fontSize: '10px' }}>(optional — leave blank for ongoing)</span></label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="date" value={endsAt} min={today} onChange={e => setEndsAt(e.target.value)} style={{ ...inputStyle, flex: 1, colorScheme: 'dark' }} />
              {endsAt && (
                <button onClick={() => setEndsAt('')} style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: 'var(--text-3)', cursor: 'pointer' }}>Clear</button>
              )}
            </div>
            {endsAt && (
              <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '6px' }}>
                {(() => {
                  const d = daysUntilEnd(endsAt)
                  return d !== null && d > 0 ? `${d} day${d === 1 ? '' : 's'} from today` : d === 0 ? 'Ends today' : 'Date is in the past'
                })()}
              </div>
            )}
          </div>

          {activeGoals.length > 0 && (() => {
            const selectedGoal = activeGoals.find(g => g.id === goalId) ?? null
            const isHabitTracked = selectedGoal?.tracking_mode === 'habits'
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Linked goal <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-3)', fontSize: '10px' }}>(optional)</span></label>
                  <select
                    value={goalId}
                    onChange={e => { setGoalId(e.target.value); setGoalTargetCount(null) }}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    <option value="">— No linked goal —</option>
                    {activeGoals.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.tracking_mode === 'habits' ? '⟳ ' : ''}{g.title}
                      </option>
                    ))}
                  </select>
                </div>

                {isHabitTracked && (
                  <div>
                    <label style={labelStyle}>
                      Target completions
                      <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-3)', fontSize: '10px' }}> (optional)</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={9999}
                      value={goalTargetCount ?? ''}
                      onChange={e => setGoalTargetCount(e.target.value ? Number(e.target.value) : null)}
                      placeholder="e.g. 30  —  leave blank to track by schedule"
                      style={inputStyle}
                    />
                    <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '5px' }}>
                      {goalTargetCount
                        ? `Progress = completions ÷ ${goalTargetCount} × 100%`
                        : 'Progress tracks how often you complete this vs. your schedule.'}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {error && (
            <div style={{ fontSize: '13px', color: '#e07060', background: 'rgba(200,80,60,0.08)', padding: '10px 14px', borderRadius: '8px' }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
            <button onClick={onClose} style={{ flex: 1, background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: '9px', padding: '12px', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSubmit} disabled={isPending} style={{ flex: 2, background: 'var(--gold)', color: '#131110', border: 'none', borderRadius: '9px', padding: '12px', fontSize: '14px', fontWeight: 700, cursor: isPending ? 'wait' : 'pointer', opacity: isPending ? 0.7 : 1 }}>
              {isPending ? 'Saving…' : mode === 'add' ? 'Add habit' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── SMALL HELPERS ── */
function SmallBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title?: string; danger?: boolean }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={e => { e.stopPropagation(); onClick() }} title={title}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov ? (danger ? 'rgba(192,57,43,0.15)' : 'var(--bg-3)') : 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '7px', padding: '5px 7px', cursor: 'pointer', color: danger ? '#e07060' : 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
      {children}
    </button>
  )
}
function PencilIcon() {
  return <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z"/></svg>
}
function TrashIcon() {
  return <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5h10M6 5V3h4v2M5 5l.5 8h5l.5-8"/></svg>
}
