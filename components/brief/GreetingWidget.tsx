'use client'

import { useState, useEffect, useRef } from 'react'
import type { CheckIn, HabitWithLogs, Brief, Goal } from '@/lib/types'

type Props = {
  checkin:    CheckIn | null
  habits:     HabitWithLogs[]
  goals:      Goal[]
  brief?:     Brief | null
  todayDate?: string   // server-authoritative local date (YYYY-MM-DD) — same source as logged_date
  userName?:  string | null
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

/* ── Pulse text ─────────────────────────────────────── */

type PulseResult = {
  label: string   // header label e.g. "Today's pulse" | "Day ahead" | "Check-in summary"
  text:  string
  items?: { emoji: string; label: string; sub?: string }[]  // optional structured items
}

function buildPulse(
  checkin:   CheckIn | null,
  brief:     Brief | null | undefined,
  habits:    HabitWithLogs[],
  goals:     Goal[],
  todayDate: string,
): PulseResult | null {
  const today = todayDate
  const active      = goals.filter(g => g.status === 'active')
  const scheduled   = habits.filter(h => h.isScheduledToday)
  const doneToday   = scheduled.filter(h => h.logs.some(l => l.logged_date === today))
  const remaining   = scheduled.filter(h => !h.logs.some(l => l.logged_date === today))

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

    if (remaining.length > 0) {
      const names = joinNames(remaining.map(h => `${h.emoji} ${h.name}`), 3)
      parts.push(`${names} ${remaining.length === 1 ? 'is' : 'are'} on your list today.`)
    } else if (scheduled.length > 0) {
      parts.push(`All ${scheduled.length} habit${scheduled.length > 1 ? 's' : ''} are already done — great start.`)
    }

    if (active.length > 0) {
      const avgPct = Math.round(active.reduce((s, g) => s + g.progress_pct, 0) / active.length)
      if (active.length === 1) {
        parts.push(`Your goal "${active[0].title}" is at ${active[0].progress_pct}%.`)
      } else {
        parts.push(`Your ${active.length} active goals are averaging ${avgPct}% progress.`)
      }
    }

    if (parts.length === 0) return null

    // Build structured items: habits first, then goals
    const items: PulseResult['items'] = []
    remaining.slice(0, 3).forEach(h => {
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

  if (doneToday.length > 0 && remaining.length > 0)
    parts.push(`${doneToday.length} of ${scheduled.length} habits done — ${remaining.length} still to go.`)
  else if (doneToday.length === scheduled.length && scheduled.length > 0)
    parts.push(`All ${scheduled.length} habits ticked off today.`)
  else if (remaining.length > 0)
    parts.push(`${remaining.length} habit${remaining.length > 1 ? 's' : ''} still ahead today.`)

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

export default function GreetingWidget({ checkin, habits, goals, brief, todayDate }: Props) {
  // Use server-authoritative date (same source as logged_date in DB); fall back to browser local
  const today      = todayDate ?? browserLocalDate()
  const scheduled  = habits.filter(h => h.isScheduledToday)

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
  const doneToday  = scheduled.filter(h => h.logs.some(l => l.logged_date === today))
  const active     = goals.filter(g => g.status === 'active')

  const habitCount = scheduled.length
  const goalCount  = active.length
  const pulse      = buildPulse(checkin, brief, habits, goals, today)

  const headlineGoalPart = goalCount > 0
    ? <><a href="/goals" style={{ color: 'var(--sage)', textDecoration: 'none', fontWeight: 700 }}>{goalCount} {goalCount === 1 ? 'goal' : 'goals'}</a>{' '}</>
    : null
  const headlineHabitPart = habitCount > 0
    ? <><a href="/habits" style={{ color: 'var(--sage)', textDecoration: 'none', fontWeight: 700 }}>{habitCount} {habitCount === 1 ? 'habit' : 'habits'}</a>{' '}</>
    : null

  return (
    <div style={{
      background:    'var(--bg-1)',
      border:        '1px solid var(--border)',
      borderRadius:  '40px',
      padding:       '32px 40px',
      marginBottom:  '16px',
      animation:     'fadeUp 0.3s var(--ease) both',
      animationDelay:'0.05s',
      overflow:      'hidden',
      position:      'relative',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
    }}>
      {/* Gradient overlay — from-white/40 to sea-soft — matches Lovable */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'var(--card-overlay)',
        pointerEvents: 'none',
      }} />

      {/* ── AI badge ── */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '20px', padding: '6px 14px', borderRadius: '999px', border: '1px solid var(--surface-soft-border)', background: 'var(--surface-soft-bg)', position: 'relative' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--sage)', flexShrink: 0, animation: 'pulse 2s ease-in-out infinite' }} />
        <span style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: 600 }}>
          {pulse?.label ?? "Locus AI · Today's pulse"}
        </span>
      </div>

      {/* ── Headline ── */}
      <div style={{ marginBottom: '14px' }}>
        {(goalCount > 0 || habitCount > 0) && !checkin ? (
          <p style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-0)', lineHeight: 1.35, margin: 0, letterSpacing: '-0.02em' }}>
            {'You have '}
            {headlineGoalPart}
            {goalCount > 0 && habitCount > 0 ? 'and ' : ''}
            {headlineHabitPart}
            {'aligned for today.'}
          </p>
        ) : checkin ? (
          <p style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-0)', lineHeight: 1.35, margin: 0, letterSpacing: '-0.02em' }}>
            {doneToday.length === habitCount && habitCount > 0
              ? `All ${habitCount} habits done. Great work.`
              : `${doneToday.length} of ${habitCount} habit${habitCount !== 1 ? 's' : ''} done today.`}
          </p>
        ) : (
          <p style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-0)', lineHeight: 1.35, margin: 0, letterSpacing: '-0.02em' }}>
            Start your day with a check-in.
          </p>
        )}
      </div>

      {/* ── AI opener / pulse text ── */}
      {(aiOpener || pulse?.text) && (
        <p style={{
          fontFamily:   'var(--font-serif)',
          fontSize:     '15px',
          fontWeight:   300,
          color:        'var(--text-2)',
          lineHeight:   1.65,
          margin:       '0 0 22px',
        }}>
          {aiOpener || pulse?.text}
          {!openerDone && aiOpener && (
            <span style={{
              display:      'inline-block',
              width:        '2px',
              height:       '1em',
              background:   'var(--sage)',
              marginLeft:   '2px',
              verticalAlign:'middle',
              animation:    'statusPulse 0.9s ease-in-out infinite',
            }} />
          )}
        </p>
      )}

      {/* ── CTAs ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <a
          href={checkin ? '/habits' : '/checkin'}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'var(--text-0)', color: 'var(--bg-0)',
            borderRadius: '24px', padding: '10px 22px',
            fontSize: '13.5px', fontWeight: 600,
            textDecoration: 'none',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.88' }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1' }}
        >
          {checkin ? 'Open Activity' : 'Start Check-in'} →
        </a>
        <a
          href="/brief"
          style={{
            display: 'inline-flex', alignItems: 'center',
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            borderRadius: '24px', padding: '10px 20px',
            fontSize: '13.5px', fontWeight: 500,
            color: 'var(--text-2)', textDecoration: 'none',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-1)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-2)' }}
        >
          Skip today
        </a>
      </div>
    </div>
  )
}

