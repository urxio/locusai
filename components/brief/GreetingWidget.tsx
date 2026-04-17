'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { CheckIn, HabitWithLogs, Brief, Goal } from '@/lib/types'

type Props = {
  checkin:    CheckIn | null
  habits:     HabitWithLogs[]
  goals:      Goal[]
  brief?:     Brief | null
  todayDate?: string   // server-authoritative local date (YYYY-MM-DD) — same source as logged_date
  userName?:  string | null
}

/* ── live status shape (mirrors /api/status response) ─── */

type LiveStatus = {
  habitsDone:  number
  habitsTotal: number
  goalsActive: number
  avgPct:      number | null
  hasCheckin:  boolean
}

/* ── Icons ───────────────────────────────────────────── */

function SparkIcon() {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
      <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
    </svg>
  )
}

function GoalIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
      <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z" clipRule="evenodd" />
    </svg>
  )
}

function HabitsIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  )
}

/* ── Helpers ─────────────────────────────────────────── */

/** Fallback: browser local date — only used if server didn't supply todayDate */
function browserLocalDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function joinNames(names: string[], max = 3): string {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  const shown = names.slice(0, max)
  const rest  = names.length - shown.length
  const base  = shown.slice(0, -1).join(', ') + (shown.length > 1 ? ' and ' : '') + shown[shown.length - 1]
  return rest > 0 ? `${base} +${rest} more` : base
}

/** Seed a LiveStatus from server props so the first paint is correct */
function propsToLiveStatus(
  habits:  HabitWithLogs[],
  goals:   Goal[],
  checkin: CheckIn | null,
  today:   string,
): LiveStatus {
  const scheduled = habits.filter(h => h.isScheduledToday)
  const done      = scheduled.filter(h => h.logs.some(l => l.logged_date === today))
  const active    = goals.filter(g => g.status === 'active')
  const avgPct    = active.length
    ? Math.round(active.reduce((s, g) => s + g.progress_pct, 0) / active.length)
    : null
  return {
    habitsDone:  done.length,
    habitsTotal: scheduled.length,
    goalsActive: active.length,
    avgPct,
    hasCheckin:  !!checkin,
  }
}

/* ── Pulse text ─────────────────────────────────────── */

type PulseResult = {
  label: string   // header label e.g. "Today's pulse" | "Day ahead" | "Check-in summary"
  text:  string
  items?: { emoji: string; label: string; sub?: string }[]  // optional structured items
}

function buildPulse(
  checkin:        CheckIn | null,
  brief:          Brief | null | undefined,
  habits:         HabitWithLogs[],
  goals:          Goal[],
  todayDate:      string,
  liveStatus?:    LiveStatus,
): PulseResult | null {
  const today      = todayDate
  const active     = goals.filter(g => g.status === 'active')
  const scheduled  = habits.filter(h => h.isScheduledToday)

  // Use live counts if available, otherwise fall back to computing from props
  const doneTodayN  = liveStatus?.habitsDone  ?? scheduled.filter(h => h.logs.some(l => l.logged_date === today)).length
  const remainingN  = liveStatus != null ? Math.max((liveStatus.habitsTotal) - doneTodayN, 0)
                    : scheduled.filter(h => !h.logs.some(l => l.logged_date === today)).length
  const goalsActive = liveStatus?.goalsActive ?? active.length
  const avgPctLive  = liveStatus?.avgPct      ?? (active.length ? Math.round(active.reduce((s, g) => s + g.progress_pct, 0) / active.length) : null)

  // Remaining habit items list for structured display (still from props — best effort)
  const remainingItems = scheduled
    .filter(h => !h.logs.some(l => l.logged_date === today))
    .slice(0, 3)

  /* ── 1. Brief AI insight (post check-in + brief generated) ── */
  if (brief?.insight_text) {
    const sentences = brief.insight_text.match(/[^.!?]+[.!?]+/g) ?? [brief.insight_text]
    return {
      label: "Locus AI · Today's pulse",
      text:  sentences.slice(0, 2).join(' ').trim(),
    }
  }

  /* ── 2. No check-in — show what's ahead ── */
  if (!checkin) {
    const parts: string[] = []

    if (remainingN > 0) {
      const names = joinNames(remainingItems.map(h => `${h.emoji} ${h.name}`), 3)
      const extra = remainingN - remainingItems.length
      const displayNames = extra > 0 ? `${names} +${extra} more` : names
      parts.push(`${displayNames} ${remainingN === 1 ? 'is' : 'are'} on your list today.`)
    } else if (scheduled.length > 0) {
      parts.push(`All ${scheduled.length} habit${scheduled.length > 1 ? 's' : ''} are already done — great start.`)
    }

    if (goalsActive > 0) {
      if (goalsActive === 1 && active[0]) {
        parts.push(`Your goal "${active[0].title}" is at ${active[0].progress_pct}%.`)
      } else {
        parts.push(`Your ${goalsActive} active goals are averaging ${avgPctLive ?? 0}% progress.`)
      }
    }

    if (parts.length === 0) return null

    // Build structured items: remaining habits first, then goals
    const items: PulseResult['items'] = []
    remainingItems.forEach(h => {
      const timeLabel = h.time_of_day ? `· ${h.time_of_day}` : ''
      items.push({ emoji: h.emoji, label: h.name, sub: [h.frequency, timeLabel].filter(Boolean).join(' ') })
    })
    active.slice(0, 2).forEach(g => {
      items.push({ emoji: '🎯', label: g.title, sub: `${g.progress_pct}%` })
    })

    return {
      label: 'Day ahead',
      text:  parts.join(' '),
      items: items.length > 0 ? items : undefined,
    }
  }

  /* ── 3. Checked in, no brief yet — rich check-in summary ── */
  const energy = checkin.energy_level
  const parts: string[] = []

  if (energy >= 8)
    parts.push(`Energy at ${energy}/10 — you're primed for a strong day.`)
  else if (energy >= 6)
    parts.push(`Energy at ${energy}/10 — solid footing for the day ahead.`)
  else if (energy >= 4)
    parts.push(`Energy at ${energy}/10 — keep it steady and sustainable.`)
  else
    parts.push(`Energy is lower today at ${energy}/10 — pace yourself.`)

  if (checkin.mood_note)
    parts.push(checkin.mood_note)
  else if (checkin.highlight)
    parts.push(`Recent win: ${checkin.highlight}.`)

  if (checkin.blockers?.length > 0)
    parts.push(`Watching out for: ${checkin.blockers.slice(0, 2).join(', ')}.`)

  if (doneTodayN > 0 && remainingN > 0)
    parts.push(`${doneTodayN} of ${scheduled.length} habits done — ${remainingN} still to go.`)
  else if (remainingN === 0 && scheduled.length > 0)
    parts.push(`All ${scheduled.length} habits ticked off today. 🎉`)
  else if (remainingN > 0)
    parts.push(`${remainingN} habit${remainingN > 1 ? 's' : ''} still ahead today.`)

  return {
    label: 'Check-in summary',
    text:  parts.slice(0, 2).join(' '),
  }
}

/* ── Mood pills (post check-in) ──────────────────────── */

function getMoodPills(checkin: CheckIn): { label: string; icon: string }[] {
  const pills: { label: string; icon: string }[] = []
  const energy = checkin.energy_level
  if (energy >= 8)      pills.push({ label: 'High energy', icon: '⚡' })
  else if (energy >= 6) pills.push({ label: 'Good energy', icon: '🏃' })
  else if (energy >= 4) pills.push({ label: 'Moderate', icon: '〰️' })
  else                  pills.push({ label: 'Rest mode', icon: '🌙' })
  if (!checkin.blockers?.length) pills.push({ label: 'No blockers', icon: '✓' })
  if (checkin.highlight)         pills.push({ label: 'Win noted', icon: '★' })
  return pills.slice(0, 3)
}

/* ── Main component ──────────────────────────────────── */

export default function GreetingWidget({ checkin, habits, goals, brief, todayDate, userName }: Props) {
  const hour     = new Date().getHours()
  const greeting = (hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening')
    + (userName ? `, ${userName.split(' ')[0]}` : '')

  // Use server-authoritative date (same source as logged_date in DB); fall back to browser local
  const today = todayDate ?? browserLocalDate()

  // ── Live status — seeded from props, refreshed from /api/status ──
  const [live, setLive]         = useState<LiveStatus>(() => propsToLiveStatus(habits, goals, checkin, today))
  const fetchingStatusRef       = useRef(false)

  const refreshStatus = useCallback(async () => {
    if (fetchingStatusRef.current) return
    fetchingStatusRef.current = true
    try {
      const res = await fetch('/api/status', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setLive({
          habitsDone:  data.habitsDone  ?? 0,
          habitsTotal: data.habitsTotal ?? 0,
          goalsActive: data.goalsActive ?? 0,
          avgPct:      data.avgPct      ?? null,
          hasCheckin:  data.hasCheckin  ?? false,
        })
      }
    } catch { /* keep last known data */ }
    finally { fetchingStatusRef.current = false }
  }, [])

  useEffect(() => {
    refreshStatus()
    const onVisible = () => { if (!document.hidden) refreshStatus() }
    const onFocus   = () => refreshStatus()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
    }
  }, [refreshStatus])

  // ── AI opener — streamed on mount ───────────────────────
  const [aiOpener, setAiOpener]   = useState('')
  const [openerDone, setDone]     = useState(false)
  const fetchedRef                = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    let cancelled = false

    ;(async () => {
      try {
        const res = await fetch('/api/pulse', { cache: 'no-store' })
        if (!res.ok || !res.body) return
        const reader = res.body.getReader()
        const dec    = new TextDecoder()
        while (true) {
          const { done, value } = await reader.read()
          if (done || cancelled) break
          setAiOpener(prev => prev + dec.decode(value, { stream: true }))
        }
      } catch { /* non-fatal */ } finally {
        if (!cancelled) setDone(true)
      }
    })()

    return () => { cancelled = true }
  }, [])

  // ── Derived display values from live data ──────────────
  const habitCount  = live.habitsTotal
  const goalCount   = live.goalsActive
  const doneTodayN  = live.habitsDone
  // remaining habits count for pulse text (live)
  const remainingN  = Math.max(habitCount - doneTodayN, 0)

  const moodPills   = checkin ? getMoodPills(checkin) : []

  // Build pulse using live counts while keeping the rich habit/goal item list from props
  const scheduled   = habits.filter(h => h.isScheduledToday)
  const remaining   = scheduled.filter(h => !h.logs.some(l => l.logged_date === today))
  const pulse       = buildPulse(checkin, brief, habits, goals, today, live)

  return (
    <div style={{
      background:    'var(--bg-1)',
      border:        '1px solid var(--border)',
      borderRadius:  '20px',
      padding:       '24px',
      marginBottom:  '20px',
      animation:     'fadeUp 0.3s var(--ease) both',
      animationDelay:'0.05s',
      overflow:      'hidden',
      position:      'relative',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: '-60px', right: '-60px',
        width: '220px', height: '220px',
        background: 'radial-gradient(circle, rgba(122,158,138,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* ── Greeting ── */}
      <div style={{ marginBottom: '20px', position: 'relative', zIndex: 1 }}>
        <p style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-2)', lineHeight: 1.4, margin: 0, letterSpacing: '-0.01em' }}>
          {greeting}.
        </p>

        {(goalCount > 0 || habitCount > 0) ? (
          <p style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-0)', lineHeight: 1.4, margin: '2px 0 0', letterSpacing: '-0.01em' }}>
            {checkin
              ? remainingN === 0
                  ? `All ${habitCount} habit${habitCount !== 1 ? 's' : ''} done ✓`
                  : `${doneTodayN} of ${habitCount} habit${habitCount !== 1 ? 's' : ''} done.`
              : <>
                  {'You have '}
                  {goalCount > 0 && (
                    <>
                      <InlineIcon color="rgba(122,158,138,0.18)" textColor="var(--sage)"><GoalIcon /></InlineIcon>
                      {' '}
                      <a href="/goals" style={{ color: 'var(--text-0)', textDecoration: 'none', borderBottom: '2px solid var(--sage)', paddingBottom: '1px' }}>
                        <strong>{goalCount} {goalCount === 1 ? 'goal' : 'goals'}</strong>
                      </a>
                      {habitCount > 0 ? ' and ' : ' '}
                    </>
                  )}
                  {habitCount > 0 && (
                    <>
                      <InlineIcon color="rgba(56,139,180,0.18)" textColor="#3a7a88"><HabitsIcon /></InlineIcon>
                      {' '}
                      <a href="/habits" style={{ color: 'var(--text-0)', textDecoration: 'none', borderBottom: '2px solid #3a7a88', paddingBottom: '1px' }}>
                        <strong>{remainingN} {remainingN === 1 ? 'habit' : 'habits'} left</strong>
                      </a>
                      {' '}
                    </>
                  )}
                  {'today.'}
                </>
            }
          </p>
        ) : (
          <p style={{ fontSize: '20px', fontWeight: 500, color: 'var(--text-2)', margin: '4px 0 0', lineHeight: 1.4 }}>
            {checkin ? "Check your brief for today\u2019s focus." : 'Check in to get started.'}
          </p>
        )}
      </div>

      {/* ── Mood pills (post check-in) ── */}
      {moodPills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
          {moodPills.map((pill, i) => (
            <div key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              background: 'var(--bg-2)', border: '1px solid var(--border)',
              borderRadius: '20px', padding: '6px 14px',
              fontSize: '13px', fontWeight: 500, color: 'var(--text-1)',
            }}>
              <span>{pill.icon}</span>{pill.label}
            </div>
          ))}
        </div>
      )}

      {/* ── Pulse card ── */}
      {pulse && (
        <div style={{
          background:   'var(--ai-card-bg)',
          border:       '1px solid rgba(212,168,83,0.15)',
          borderRadius: '14px',
          padding:      '16px 18px',
          position:     'relative',
          zIndex:       1,
          marginBottom: '20px',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '18px', height: '18px', borderRadius: '50%',
              background: 'var(--gold-dim)', color: 'var(--gold)',
            }}>
              <SparkIcon />
            </span>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold)', opacity: 0.85 }}>
              {pulse.label}
            </span>
          </div>

          {/* AI opener — streams in first */}
          {(aiOpener || !openerDone) && (
            <p style={{
              fontFamily:   'var(--font-serif)',
              fontSize:     '15px',
              fontWeight:   300,
              color:        'var(--ai-card-text)',
              lineHeight:   1.65,
              margin:       0,
              marginBottom: '10px',
              opacity:      aiOpener ? 1 : 0,
              transition:   'opacity 0.4s',
            }}>
              {aiOpener}
              {!openerDone && (
                <span style={{
                  display:      'inline-block',
                  width:        '2px',
                  height:       '1em',
                  background:   'var(--gold)',
                  marginLeft:   '2px',
                  verticalAlign:'middle',
                  animation:    'statusPulse 0.9s ease-in-out infinite',
                }} />
              )}
            </p>
          )}

          {/* Data summary (habits + goals) */}
          <p style={{
            fontFamily:   'var(--font-serif)',
            fontSize:     '14px',
            fontWeight:   300,
            color:        'var(--text-2)',
            lineHeight:   1.65,
            margin:       0,
            marginBottom: pulse.items?.length ? '14px' : 0,
            opacity:      openerDone ? 1 : 0,
            transition:   'opacity 0.5s 0.1s',
          }}>
            {pulse.text}
          </p>

          {/* Structured items — habits + goals (no check-in state) */}
          {pulse.items && pulse.items.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', opacity: openerDone ? 1 : 0, transition: 'opacity 0.5s 0.2s' }}>
              {pulse.items.map((item, i) => (
                <div key={i} style={{
                  display:       'flex',
                  alignItems:    'center',
                  gap:           '10px',
                  background:    'rgba(255,255,255,0.03)',
                  borderRadius:  '8px',
                  padding:       '8px 10px',
                  border:        '1px solid rgba(255,255,255,0.05)',
                }}>
                  <span style={{ fontSize: '16px', flexShrink: 0, lineHeight: 1 }}>{item.emoji}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', flex: 1 }}>{item.label}</span>
                  {item.sub && (
                    <span style={{ fontSize: '11px', color: 'var(--text-3)', flexShrink: 0 }}>{item.sub}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CTA ── */}
      <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
        <a
          href={checkin ? '/habits' : '/checkin'}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'var(--bg-3)', border: '1px solid var(--border-md)',
            borderRadius: '20px', padding: '10px 24px',
            fontSize: '13.5px', fontWeight: 600,
            color: 'var(--text-1)', textDecoration: 'none',
            transition: 'background 0.2s, color 0.2s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLAnchorElement).style.background = 'var(--bg-4)'
            ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-0)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLAnchorElement).style.background = 'var(--bg-3)'
            ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-1)'
          }}
        >
          {checkin ? 'Open Activity' : 'Start Check-in'}
        </a>
      </div>
    </div>
  )
}

/* ── Sub-components ──────────────────────────────────── */

function InlineIcon({ children, color, textColor }: { children: React.ReactNode; color?: string; textColor?: string }) {
  return (
    <span style={{
      display: 'inline-flex', verticalAlign: 'middle',
      alignItems: 'center', justifyContent: 'center',
      width: '22px', height: '22px', borderRadius: '6px',
      background: color ?? 'rgba(122,158,138,0.15)',
      color: textColor ?? 'var(--sage)', marginBottom: '3px',
    }}>
      <span style={{ transform: 'scale(0.8)' }}>{children}</span>
    </span>
  )
}
