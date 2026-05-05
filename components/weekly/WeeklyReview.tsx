'use client'

import { useState, useEffect } from 'react'
import type { CheckIn, HabitWithLogs, Goal } from '@/lib/types'
import type { WeeklyReflection, WeeklyGrade } from '@/lib/ai/weekly-prompts'
import type { StoredWeeklyReflection } from '@/lib/db/weekly-reflections'
import WeeklyHistory, { GradePicker, GradeBadge } from '@/components/review/WeeklyHistory'

type Props = {
  checkins: CheckIn[]
  habits: HabitWithLogs[]
  goals: Goal[]
  initialReflection: WeeklyReflection | null
  pastReflections?: StoredWeeklyReflection[]
}

/* ── Week helpers ── */
function getWeekNumber(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

/** Returns info about the week `offset` weeks ago (0 = this week). */
function getOffsetWeekInfo(offset: number) {
  const today = new Date()
  const dow = today.getDay() || 7
  const monday = new Date(today)
  monday.setDate(today.getDate() - dow + 1 - offset * 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const weekNumber = getWeekNumber(monday)
  const year = monday.getFullYear()
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const weekRange = `${monday.toLocaleDateString('en-US', opts)} – ${sunday.toLocaleDateString('en-US', opts)}, ${year}`

  // Mon–Sun date strings for filtering
  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    dates.push(d.toLocaleDateString('en-CA'))
  }

  return { weekNumber, year, weekRange, monday, dates }
}

// Parse <<highlighted>> markers into React spans
function HighlightedText({ text }: { text: string }) {
  const parts = text.split(/<<(.+?)>>/)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} style={{ background: 'rgba(212,168,83,0.18)', color: 'var(--gold)', borderRadius: '3px', padding: '1px 4px', fontStyle: 'normal' }}>
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

export default function WeeklyReview({ checkins, habits, goals, initialReflection, pastReflections = [] }: Props) {
  const today = new Date()
  const currentWeekInfo = getOffsetWeekInfo(0)
  const cacheKey = `locus-weekly-${currentWeekInfo.year}-w${currentWeekInfo.weekNumber}`

  const [weekOffset, setWeekOffset] = useState(0)
  const [reflection, setReflection] = useState<WeeklyReflection | null>(initialReflection ?? null)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [currentGrade, setCurrentGrade] = useState<WeeklyGrade['letter'] | null>(
    initialReflection?.grade?.letter ?? null
  )

  // On mount: sync localStorage with DB, clean up stale entries from old weeks
  useEffect(() => {
    if (initialReflection) {
      try { localStorage.setItem(cacheKey, JSON.stringify(initialReflection)) } catch {}
    } else {
      try {
        const cached = localStorage.getItem(cacheKey)
        if (cached) setReflection(JSON.parse(cached))
      } catch {}
    }
    // Clean up localStorage entries from weeks other than the current week
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('locus-weekly-') && k !== cacheKey)
        .forEach(k => localStorage.removeItem(k))
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const maxOffset = pastReflections.length  // Can go back as many weeks as we have reflections

  /* ── Derived data for the displayed week ── */
  const weekInfo = getOffsetWeekInfo(weekOffset)
  const isPastWeek = weekOffset > 0

  // For past weeks: look up stored reflection
  const pastStored = isPastWeek
    ? pastReflections.find(r => r.week_number === weekInfo.weekNumber && r.year === weekInfo.year) ?? null
    : null
  const displayedReflection = isPastWeek ? pastStored?.reflection ?? null : reflection
  const displayedGrade = isPastWeek
    ? pastStored?.reflection?.grade?.letter ?? null
    : currentGrade

  // Filter checkins and habit logs for the displayed week
  const weekDates = weekInfo.dates
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const weekDayData = dayNames.map((label, i) => {
    const dateStr = weekDates[i]
    const checkin = checkins.find(c => c.date === dateStr)
    const isToday = !isPastWeek && dateStr === today.toLocaleDateString('en-CA')
    return { label, dateStr, energy: checkin?.energy_level ?? null, isToday }
  })

  const weekCheckins = checkins.filter(c => weekDates.includes(c.date))
  const maxEnergy = 10
  const avgEnergy = weekCheckins.length
    ? (weekCheckins.reduce((s, c) => s + c.energy_level, 0) / weekCheckins.length).toFixed(1)
    : null

  // Habit completions for the displayed week (filter logs by week dates)
  const weekDateSet = new Set(weekDates)
  const habitsForWeek = habits.map(h => {
    const weekLogs = h.logs.filter(l => weekDateSet.has(l.logged_date))
    return { ...h, weekCompletions: weekLogs.length, weekLogDates: new Set(weekLogs.map(l => l.logged_date)) }
  })
  const totalTarget = habitsForWeek.reduce((s, h) => s + h.target_count, 0)
  const totalDone   = habitsForWeek.reduce((s, h) => s + h.weekCompletions, 0)
  const habitRate   = totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0

  /* ── Generate reflection (current week only) ── */
  const generate = async (force = false) => {
    if (generating || isPastWeek) return
    if (reflection && !force) return
    setGenerating(true)
    setGenError(null)
    try {
      const res = await fetch('/api/weekly/generate', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.detail ?? json.error ?? `HTTP ${res.status}`)
      setReflection(json.reflection)
      localStorage.setItem(cacheKey, JSON.stringify(json.reflection))
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="page-pad" style={{ maxWidth: '900px', width: '100%', marginLeft: 'auto', marginRight: 'auto', animation: 'fadeUp 0.3s var(--ease) both' }}>

      {/* ── Header with week navigation ── */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          {/* Left arrow — go to older week */}
          <button
            onClick={() => setWeekOffset(o => Math.min(o + 1, maxOffset))}
            disabled={weekOffset >= maxOffset}
            title="Previous week"
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '7px', color: weekOffset >= maxOffset ? 'var(--text-3)' : 'var(--text-2)', cursor: weekOffset >= maxOffset ? 'default' : 'pointer', padding: '4px 9px', fontSize: '13px', opacity: weekOffset >= maxOffset ? 0.3 : 1, flexShrink: 0 }}
          >
            ←
          </button>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: isPastWeek ? 'var(--text-3)' : 'var(--gold)', fontWeight: 600, opacity: 0.85 }}>
              {isPastWeek ? `Week ${weekInfo.weekNumber} · ${weekInfo.weekRange}` : `Week ${weekInfo.weekNumber} · ${weekInfo.weekRange}`}
            </div>
          </div>

          {/* Right arrow — go to newer week / back to current */}
          <button
            onClick={() => setWeekOffset(o => Math.max(o - 1, 0))}
            disabled={weekOffset === 0}
            title={weekOffset === 0 ? 'This is the current week' : 'Next week'}
            style={{ background: weekOffset > 0 ? 'var(--gold-dim)' : 'none', border: `1px solid ${weekOffset > 0 ? 'rgba(212,168,83,0.25)' : 'var(--border)'}`, borderRadius: '7px', color: weekOffset === 0 ? 'var(--text-3)' : 'var(--gold)', cursor: weekOffset === 0 ? 'default' : 'pointer', padding: '4px 9px', fontSize: '13px', opacity: weekOffset === 0 ? 0.3 : 1, flexShrink: 0 }}
          >
            →
          </button>
        </div>

        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '34px', fontWeight: 400, color: 'var(--text-0)', lineHeight: 1.15 }}>
          {isPastWeek
            ? <><em style={{ fontStyle: 'italic', color: 'var(--text-1)' }}>Week {weekOffset} ago,</em> reflected.</>
            : <>Your week, <em style={{ fontStyle: 'italic', color: 'var(--text-1)' }}>reflected.</em></>
          }
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-2)', marginTop: '6px' }}>
          {weekCheckins.length} check-ins · {avgEnergy ? `avg energy ${avgEnergy}/10` : 'no energy data'} · {habitRate}% habit rate
        </div>
      </div>

      {/* ── ENERGY CHART ── */}
      <div style={{ background: 'var(--glass-card-bg)', backdropFilter: 'blur(32px) saturate(180%)', WebkitBackdropFilter: 'blur(32px) saturate(180%)', border: '1px solid var(--glass-card-border)', boxShadow: 'var(--glass-card-shadow-sm)', borderRadius: 'var(--radius-lg)', padding: '22px 24px', marginBottom: '16px' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 600, marginBottom: '18px' }}>
          Energy {isPastWeek ? `week ${weekInfo.weekNumber}` : 'this week'} {avgEnergy ? `· avg ${avgEnergy}/10` : ''}
        </div>
        <div className="energy-week-grid">
          {weekDayData.map(day => {
            const pct = day.energy ? (day.energy / maxEnergy) * 100 : 0
            const color = day.energy
              ? day.energy >= 7
                ? 'linear-gradient(180deg, #7ab89a 0%, #4a8a6a 100%)'
                : day.energy >= 5
                  ? 'linear-gradient(180deg, #d4a853 0%, #a07830 100%)'
                  : 'linear-gradient(180deg, #c08860 0%, #8a5838 100%)'
              : undefined
            return (
              <div key={day.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: day.isToday ? 'var(--gold)' : 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontWeight: 700 }}>
                  {day.label}
                </div>
                <div style={{ height: '72px', borderRadius: '8px', background: 'var(--bg-3)', position: 'relative', overflow: 'hidden' }}>
                  {day.energy && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, borderRadius: '8px', background: color, height: `${pct}%`, transition: 'height 1s cubic-bezier(0.22,1,0.36,1)' }} />
                  )}
                </div>
                <div style={{ fontSize: '12px', color: day.energy ? 'var(--text-1)' : 'var(--text-3)', marginTop: '6px', fontWeight: day.isToday ? 700 : 400 }}>
                  {day.energy ?? '—'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── AI WEEKLY REFLECTION ── */}

      {/* Current week: prompt to generate */}
      {!isPastWeek && !displayedReflection && !generating && (
        <div style={{ background: 'var(--glass-card-bg)', backdropFilter: 'blur(32px) saturate(180%)', WebkitBackdropFilter: 'blur(32px) saturate(180%)', border: '1px solid var(--glass-card-border)', boxShadow: 'var(--glass-card-shadow-sm)', borderRadius: 'var(--radius-xl)', padding: '32px', marginBottom: '16px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: 300, color: 'var(--text-1)', marginBottom: '8px' }}>
            Get your AI weekly reflection
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '20px', lineHeight: 1.6 }}>
            Claude analyzes your energy, habits, and goals to write a personalized week-in-review.
          </div>
          {genError && (
            <div style={{ fontSize: '12px', color: '#e07060', fontFamily: 'monospace', background: 'var(--bg-3)', borderRadius: '6px', padding: '8px 12px', marginBottom: '14px' }}>
              {genError}
            </div>
          )}
          <button
            onClick={() => generate()}
            style={{ background: 'var(--gold)', color: '#131110', border: 'none', borderRadius: '10px', padding: '12px 28px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
          >
            Generate Week {weekInfo.weekNumber} Reflection →
          </button>
        </div>
      )}

      {/* Past week: no reflection stored */}
      {isPastWeek && !displayedReflection && (
        <div style={{ background: 'var(--glass-card-bg)', backdropFilter: 'blur(32px) saturate(180%)', WebkitBackdropFilter: 'blur(32px) saturate(180%)', border: '1px solid var(--glass-card-border)', boxShadow: 'var(--glass-card-shadow-sm)', borderRadius: 'var(--radius-xl)', padding: '28px 32px', marginBottom: '16px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 300, color: 'var(--text-2)' }}>
            No reflection was generated for this week.
          </div>
        </div>
      )}

      {/* Generating spinner */}
      {generating && (
        <div style={{ background: 'var(--glass-card-bg)', backdropFilter: 'blur(32px) saturate(180%)', WebkitBackdropFilter: 'blur(32px) saturate(180%)', border: '1px solid var(--glass-card-border)', boxShadow: 'var(--glass-card-shadow)', borderRadius: 'var(--radius-xl)', padding: '40px', marginBottom: '16px', textAlign: 'center' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid var(--bg-4)', borderTopColor: 'var(--gold)', animation: 'spin 0.9s linear infinite', margin: '0 auto 16px' }} />
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 300, color: 'var(--text-1)' }}>
            Writing your week {weekInfo.weekNumber} reflection…
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '8px' }}>
            Claude is analyzing your energy, habits, and progress.
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Reflection card */}
      {displayedReflection && !generating && (
        <div style={{ background: 'var(--glass-card-bg)', backdropFilter: 'blur(32px) saturate(180%)', WebkitBackdropFilter: 'blur(32px) saturate(180%)', border: '1px solid var(--glass-card-border)', boxShadow: 'var(--glass-card-shadow)', borderRadius: 'var(--radius-xl)', padding: '28px 32px', marginBottom: '16px', animation: 'fadeUp 0.25s var(--ease) both' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'var(--gold-dim)', border: '1px solid rgba(212,168,83,0.22)', borderRadius: '20px', padding: '4px 12px 4px 8px', fontSize: '10.5px', color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--gold)', animation: isPastWeek ? 'none' : 'pulse 2s ease-in-out infinite' }} />
              Locus AI · Week {weekInfo.weekNumber} Reflection
            </div>
            {!isPastWeek && (
              <button
                onClick={() => generate(true)}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '7px', color: 'var(--text-3)', fontSize: '11px', padding: '4px 10px', cursor: 'pointer', letterSpacing: '0.03em' }}
              >
                Regenerate
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
            {displayedReflection.paragraphs.map((p, i) => (
              <p key={i} style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 300, color: 'var(--ai-card-text)', lineHeight: 1.75, letterSpacing: '0.01em', margin: 0 }}>
                <HighlightedText text={p} />
              </p>
            ))}
          </div>

          <div className="two-col">
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '18px 20px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--sage)', marginBottom: '14px' }}>What Worked</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {displayedReflection.what_worked.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--sage)', fontSize: '13px', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>✓</span>
                    <span style={{ fontSize: '13.5px', color: 'var(--text-1)', lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '18px 20px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '14px' }}>What to Adjust</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {displayedReflection.what_to_adjust.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--gold)', fontSize: '13px', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>→</span>
                    <span style={{ fontSize: '13.5px', color: 'var(--text-1)', lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HABIT STREAKS ── */}
      {habitsForWeek.length > 0 && (
        <div style={{ background: 'var(--glass-card-bg)', backdropFilter: 'blur(32px) saturate(180%)', WebkitBackdropFilter: 'blur(32px) saturate(180%)', border: '1px solid var(--glass-card-border)', boxShadow: 'var(--glass-card-shadow-sm)', borderRadius: 'var(--radius-lg)', padding: '22px 24px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 600, marginBottom: '16px' }}>
            Habit Completions · Week {weekInfo.weekNumber}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
            {habitsForWeek.map(habit => {
              const rate = habit.target_count > 0
                ? Math.round((habit.weekCompletions / habit.target_count) * 100)
                : 0
              return (
                <div key={habit.id} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{habit.emoji}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '10px' }}>{habit.name}</div>
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginBottom: '8px' }}>
                    {weekDates.map(date => (
                      <div key={date} style={{ width: '9px', height: '9px', borderRadius: '50%', background: habit.weekLogDates.has(date) ? 'var(--sage)' : 'var(--bg-4)' }} />
                    ))}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                    <span style={{ color: rate >= 100 ? 'var(--sage)' : rate >= 70 ? 'var(--gold)' : 'var(--text-2)', fontWeight: 700 }}>
                      {habit.weekCompletions}/{habit.target_count}
                    </span>
                    {' '}this week
                  </div>
                  {!isPastWeek && habit.streak > 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>
                      {habit.streak >= 14 ? '🔥' : habit.streak >= 7 ? '⚡' : ''} {habit.streak}d streak
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {weekCheckins.length === 0 && (
        <div style={{ background: 'var(--glass-card-bg)', backdropFilter: 'blur(32px) saturate(180%)', WebkitBackdropFilter: 'blur(32px) saturate(180%)', border: '1px solid var(--glass-card-border)', boxShadow: 'var(--glass-card-shadow-sm)', borderRadius: 'var(--radius-lg)', padding: '28px 24px', textAlign: 'center', marginTop: '16px' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 300, color: 'var(--text-2)' }}>No check-ins {isPastWeek ? 'that week' : 'this week yet'}.</div>
          {!isPastWeek && <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '6px' }}>Check in daily to unlock your weekly AI reflection.</div>}
        </div>
      )}

      {/* ── Grade ── */}
      {displayedReflection && !generating && (
        <div style={{ background: 'var(--glass-card-bg)', backdropFilter: 'blur(32px) saturate(180%)', WebkitBackdropFilter: 'blur(32px) saturate(180%)', border: '1px solid var(--glass-card-border)', boxShadow: 'var(--glass-card-shadow-sm)', borderRadius: 'var(--radius-lg)', padding: '18px 22px', marginTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: (isPastWeek || currentGrade) ? '0' : '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>
                {displayedGrade ? 'Week grade' : 'How was this week?'}
              </span>
              {displayedGrade && <GradeBadge letter={displayedGrade} size="md" />}
            </div>
            {!isPastWeek && currentGrade && (
              <button
                onClick={() => setCurrentGrade(null)}
                style={{ background: 'none', border: 'none', fontSize: '11px', color: 'var(--text-3)', cursor: 'pointer', padding: '2px 6px' }}
              >
                change
              </button>
            )}
          </div>
          {!isPastWeek && !currentGrade && (
            <GradePicker
              weekNumber={weekInfo.weekNumber}
              year={weekInfo.year}
              initial={currentGrade ?? undefined}
              onSaved={setCurrentGrade}
            />
          )}
        </div>
      )}

      {/* ── Past weeks history (only shown on current week view) ── */}
      {!isPastWeek && <WeeklyHistory rows={pastReflections} />}
    </div>
  )
}
