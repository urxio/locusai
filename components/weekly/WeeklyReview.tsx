'use client'

import { useState, useEffect } from 'react'
import type { CheckIn, HabitWithLogs, Goal } from '@/lib/types'
import type { WeeklyReflection } from '@/lib/ai/weekly-prompts'

type Props = {
  checkins: CheckIn[]
  habits: HabitWithLogs[]
  goals: Goal[]
  initialReflection: WeeklyReflection | null
}

function getWeekNumber(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function getWeekRange(today: Date) {
  const dow = today.getDay() || 7
  const mon = new Date(today); mon.setDate(today.getDate() - dow + 1)
  const sun = new Date(today); sun.setDate(today.getDate() - dow + 7)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${mon.toLocaleDateString('en-US', opts)} – ${sun.toLocaleDateString('en-US', opts)}, ${today.getFullYear()}`
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

export default function WeeklyReview({ checkins, habits, goals, initialReflection }: Props) {
  const today = new Date()
  const weekNumber = getWeekNumber(today)
  const weekRange  = getWeekRange(today)
  const cacheKey   = `locus-weekly-${today.getFullYear()}-w${weekNumber}`

  // initialReflection from DB takes priority; fall back to localStorage
  const [reflection, setReflection] = useState<WeeklyReflection | null>(initialReflection ?? null)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  // Sync localStorage with DB value on mount (also catches stale local cache)
  useEffect(() => {
    if (initialReflection) {
      // DB is authoritative — write to localStorage so it's available offline
      try { localStorage.setItem(cacheKey, JSON.stringify(initialReflection)) } catch {}
    } else {
      // Nothing in DB — try localStorage as fallback (older entries)
      try {
        const cached = localStorage.getItem(cacheKey)
        if (cached) setReflection(JSON.parse(cached))
      } catch {}
    }
  }, [cacheKey, initialReflection])

  const generate = async (force = false) => {
    if (generating) return
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

  // Energy chart data — 7 days Mon→Sun
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const weekDays = dayNames.map((label, i) => {
    const d = new Date(today)
    const dow = today.getDay() || 7
    d.setDate(today.getDate() - dow + 1 + i)
    const dateStr = d.toLocaleDateString('en-CA')  // YYYY-MM-DD in local time
    const checkin = checkins.find(c => c.date === dateStr)
    const isToday = dateStr === today.toLocaleDateString('en-CA')
    return { label, dateStr, energy: checkin?.energy_level ?? null, isToday }
  })

  const maxEnergy = 10
  const avgEnergy = checkins.length
    ? (checkins.reduce((s, c) => s + c.energy_level, 0) / checkins.length).toFixed(1)
    : null

  const totalTarget = habits.reduce((s, h) => s + h.target_count, 0)
  const totalDone   = habits.reduce((s, h) => s + h.weekCompletions, 0)
  const habitRate   = totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0

  return (
    <div className="page-pad" style={{ maxWidth: '900px', animation: 'fadeUp 0.3s var(--ease) both' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 600, marginBottom: '6px', opacity: 0.85 }}>
          Week {weekNumber} · {weekRange}
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '34px', fontWeight: 400, color: 'var(--text-0)', lineHeight: 1.15 }}>
          Your week, <em style={{ fontStyle: 'italic', color: 'var(--text-1)' }}>reflected.</em>
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-2)', marginTop: '6px' }}>
          {checkins.length} check-ins · {avgEnergy ? `avg energy ${avgEnergy}/10` : 'no energy data'} · {habitRate}% habit rate
        </div>
      </div>

      {/* ── ENERGY CHART ── */}
      <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '22px 24px', marginBottom: '16px' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 600, marginBottom: '18px' }}>
          Energy this week {avgEnergy ? `· avg ${avgEnergy}/10` : ''}
        </div>
        <div className="energy-week-grid">
          {weekDays.map(day => {
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
      {!reflection && !generating && (
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-xl)', padding: '32px', marginBottom: '16px', textAlign: 'center' }}>
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
            Generate Week {weekNumber} Reflection →
          </button>
        </div>
      )}

      {generating && (
        <div style={{ background: 'var(--ai-card-bg)', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-xl)', padding: '40px', marginBottom: '16px', textAlign: 'center' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid var(--bg-4)', borderTopColor: 'var(--gold)', animation: 'spin 0.9s linear infinite', margin: '0 auto 16px' }} />
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 300, color: 'var(--text-1)' }}>
            Writing your week {weekNumber} reflection…
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '8px' }}>
            Claude is analyzing your energy, habits, and progress.
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {reflection && !generating && (
        <div style={{ background: 'var(--ai-card-bg)', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-xl)', padding: '28px 32px', marginBottom: '16px' }}>
          {/* Badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'var(--gold-dim)', border: '1px solid rgba(212,168,83,0.22)', borderRadius: '20px', padding: '4px 12px 4px 8px', fontSize: '10.5px', color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--gold)', animation: 'pulse 2s ease-in-out infinite' }} />
              Locus AI · Week {weekNumber} Reflection
            </div>
            <button
              onClick={() => generate(true)}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '7px', color: 'var(--text-3)', fontSize: '11px', padding: '4px 10px', cursor: 'pointer', letterSpacing: '0.03em' }}
            >
              Regenerate
            </button>
          </div>

          {/* Paragraphs with highlights */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
            {reflection.paragraphs.map((p, i) => (
              <p key={i} style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 300, color: 'var(--ai-card-text)', lineHeight: 1.75, letterSpacing: '0.01em', margin: 0 }}>
                <HighlightedText text={p} />
              </p>
            ))}
          </div>

          {/* What worked / What to adjust */}
          <div className="two-col">
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '18px 20px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--sage)', marginBottom: '14px' }}>
                What Worked
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {reflection.what_worked.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--sage)', fontSize: '13px', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>✓</span>
                    <span style={{ fontSize: '13.5px', color: 'var(--text-1)', lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '18px 20px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '14px' }}>
                What to Adjust
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {reflection.what_to_adjust.map((item, i) => (
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
      {habits.length > 0 && (
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '22px 24px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 600, marginBottom: '16px' }}>
            Habit Streaks · Week {weekNumber}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
            {habits.map(habit => {
              const weekDates2 = weekDays.map(d => d.dateStr)
              const doneDates  = new Set(habit.logs.map(l => l.logged_date))
              const rate = habit.target_count > 0
                ? Math.round((habit.weekCompletions / habit.target_count) * 100)
                : 0
              return (
                <div key={habit.id} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{habit.emoji}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '10px' }}>
                    {habit.name}
                  </div>
                  {/* Day dots */}
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginBottom: '8px' }}>
                    {weekDates2.map(date => (
                      <div key={date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                        <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: doneDates.has(date) ? 'var(--sage)' : 'var(--bg-4)' }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                    <span style={{ color: rate >= 100 ? 'var(--sage)' : rate >= 70 ? 'var(--gold)' : 'var(--text-2)', fontWeight: 700 }}>
                      {habit.weekCompletions}/{habit.target_count}
                    </span>
                    {' '}this week
                  </div>
                  {habit.streak > 0 && (
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

      {checkins.length === 0 && (
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-lg)', padding: '28px 24px', textAlign: 'center', marginTop: '16px' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 300, color: 'var(--text-2)' }}>No check-ins this week yet.</div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '6px' }}>Check in daily to unlock your weekly AI reflection.</div>
        </div>
      )}
    </div>
  )
}
