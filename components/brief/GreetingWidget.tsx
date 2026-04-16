'use client'

import type { CheckIn, HabitWithLogs, Brief, Goal } from '@/lib/types'

type ActivityItem = {
  icon: React.ReactNode
  title: string
  subtitle: string
  accent?: string
}

type Props = {
  checkin: CheckIn | null
  habits: HabitWithLogs[]
  goals: Goal[]
  brief?: Brief | null
}

// ── Icon helpers ───────────────────────────────────────────────────────────────

function CalendarIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
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

function PriorityIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
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

// ── Mood / status pills from check-in data ─────────────────────────────────────

function getMoodPills(checkin: CheckIn | null): { label: string; icon: string }[] {
  if (!checkin) return []
  const pills: { label: string; icon: string }[] = []

  const energy = checkin.energy_level
  if (energy >= 8) pills.push({ label: 'High energy', icon: '⚡' })
  else if (energy >= 6) pills.push({ label: 'Good', icon: '🏃' })
  else if (energy >= 4) pills.push({ label: 'Moderate', icon: '〰️' })
  else pills.push({ label: 'Low', icon: '🌙' })

  if (checkin.blockers && checkin.blockers.length === 0) {
    pills.push({ label: 'No blockers', icon: '✓' })
  }

  if (checkin.highlight) {
    pills.push({ label: 'Win noted', icon: '★' })
  }

  return pills.slice(0, 3)
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function GreetingWidget({ checkin, habits, goals, brief }: Props) {
  const now = new Date()
  const hour = now.getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const todayHabits = habits.filter(h => h.isScheduledToday)
  const completedHabits = todayHabits.filter(h => h.weekCompletions > 0)
  const activeGoals = goals.filter(g => g.status === 'active')

  // Build summary counts — map goals → "events", habits → "tasks"
  const eventCount = activeGoals.length
  const habitCount = todayHabits.length
  const priorityCount = brief?.priorities?.length ?? 0

  // Mood pills
  const pills = getMoodPills(checkin)

  // Activity feed items derived from available data
  const activityItems: ActivityItem[] = []

  // Priorities from brief
  if (brief?.priorities) {
    for (const p of brief.priorities.slice(0, 2)) {
      activityItems.push({
        icon: <PriorityIcon />,
        title: p.title,
        subtitle: `${p.category} · ${p.estimated_time}`,
        accent: '#4a8c68',
      })
    }
  }

  // Habits due today
  for (const h of todayHabits.slice(0, 2 - activityItems.filter(i => i.accent === '#4a8c68').length)) {
    activityItems.push({
      icon: <HabitsIcon />,
      title: `${h.emoji} ${h.name}`,
      subtitle: h.time_of_day ? `Scheduled · ${h.time_of_day}` : 'Scheduled today',
      accent: '#3a7a88',
    })
  }

  // Active goals as "events"
  for (const g of activeGoals.slice(0, Math.max(0, 3 - activityItems.length))) {
    activityItems.push({
      icon: <GoalIcon />,
      title: g.title,
      subtitle: `Goal · ${g.progress_pct}% complete`,
      accent: '#7a4a88',
    })
  }

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
      {/* Subtle ambient glow */}
      <div style={{
        position: 'absolute', top: '-60px', right: '-60px',
        width: '220px', height: '220px',
        background: 'radial-gradient(circle, rgba(122,158,138,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* ── Greeting text ── */}
      <div style={{ marginBottom: '20px', position: 'relative', zIndex: 1 }}>
        <p style={{
          fontSize: '26px',
          fontWeight: 700,
          color: 'var(--text-2)',
          lineHeight: 1.4,
          margin: 0,
          letterSpacing: '-0.01em',
        }}>
          {greeting}.
        </p>

        {(eventCount > 0 || habitCount > 0 || priorityCount > 0) ? (
          <p style={{
            fontSize: '26px',
            fontWeight: 700,
            color: 'var(--text-0)',
            lineHeight: 1.4,
            margin: '2px 0 0',
            letterSpacing: '-0.01em',
          }}>
            {/* Build the sentence inline with icons */}
            {'You have '}
            {eventCount > 0 && (
              <>
                <InlineIcon><CalendarIcon /></InlineIcon>
                {' '}<strong style={{ color: 'var(--text-0)' }}>{eventCount} {eventCount === 1 ? 'goal' : 'goals'}</strong>
                {(habitCount > 0 || priorityCount > 0) ? ', ' : ' '}
              </>
            )}
            {habitCount > 0 && (
              <>
                <InlineIcon><HabitsIcon /></InlineIcon>
                {' '}<strong style={{ color: 'var(--text-0)' }}>{habitCount} {habitCount === 1 ? 'habit' : 'habits'}</strong>
                {priorityCount > 0 ? ' and ' : ' '}
              </>
            )}
            {priorityCount > 0 && (
              <>
                <InlineIcon><PriorityIcon /></InlineIcon>
                {' '}<strong style={{ color: 'var(--text-0)' }}>{priorityCount} {priorityCount === 1 ? 'priority' : 'priorities'}</strong>
                {' '}
              </>
            )}
            {'today.'}
          </p>
        ) : (
          <p style={{
            fontSize: '20px',
            fontWeight: 500,
            color: 'var(--text-2)',
            margin: '4px 0 0',
            lineHeight: 1.4,
          }}>
            {checkin ? 'Your brief is loading.' : 'Check in to get started.'}
          </p>
        )}
      </div>

      {/* ── Mood pills ── */}
      {pills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
          {pills.map((pill, i) => (
            <div key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text-1)',
              cursor: 'default',
            }}>
              <span style={{ fontSize: '13px' }}>{pill.icon}</span>
              {pill.label}
            </div>
          ))}
        </div>
      )}

      {/* ── Activity feed ── */}
      {activityItems.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', position: 'relative', zIndex: 1 }}>
          {activityItems.map((item, i) => (
            <ActivityRow key={i} item={item} last={i === activityItems.length - 1} />
          ))}
        </div>
      )}

      {/* ── CTA ── */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px', position: 'relative', zIndex: 1 }}>
        <a
          href={checkin ? '/habits' : '/checkin'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg-3)',
            border: '1px solid var(--border-md)',
            borderRadius: '20px',
            padding: '10px 24px',
            fontSize: '13.5px',
            fontWeight: 600,
            color: 'var(--text-1)',
            textDecoration: 'none',
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

// ── Sub-components ─────────────────────────────────────────────────────────────

function InlineIcon({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex',
      verticalAlign: 'middle',
      alignItems: 'center',
      justifyContent: 'center',
      width: '22px',
      height: '22px',
      borderRadius: '6px',
      background: 'rgba(122,158,138,0.15)',
      color: 'var(--sage)',
      marginBottom: '3px',
    }}>
      <span style={{ transform: 'scale(0.8)' }}>{children}</span>
    </span>
  )
}

function ActivityRow({ item, last }: { item: ActivityItem; last: boolean }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      padding: '14px 0',
      borderBottom: last ? 'none' : '1px solid var(--border)',
    }}>
      {/* Icon badge */}
      <div style={{
        width: '44px',
        height: '44px',
        borderRadius: '14px',
        background: item.accent ? `${item.accent}22` : 'var(--bg-2)',
        border: `1px solid ${item.accent ? `${item.accent}40` : 'var(--border)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: item.accent ?? 'var(--text-2)',
        flexShrink: 0,
      }}>
        {item.icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--text-0)',
          lineHeight: 1.3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {item.title}
        </div>
        <div style={{
          fontSize: '12.5px',
          color: 'var(--text-3)',
          marginTop: '2px',
          lineHeight: 1.4,
        }}>
          {item.subtitle}
        </div>
      </div>

      {/* Chevron */}
      <div style={{ color: 'var(--text-3)', flexShrink: 0 }}>
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3l5 5-5 5" />
        </svg>
      </div>
    </div>
  )
}
