'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Goal, CheckIn, HabitWithLogs, Brief, GoalWithSteps } from '@/lib/types'
import type { UserMemory } from '@/lib/ai/memory'
import type { MissedHabit } from './HabitAuditStrip'
import { logHabitAction, unlogHabitAction } from '@/app/actions/habits'

type Props = {
  goals: Goal[]
  checkin: CheckIn | null
  avgEnergy: number | null
  habits: HabitWithLogs[]
  brief?: Brief | null
  recentBriefs?: Brief[]
  memory?: UserMemory | null
  todayDate?: string
  yesterday?: string
  coverUrl?: string | null
  userName?: string | null
  missedYesterday?: MissedHabit[]
  goalsWithSteps?: GoalWithSteps[]
}

function browserDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function friendlyDate(dateStr: string): string {
  const today = new Date()
  const d = new Date(dateStr + 'T12:00:00')
  const diffDays = Math.round((today.getTime() - d.getTime()) / 86400000)
  if (diffDays === 1) return 'Yesterday'
  if (diffDays <= 6) return d.toLocaleDateString('en-US', { weekday: 'long' })
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function renderMessage(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ color: 'var(--ink-900)', fontWeight: 700 }}>
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <span key={i}>{part}</span>
  })
}

function ActionRow({
  icon, label, sublabel, href, accent = false,
}: {
  icon: React.ReactNode
  label: string
  sublabel?: string
  href: string
  accent?: boolean
}) {
  return (
    <a
      href={href}
      style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '14px 16px', borderRadius: '14px',
        background: accent ? 'oklch(0.62 0.06 165 / 0.12)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${accent ? 'oklch(0.62 0.06 165 / 0.25)' : 'rgba(255,255,255,0.07)'}`,
        textDecoration: 'none', color: 'inherit',
        transition: 'background 0.15s, transform 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = accent ? 'oklch(0.62 0.06 165 / 0.18)' : 'rgba(255,255,255,0.07)'
        e.currentTarget.style.transform = 'translateX(2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = accent ? 'oklch(0.62 0.06 165 / 0.12)' : 'rgba(255,255,255,0.04)'
        e.currentTarget.style.transform = 'translateX(0)'
      }}
    >
      <div style={{
        width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
        background: accent ? 'oklch(0.62 0.06 165 / 0.20)' : 'rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: accent ? 'var(--sage)' : 'var(--ink-500)',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink-900)', lineHeight: 1.3 }}>{label}</div>
        {sublabel && <div style={{ fontSize: '12px', color: 'var(--ink-400)', marginTop: '2px' }}>{sublabel}</div>}
      </div>
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" width="14" height="14"
        style={{ color: 'var(--ink-400)', flexShrink: 0 }}>
        <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  )
}

function MailboxEntry({ brief, isFirst }: { brief: Brief; isFirst: boolean }) {
  const [open, setOpen] = useState(false)
  const preview = brief.insight_text?.replace(/\*\*/g, '').slice(0, 90) + '…'

  return (
    <div
      style={{
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(255,255,255,0.025)',
        overflow: 'hidden',
        transition: 'border-color 0.15s',
      }}
    >
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 14px', background: 'none', border: 'none',
          cursor: 'pointer', color: 'inherit', textAlign: 'left',
        }}
      >
        {/* Envelope dot */}
        <div style={{
          width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
          background: isFirst ? 'var(--sage)' : 'rgba(255,255,255,0.20)',
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-400)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {friendlyDate(brief.brief_date)}
          </div>
          {!open && (
            <div style={{ fontSize: '13px', color: 'var(--ink-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {preview}
            </div>
          )}
        </div>
        <svg
          viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" width="12" height="12"
          style={{ color: 'var(--ink-400)', flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <path d="M3 6l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div style={{ padding: '0 14px 14px 34px' }}>
          <p
            className="font-serif-display"
            style={{ fontSize: '15px', lineHeight: 1.7, color: 'var(--ink-500)', margin: 0, whiteSpace: 'pre-wrap' }}
          >
            {renderMessage(brief.insight_text)}
          </p>
        </div>
      )}
    </div>
  )
}

export default function DailyBrief({
  goals, checkin, habits, brief, recentBriefs = [], todayDate, userName, missedYesterday = [],
}: Props) {
  const router = useRouter()
  const now = new Date()
  const today = todayDate || browserDate()

  const [isGenerating, setIsGenerating] = useState(false)
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {}
    habits.forEach(h => { map[h.id] = h.logs.some(l => l.logged_date === today) })
    return map
  })
  const [, startTransition] = useTransition()

  // Auto-generate a brief if none exists yet today
  useEffect(() => {
    if (!brief && !isGenerating) {
      setIsGenerating(true)
      fetch('/api/brief/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: false }),
      })
        .then(() => router.refresh())
        .catch(() => setIsGenerating(false))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleHabit(habitId: string) {
    const wasDone = doneMap[habitId] ?? false
    setDoneMap(prev => ({ ...prev, [habitId]: !wasDone }))
    startTransition(async () => {
      try {
        if (wasDone) await unlogHabitAction(habitId)
        else await logHabitAction(habitId)
        router.refresh()
      } catch {
        setDoneMap(prev => ({ ...prev, [habitId]: wasDone }))
      }
    })
  }

  useEffect(() => {
    const onVisibility = () => { if (!document.hidden) router.refresh() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [router])

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const dayLabel = now.toLocaleDateString('en-US', { weekday: 'long' })
  const dateLabel = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  const scheduledToday = habits.filter(h => h.isScheduledToday)
  const doneToday = scheduledToday.filter(h => doneMap[h.id])
  const activeGoals = goals.filter(g => g.status === 'active')
  const topGoal = activeGoals[0] ?? null
  const topStreak = Math.max(0, ...habits.map(h => h.streak))

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '14px 16px 16px',
        gap: '14px',
        animation: 'fadeUp 0.4s var(--ease) both',
      }}
    >
      {/* ── Header ── */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '12px',
            background: 'var(--glass-card-bg-tint)',
            border: '1.5px solid var(--glass-card-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--sea-soft, #c8ddd7) 0%, var(--sage) 100%)' }} />
          </div>
          <div className="glass-pill" style={{ display: 'flex', alignItems: 'center', gap: '10px', borderRadius: '20px', padding: '5px 14px 5px 8px', minWidth: 0 }}>
            <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--ink-900)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--glass-card-bg)' }} />
            </span>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink-400)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {greeting}{userName ? `, ${userName.split(' ')[0]}` : ''}
            </span>
          </div>
        </div>

        <div className="glass-pill" style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '20px', padding: '6px 16px', flexShrink: 0 }}>
          {checkin && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--sage)', flexShrink: 0 }} />}
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3, alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-900)', whiteSpace: 'nowrap' }}>{dayLabel} · {dateLabel}</span>
            <span style={{ fontSize: '10px', color: 'var(--ink-400)' }}>
              {checkin ? 'Check-in logged' : 'No check-in yet'}
            </span>
          </div>
        </div>

        <a href="/capture" className="glass-pill" style={{
          width: '36px', height: '36px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ink-400)', textDecoration: 'none', flexShrink: 0,
        }}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" width="16" height="16">
            <path d="M10 4v12M4 10h12" strokeLinecap="round" />
          </svg>
        </a>
      </header>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px', minHeight: 0 }}>

        {/* ── Today's message ── */}
        <div style={{ padding: '4px 2px' }}>
          {brief?.insight_text ? (
            <p
              className="font-serif-display"
              style={{ fontSize: '18px', lineHeight: 1.75, color: 'var(--ink-500)', fontWeight: 400, margin: 0, whiteSpace: 'pre-wrap' }}
            >
              {renderMessage(brief.insight_text)}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Typing indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      style={{
                        width: '7px', height: '7px', borderRadius: '50%',
                        background: 'var(--sage)',
                        opacity: 0.5,
                        animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
                <span style={{ fontSize: '13px', color: 'var(--ink-400)' }}>
                  {isGenerating ? 'Locus is writing your message…' : 'Preparing your message…'}
                </span>
              </div>
              <p
                className="font-serif-display"
                style={{ fontSize: '18px', lineHeight: 1.75, color: 'var(--ink-400)', fontStyle: 'italic', margin: 0 }}
              >
                {greeting}{userName ? `, ${userName.split(' ')[0]}` : ''}. Your morning message is on its way.
              </p>
            </div>
          )}
        </div>

        {/* ── Divider ── */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

        {/* ── Action rows ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

          {scheduledToday.length > 0 && (
            <ActionRow
              href="/habits"
              icon={
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" width="16" height="16">
                  <path d="M5 10l3.5 3.5L15 7" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="10" cy="10" r="8" />
                </svg>
              }
              label={
                doneToday.length === scheduledToday.length
                  ? 'All habits done today 🎉'
                  : `${scheduledToday.length - doneToday.length} habit${scheduledToday.length - doneToday.length > 1 ? 's' : ''} to check off today`
              }
              sublabel={
                doneToday.length > 0
                  ? `${doneToday.length} of ${scheduledToday.length} done${topStreak > 2 ? ` · ${topStreak}-day streak` : ''}`
                  : topStreak > 2 ? `${topStreak}-day streak — keep it going` : undefined
              }
            />
          )}

          {topGoal && (
            <ActionRow
              href="/goals"
              icon={
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" width="16" height="16">
                  <circle cx="10" cy="10" r="7" />
                  <circle cx="10" cy="10" r="3" />
                </svg>
              }
              label={topGoal.title.length > 36 ? topGoal.title.slice(0, 36) + '…' : topGoal.title}
              sublabel={`${topGoal.progress_pct}% complete · ${activeGoals.length} active goal${activeGoals.length > 1 ? 's' : ''}`}
            />
          )}

          {missedYesterday.length > 0 && (
            <ActionRow
              href="/checkin"
              icon={
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" width="16" height="16">
                  <path d="M10 7v4M10 13h.01" strokeLinecap="round" />
                  <circle cx="10" cy="10" r="8" />
                </svg>
              }
              label={`${missedYesterday.length} missed yesterday`}
              sublabel={missedYesterday.slice(0, 2).map(h => `${h.emoji ?? ''} ${h.name}`).join(' · ')}
            />
          )}

          {!checkin && (
            <ActionRow
              href="/checkin"
              accent
              icon={
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" width="16" height="16">
                  <path d="M10 6v4l2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="10" cy="10" r="7" />
                </svg>
              }
              label="Log how you're feeling"
              sublabel="Let Locus know your energy to update today's message"
            />
          )}

          {activeGoals.length === 0 && (
            <ActionRow
              href="/goals"
              icon={
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" width="16" height="16">
                  <path d="M10 4v12M4 10h12" strokeLinecap="round" />
                </svg>
              }
              label="Set your first goal"
              sublabel="Give Locus something to work towards with you"
            />
          )}

          {habits.length === 0 && (
            <ActionRow
              href="/habits"
              icon={
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" width="16" height="16">
                  <path d="M10 4v12M4 10h12" strokeLinecap="round" />
                </svg>
              }
              label="Add your first habit"
              sublabel="Small daily actions compound into big results"
            />
          )}
        </div>

        {/* ── Mailbox ── */}
        {recentBriefs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13"
                style={{ color: 'var(--ink-400)', flexShrink: 0 }}>
                <path d="M2 6l8 5 8-5" strokeLinecap="round" />
                <rect x="2" y="4" width="16" height="12" rx="2" />
              </svg>
              <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--ink-400)' }}>
                Previous messages
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {recentBriefs.map((b, i) => (
                <MailboxEntry key={b.id} brief={b} isFirst={i === 0} />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
