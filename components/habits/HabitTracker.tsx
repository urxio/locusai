'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { HabitWithLogs, Habit } from '@/lib/types'
import {
  logHabitAction, unlogHabitAction,
  createHabitAction, updateHabitAction, deleteHabitAction,
  type HabitFormData,
} from '@/app/actions/habits'
import HabitCalendar from './HabitCalendar'

/* ── CONSTANTS ── */
const FREQ_OPTIONS = [
  { value: 'daily',    label: 'Daily',         sub: '7× per week' },
  { value: '3x_week',  label: '3× per week',   sub: 'Mon / Wed / Fri' },
  { value: 'weekdays', label: 'Weekdays',       sub: '5× per week' },
] as const

const FREQ_LABEL: Record<string, string> = {
  daily: 'Daily', '3x_week': '3× / week', weekdays: 'Weekdays',
}

const EMOJI_SUGGESTIONS = ['🏃','📚','🧘','💪','✍️','💧','🥗','😴','🎸','🧹','🌿','🏊']

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

function dayLabel(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'narrow' })
}

function computeStreak(loggedDates: Set<string>, today: string): number {
  let streak = 0
  let cur = today
  while (loggedDates.has(cur)) {
    streak++
    const d = new Date(cur + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    cur = d.toISOString().split('T')[0]
  }
  return streak
}

type LogMap = Map<string, Set<string>> // habitId → Set<dateString>
type ModalState = null | { mode: 'add' } | { mode: 'edit'; habit: HabitWithLogs }
type ViewMode = 'list' | 'calendar'

/* ── MAIN COMPONENT ── */
export default function HabitTracker({ habits: initial, today }: { habits: HabitWithLogs[]; today: string }) {
  const [habits, setHabits] = useState<HabitWithLogs[]>(initial)
  const [modal, setModal]   = useState<ModalState>(null)
  const [view,  setView]    = useState<ViewMode>('list')
  const router = useRouter()

  // logMap: per-habit logged dates (last 7 days)
  const [logMap, setLogMap] = useState<LogMap>(() => {
    const m = new Map<string, Set<string>>()
    initial.forEach(h => m.set(h.id, new Set(h.logs.map(l => l.logged_date))))
    return m
  })

  // pendingSet: `${habitId}:${date}` keys currently in-flight
  const [pendingSet, setPendingSet] = useState<Set<string>>(new Set())

  const last7 = getLast7Days(today)

  const toggleLog = async (habitId: string, date: string) => {
    const key = `${habitId}:${date}`
    if (pendingSet.has(key)) return

    const dates = logMap.get(habitId) ?? new Set<string>()
    const wasDone = dates.has(date)

    // Optimistic
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
      // Revert
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

  // Progress: today's completion
  const doneToday = habits.filter(h => (logMap.get(h.id) ?? new Set()).has(today)).length
  const totalCount = habits.length
  const progressPct = totalCount > 0 ? (doneToday / totalCount) * 100 : 0
  const now = new Date()

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
                ? 'Tap today\'s dot to log. Tap any past dot to edit history.'
                : 'Click any past dot to toggle a habit log for that day.'}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0, marginTop: '6px' }}>
            {/* View toggle */}
            <div style={{ display: 'flex', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '9px', padding: '3px', gap: '2px' }}>
              <button
                onClick={() => setView('list')}
                className="icon-btn"
                style={{ padding: '6px 14px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, transition: 'all 0.15s', background: view === 'list' ? 'var(--bg-0)' : 'transparent', color: view === 'list' ? 'var(--text-0)' : 'var(--text-3)', boxShadow: view === 'list' ? '0 1px 4px rgba(0,0,0,0.2)' : 'none' }}
              >
                List
              </button>
              <button
                onClick={() => setView('calendar')}
                className="icon-btn"
                style={{ padding: '6px 14px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, transition: 'all 0.15s', background: view === 'calendar' ? 'var(--bg-0)' : 'transparent', color: view === 'calendar' ? 'var(--text-0)' : 'var(--text-3)', boxShadow: view === 'calendar' ? '0 1px 4px rgba(0,0,0,0.2)' : 'none' }}
              >
                Calendar
              </button>
            </div>
            <button
              onClick={() => setModal({ mode: 'add' })}
              style={{ background: 'var(--gold)', color: '#131110', border: 'none', borderRadius: '10px', padding: '11px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              + Add habit
            </button>
          </div>
        </div>

        {/* Progress bar — list view only */}
        {view === 'list' && habits.length > 0 && (
          <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 22px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today's progress</span>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: 400, color: doneToday === totalCount ? 'var(--sage)' : 'var(--text-0)' }}>
                {doneToday}<span style={{ fontSize: '14px', color: 'var(--text-2)' }}>/{totalCount}</span>
              </span>
            </div>
            <div style={{ height: '5px', background: 'var(--bg-4)', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '5px', width: `${progressPct}%`, transition: 'width 0.5s cubic-bezier(0.22,1,0.36,1)', background: doneToday === totalCount ? 'linear-gradient(90deg, var(--sage), #a0c8a8)' : 'linear-gradient(90deg, var(--gold), #e8b86d)' }} />
            </div>
            {doneToday === totalCount && totalCount > 0 && (
              <div style={{ fontSize: '12px', color: 'var(--sage)', marginTop: '8px', fontWeight: 600 }}>✓ All habits complete for today</div>
            )}
          </div>
        )}

        {/* Empty state */}
        {habits.length === 0 && (
          <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-xl)', padding: '48px', textAlign: 'center' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {habits.map(habit => {
              const loggedDates = logMap.get(habit.id) ?? new Set<string>()
              const streak = computeStreak(loggedDates, today)
              return (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  loggedDates={loggedDates}
                  streak={streak}
                  last7={last7}
                  today={today}
                  pendingSet={pendingSet}
                  onToggle={(date) => toggleLog(habit.id, date)}
                  onEdit={() => setModal({ mode: 'edit', habit })}
                  onDelete={() => handleDeleted(habit.id)}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <HabitModal
          mode={modal.mode}
          habit={modal.mode === 'edit' ? modal.habit : undefined}
          today={today}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}

/* ── HABIT CARD ── */
function HabitCard({ habit, loggedDates, streak, last7, today, pendingSet, onToggle, onEdit, onDelete }: {
  habit: HabitWithLogs
  loggedDates: Set<string>
  streak: number
  last7: string[]
  today: string
  pendingSet: Set<string>
  onToggle: (date: string) => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isPending, startTransition] = useTransition()

  const todayDone = loggedDates.has(today)

  const handleDelete = () => {
    startTransition(async () => {
      await deleteHabitAction(habit.id)
      onDelete()
    })
  }

  return (
    <div
      style={{ background: todayDone ? 'linear-gradient(135deg, rgba(122,158,138,0.14) 0%, rgba(122,158,138,0.05) 100%)' : 'var(--bg-1)', border: `1px solid ${todayDone ? 'rgba(122,158,138,0.3)' : hovered ? 'var(--border-md)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: '16px 20px', transition: 'all 0.2s var(--ease)' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false) }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>

        {/* Today's toggle button */}
        <button
          onClick={() => onToggle(today)}
          title={todayDone ? 'Mark undone' : 'Mark done today'}
          style={{ width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0, background: todayDone ? 'var(--sage)' : 'var(--bg-3)', border: `2px solid ${todayDone ? 'var(--sage)' : 'var(--border-md)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: pendingSet.has(`${habit.id}:${today}`) ? 'wait' : 'pointer', transition: 'all 0.2s var(--ease)', boxShadow: todayDone ? '0 2px 10px rgba(122,158,138,0.3)' : 'none', opacity: pendingSet.has(`${habit.id}:${today}`) ? 0.6 : 1 }}
        >
          {todayDone
            ? <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9.5l3.5 3.5 6.5-7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            : <span style={{ fontSize: '20px' }}>{habit.emoji}</span>
          }
        </button>

        {/* Name + dots */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            {todayDone && <span style={{ fontSize: '14px' }}>{habit.emoji}</span>}
            <span style={{ fontSize: '15px', fontWeight: 600, color: todayDone ? 'var(--sage)' : 'var(--text-0)', transition: 'color 0.2s' }}>
              {habit.name}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              {FREQ_LABEL[habit.frequency]}
            </span>
          </div>

          {/* 7-day dots — each individually clickable */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
            {last7.map(date => {
              const done = loggedDates.has(date)
              const isToday = date === today
              const isPendingDot = pendingSet.has(`${habit.id}:${date}`)
              return (
                <button
                  key={date}
                  onClick={() => onToggle(date)}
                  title={`${date} — ${done ? 'click to unlog' : 'click to log'}`}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', background: 'none', border: 'none', padding: '2px', cursor: isPendingDot ? 'wait' : 'pointer', opacity: isPendingDot ? 0.5 : 1, borderRadius: '4px', transition: 'opacity 0.15s' }}
                >
                  <div style={{
                    width: isToday ? '12px' : '9px',
                    height: isToday ? '12px' : '9px',
                    borderRadius: '50%',
                    background: done ? 'var(--sage)' : isToday ? 'rgba(212,168,83,0.25)' : 'var(--bg-4)',
                    border: isToday ? `2px solid ${done ? 'var(--sage)' : 'var(--gold)'}` : done ? 'none' : '1px solid var(--bg-4)',
                    transition: 'background 0.15s, transform 0.15s',
                    transform: isToday ? 'scale(1)' : 'scale(1)',
                  }} />
                  <span style={{ fontSize: '8px', color: isToday ? 'var(--gold)' : 'var(--text-3)', fontWeight: isToday ? 700 : 400, lineHeight: 1 }}>
                    {dayLabel(date)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Streak + actions */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
          {/* Edit / delete — visible on hover */}
          {hovered && !confirmDelete && (
            <div style={{ display: 'flex', gap: '4px' }}>
              <SmallBtn title="Edit" onClick={onEdit}><PencilIcon /></SmallBtn>
              <SmallBtn title="Delete" danger onClick={() => setConfirmDelete(true)}><TrashIcon /></SmallBtn>
            </div>
          )}
          {confirmDelete && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>Delete?</span>
              <button onClick={handleDelete} disabled={isPending} style={{ background: '#c0392b', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>Yes</button>
              <button onClick={() => setConfirmDelete(false)} style={{ background: 'var(--bg-3)', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer' }}>No</button>
            </div>
          )}
          {/* Streak */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 300, color: streak > 0 ? 'var(--gold)' : 'var(--text-3)', lineHeight: 1 }}>{streak}</div>
            <div style={{ fontSize: '9px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              {streak === 1 ? 'day' : 'days'}
            </div>
            {streak >= 3 && <div style={{ fontSize: '13px', marginTop: '1px' }}>{streak >= 30 ? '🔥🔥' : streak >= 14 ? '🔥' : '⚡'}</div>}
          </div>
        </div>

      </div>
    </div>
  )
}

/* ── HABIT MODAL ── */
function HabitModal({ mode, habit, today, onClose, onSaved }: {
  mode: 'add' | 'edit'
  habit?: HabitWithLogs
  today: string
  onClose: () => void
  onSaved: (h: HabitWithLogs) => void
}) {
  const [name, setName]       = useState(habit?.name ?? '')
  const [emoji, setEmoji]     = useState(habit?.emoji ?? '✨')
  const [freq, setFreq]       = useState<HabitFormData['frequency']>(habit?.frequency ?? 'daily')
  const [error, setError]     = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    if (!name.trim()) { setError('Give your habit a name.'); return }
    setError('')
    const data: HabitFormData = { name: name.trim(), emoji, frequency: freq }
    startTransition(async () => {
      try {
        if (mode === 'add') {
          await createHabitAction(data)
          const target = freq === 'daily' ? 7 : freq === '3x_week' ? 3 : 5
          onSaved({ id: crypto.randomUUID(), user_id: '', created_at: new Date().toISOString(), ...data, target_count: target, logs: [], streak: 0, weekCompletions: 0 } as HabitWithLogs)
        } else if (habit) {
          await updateHabitAction(habit.id, data)
          const target = freq === 'daily' ? 7 : freq === '3x_week' ? 3 : 5
          onSaved({ ...habit, ...data, target_count: target })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Emoji + name row */}
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

          {/* Emoji suggestions */}
          <div>
            <label style={labelStyle}>Quick pick</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {EMOJI_SUGGESTIONS.map(e => (
                <button key={e} onClick={() => setEmoji(e)} style={{ width: '36px', height: '36px', borderRadius: '8px', background: emoji === e ? 'var(--gold-dim)' : 'var(--bg-3)', border: `1px solid ${emoji === e ? 'rgba(212,168,83,0.4)' : 'var(--border)'}`, fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label style={labelStyle}>Frequency</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {FREQ_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFreq(opt.value)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', background: freq === opt.value ? 'var(--gold-dim)' : 'var(--bg-3)', border: `1px solid ${freq === opt.value ? 'rgba(212,168,83,0.35)' : 'var(--border)'}`, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left' }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 600, color: freq === opt.value ? 'var(--gold)' : 'var(--text-0)' }}>{opt.label}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{opt.sub}</span>
                </button>
              ))}
            </div>
          </div>

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
