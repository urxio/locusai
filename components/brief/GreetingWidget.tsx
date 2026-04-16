'use client'

import type { CheckIn, HabitWithLogs, Brief, Goal } from '@/lib/types'

type Props = {
  checkin: CheckIn | null
  habits: HabitWithLogs[]
  goals: Goal[]
  brief?: Brief | null
}

// ── Icon helpers ────────────────────────────────────────────────────────────────

function HabitsIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
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

function SparkIcon() {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
      <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
    </svg>
  )
}

// ── Mood pills derived from check-in ───────────────────────────────────────────

function getMoodPills(checkin: CheckIn | null): { label: string; icon: string }[] {
  if (!checkin) return []
  const pills: { label: string; icon: string }[] = []
  const energy = checkin.energy_level
  if (energy >= 8)      pills.push({ label: 'High energy', icon: '⚡' })
  else if (energy >= 6) pills.push({ label: 'Good', icon: '🏃' })
  else if (energy >= 4) pills.push({ label: 'Moderate', icon: '〰️' })
  else                  pills.push({ label: 'Low', icon: '🌙' })

  if (checkin.blockers && checkin.blockers.length === 0) pills.push({ label: 'No blockers', icon: '✓' })
  if (checkin.highlight) pills.push({ label: 'Win noted', icon: '★' })
  return pills.slice(0, 3)
}

// ── Pulse summary derived from brief or data ────────────────────────────────────

function buildPulseSummary(
  checkin: CheckIn | null,
  brief: Brief | null | undefined,
  habits: HabitWithLogs[],
  goals: Goal[],
): string | null {
  // Use AI insight if available (trimmed to ~2 sentences)
  if (brief?.insight_text) {
    const text = brief.insight_text.trim()
    // Take first 2 sentences max
    const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text]
    return sentences.slice(0, 2).join(' ').trim()
  }

  // Fallback: synthesise a short data summary
  if (!checkin) return null
  const todayHabits = habits.filter(h => h.isScheduledToday)
  const doneHabits  = todayHabits.filter(h => h.weekCompletions > 0)
  const activeGoals = goals.filter(g => g.status === 'active')
  const energy      = checkin.energy_level

  const parts: string[] = []
  if (energy >= 7)
    parts.push(`Your energy is tracking well today at ${energy}/10.`)
  else if (energy <= 4)
    parts.push(`Energy looks lower today (${energy}/10) — keep it sustainable.`)

  if (todayHabits.length > 0) {
    if (doneHabits.length === todayHabits.length)
      parts.push(`All ${todayHabits.length} habits are done — great consistency.`)
    else
      parts.push(`${doneHabits.length} of ${todayHabits.length} habits checked off so far.`)
  }

  if (activeGoals.length > 0) {
    const avgPct = Math.round(activeGoals.reduce((s, g) => s + g.progress_pct, 0) / activeGoals.length)
    parts.push(`Your ${activeGoals.length} active goal${activeGoals.length > 1 ? 's are' : ' is'} at ${avgPct}% on average.`)
  }

  return parts.length > 0 ? parts.slice(0, 2).join(' ') : null
}

// ── Main component ──────────────────────────────────────────────────────────────

export default function GreetingWidget({ checkin, habits, goals, brief }: Props) {
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const todayHabits = habits.filter(h => h.isScheduledToday)
  const activeGoals = goals.filter(g => g.status === 'active')

  const habitCount = todayHabits.length
  const goalCount  = activeGoals.length

  const pills       = getMoodPills(checkin)
  const pulseSummary = buildPulseSummary(checkin, brief, habits, goals)

  return (
    <div style={{
      background: 'var(--bg-1)',
      border: '1px solid var(--border)',
      borderRadius: '20px',
      padding: '24px',
      marginBottom: '20px',
      animation: 'fadeUp 0.3s var(--ease) both',
      animationDelay: '0.05s',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: '-60px', right: '-60px',
        width: '220px', height: '220px',
        background: 'radial-gradient(circle, rgba(122,158,138,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* ── Greeting text ── */}
      <div style={{ marginBottom: '20px', position: 'relative', zIndex: 1 }}>
        <p style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-2)', lineHeight: 1.4, margin: 0, letterSpacing: '-0.01em' }}>
          {greeting}.
        </p>

        {(goalCount > 0 || habitCount > 0) ? (
          <p style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-0)', lineHeight: 1.4, margin: '2px 0 0', letterSpacing: '-0.01em' }}>
            {'You have '}
            {goalCount > 0 && (
              <>
                <InlineIcon color="rgba(122,158,138,0.18)" textColor="var(--sage)"><GoalIcon /></InlineIcon>
                {' '}
                {/* Goals → hyperlink */}
                <a href="/goals" style={{ color: 'var(--text-0)', textDecoration: 'none', borderBottom: '2px solid var(--sage)', paddingBottom: '1px' }}>
                  <strong>{goalCount} {goalCount === 1 ? 'goal' : 'goals'}</strong>
                </a>
                {habitCount > 0 ? ', ' : ' '}
              </>
            )}
            {habitCount > 0 && (
              <>
                <InlineIcon color="rgba(56,139,180,0.18)" textColor="#3a7a88"><HabitsIcon /></InlineIcon>
                {' '}
                {/* Habits → hyperlink */}
                <a href="/habits" style={{ color: 'var(--text-0)', textDecoration: 'none', borderBottom: '2px solid #3a7a88', paddingBottom: '1px' }}>
                  <strong>{habitCount} {habitCount === 1 ? 'habit' : 'habits'}</strong>
                </a>
                {' '}
              </>
            )}
            {'today.'}
          </p>
        ) : (
          <p style={{ fontSize: '20px', fontWeight: 500, color: 'var(--text-2)', margin: '4px 0 0', lineHeight: 1.4 }}>
            {checkin ? 'Your brief is loading.' : 'Check in to get started.'}
          </p>
        )}
      </div>

      {/* ── Mood pills ── */}
      {pills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
          {pills.map((pill, i) => (
            <div key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              background: 'var(--bg-2)', border: '1px solid var(--border)',
              borderRadius: '20px', padding: '6px 14px',
              fontSize: '13px', fontWeight: 500, color: 'var(--text-1)',
            }}>
              <span style={{ fontSize: '13px' }}>{pill.icon}</span>
              {pill.label}
            </div>
          ))}
        </div>
      )}

      {/* ── AI Pulse Summary ── */}
      {pulseSummary && (
        <div style={{
          background: 'var(--ai-card-bg)',
          border: '1px solid rgba(212,168,83,0.15)',
          borderRadius: '14px',
          padding: '16px 18px',
          position: 'relative',
          zIndex: 1,
          marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '18px', height: '18px', borderRadius: '50%',
              background: 'var(--gold-dim)', color: 'var(--gold)',
            }}>
              <SparkIcon />
            </span>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold)', opacity: 0.85 }}>
              {brief?.insight_text ? "Locus AI · Today\u2019s pulse" : "Today\u2019s pulse"}
            </span>
          </div>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '15px',
            fontWeight: 300,
            color: 'var(--ai-card-text)',
            lineHeight: 1.65,
            margin: 0,
          }}>
            {pulseSummary}
          </p>
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
            letterSpacing: '0.01em',
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

// ── Sub-components ──────────────────────────────────────────────────────────────

function InlineIcon({ children, color, textColor }: { children: React.ReactNode; color?: string; textColor?: string }) {
  return (
    <span style={{
      display: 'inline-flex', verticalAlign: 'middle',
      alignItems: 'center', justifyContent: 'center',
      width: '22px', height: '22px', borderRadius: '6px',
      background: color ?? 'rgba(122,158,138,0.15)',
      color: textColor ?? 'var(--sage)',
      marginBottom: '3px',
    }}>
      <span style={{ transform: 'scale(0.8)' }}>{children}</span>
    </span>
  )
}
