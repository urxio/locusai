'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { GoalWithSteps } from '@/lib/types'

/* ── slim API shape ──────────────────────────────────── */

type StepData = {
  id:        string
  title:     string
  completed: boolean
  due_date:  string | null
}

type GoalData = {
  id:           string
  title:        string
  category:     string
  progress_pct: number
  target_date:  string | null
  timeframe:    string
  steps:        StepData[]
}

/* ── category config ─────────────────────────────────── */

const CATEGORY_COLOR: Record<string, string> = {
  product:   '#6090c8',
  health:    '#7a9e8a',
  learning:  '#9080b0',
  financial: '#d4a853',
  wellbeing: '#50a0a0',
  other:     '#888888',
}

const CATEGORY_LABEL: Record<string, string> = {
  product:   'Work',
  health:    'Health',
  learning:  'Learning',
  financial: 'Finance',
  wellbeing: 'Wellbeing',
  other:     'Other',
}

/* ── helpers ─────────────────────────────────────────── */

function propsToGoalData(goals: GoalWithSteps[]): GoalData[] {
  return goals.map(g => ({
    id:           g.id,
    title:        g.title,
    category:     g.category,
    progress_pct: g.progress_pct,
    target_date:  g.target_date,
    timeframe:    g.timeframe,
    steps:        g.steps.map(s => ({
      id:        s.id,
      title:     s.title,
      completed: s.completed,
      due_date:  s.due_date ?? null,
    })),
  }))
}

function stepDueLabel(dueDate: string | null): { label: string; color: string } | null {
  if (!dueDate) return null
  const now   = new Date()
  const due   = new Date(dueDate + 'T12:00:00')
  const days  = Math.ceil((due.getTime() - now.setHours(0,0,0,0)) / 86400000)
  if (days < 0)  return { label: `${Math.abs(days)}d overdue`, color: '#c07060' }
  if (days === 0) return { label: 'Due today',                  color: '#d4a853' }
  if (days === 1) return { label: 'Due tomorrow',               color: '#d4a853' }
  if (days <= 7)  return { label: `${days}d`,                   color: 'var(--text-3)' }
  return { label: `${days}d`, color: 'var(--text-3)' }
}

/* ── single goal card ────────────────────────────────── */

function GoalCard({ goal }: { goal: GoalData }) {
  const color      = CATEGORY_COLOR[goal.category] ?? CATEGORY_COLOR.other
  const catLabel   = CATEGORY_LABEL[goal.category] ?? goal.category

  // Pending steps — sort: overdue first, then by due date, then no date
  const pending = goal.steps
    .filter(s => !s.completed)
    .sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return a.due_date.localeCompare(b.due_date)
    })
    .slice(0, 3)

  const completedCount = goal.steps.filter(s => s.completed).length
  const totalSteps     = goal.steps.length

  return (
    <div style={{
      background:   'var(--bg-1)',
      border:       '1px solid var(--border)',
      borderRadius: '16px',
      padding:      '14px',
      display:      'flex',
      flexDirection:'column',
      gap:          '12px',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
          background: `${color}22`, border: `1px solid ${color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 700, color, letterSpacing: '0.02em',
        }}>
          {catLabel.slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '13px', fontWeight: 600, color: 'var(--text-0)',
            lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {goal.title}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>
            {catLabel}{goal.target_date ? ` · ${daysUntilLabel(goal.target_date)}` : ''}
          </div>
        </div>
        <div style={{
          fontSize: '12px', fontWeight: 700, color,
          background: `${color}18`, border: `1px solid ${color}33`,
          borderRadius: '10px', padding: '2px 8px', flexShrink: 0,
        }}>
          {goal.progress_pct}%
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '4px', background: 'var(--bg-3)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{
          height:     '100%',
          width:      `${goal.progress_pct}%`,
          background: color,
          borderRadius: '4px',
          boxShadow:  `0 0 8px ${color}88`,
          transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)',
        }} />
      </div>

      {/* Steps */}
      {pending.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{
            fontSize: '9px', fontWeight: 700, color: 'var(--text-3)',
            textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>
            Next steps {totalSteps > 0 ? `· ${completedCount}/${totalSteps} done` : ''}
          </div>
          {pending.map(step => {
            const due = stepDueLabel(step.due_date)
            return (
              <div key={step.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: '8px',
                padding: '7px 10px',
                background: 'var(--bg-2)', borderRadius: '9px',
              }}>
                <div style={{
                  width: '14px', height: '14px', borderRadius: '4px',
                  border: `1.5px solid ${color}55`, flexShrink: 0, marginTop: '1px',
                  background: 'transparent',
                }} />
                <span style={{
                  flex: 1, fontSize: '12px', color: 'var(--text-1)',
                  lineHeight: 1.45,
                }}>
                  {step.title}
                </span>
                {due && (
                  <span style={{
                    fontSize: '10px', fontWeight: 600, color: due.color,
                    flexShrink: 0, marginTop: '1px', whiteSpace: 'nowrap',
                  }}>
                    {due.label}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* All steps done state */}
      {pending.length === 0 && totalSteps > 0 && (
        <div style={{
          fontSize: '12px', color: 'var(--sage)', fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '6px 10px', background: 'rgba(122,158,138,0.07)',
          borderRadius: '8px', border: '1px solid rgba(122,158,138,0.15)',
        }}>
          <span>✓</span> All steps complete
        </div>
      )}

      {/* No steps yet */}
      {totalSteps === 0 && (
        <div style={{ fontSize: '12px', color: 'var(--text-3)', fontStyle: 'italic' }}>
          No steps added yet
        </div>
      )}
    </div>
  )
}

function daysUntilLabel(targetDate: string): string {
  const days = Math.ceil((new Date(targetDate + 'T12:00:00').getTime() - new Date().setHours(0,0,0,0)) / 86400000)
  if (days < 0)   return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Due today'
  if (days <= 7)  return `${days}d left`
  if (days <= 30) return `${Math.round(days / 7)}w left`
  return `${Math.round(days / 30)}mo left`
}

/* ── main section ────────────────────────────────────── */

export default function GoalsWeekStrip({ goals }: { goals: GoalWithSteps[] }) {
  const [data, setData]          = useState<GoalData[]>(() => propsToGoalData(goals))
  const [refreshing, setRefresh] = useState(false)
  const [expanded, setExpanded]  = useState(false)
  const fetchingRef              = useRef(false)

  const refresh = useCallback(async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    setRefresh(true)
    try {
      const res = await fetch('/api/goals/week', { cache: 'no-store' })
      if (res.ok) setData(await res.json())
    } catch { /* keep last known data */ }
    finally { fetchingRef.current = false; setRefresh(false) }
  }, [])

  useEffect(() => {
    refresh()
    const onVisible = () => { if (!document.hidden) refresh() }
    const onFocus   = () => refresh()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh])

  if (data.length === 0) return null

  const PREVIEW = 2
  const visible = expanded ? data : data.slice(0, PREVIEW)
  const hasMore = data.length > PREVIEW

  return (
    <div style={{ marginTop: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{
            fontSize: '10px', fontWeight: 700, color: 'var(--text-3)',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            Goals This Week
          </span>
          <div style={{
            width: '5px', height: '5px', borderRadius: '50%',
            background:  refreshing ? 'var(--gold)' : '#6090c8',
            boxShadow:   refreshing ? '0 0 6px var(--gold)' : '0 0 5px #6090c888',
            transition:  'background 0.3s, box-shadow 0.3s',
            animation:   refreshing ? 'statusPulse 0.8s ease-in-out infinite' : 'none',
          }} />
        </div>
        <a href="/goals" style={{ fontSize: '11px', color: 'var(--text-3)', textDecoration: 'none', fontWeight: 500 }}>
          All goals →
        </a>
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: refreshing ? 0.7 : 1, transition: 'opacity 0.3s' }}>
        {visible.map(g => (
          <GoalCard key={g.id} goal={g} />
        ))}
      </div>

      {/* Expand / collapse */}
      {hasMore && (
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            width: '100%', marginTop: '8px', padding: '10px',
            background: 'var(--bg-1)', border: '1px solid var(--border)',
            borderRadius: '12px', cursor: 'pointer',
            fontSize: '12px', fontWeight: 600, color: 'var(--text-3)',
            fontFamily: 'inherit', transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-md)'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-1)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)'
          }}
        >
          <span>{expanded ? 'Show less' : `${data.length - PREVIEW} more goal${data.length - PREVIEW !== 1 ? 's' : ''}`}</span>
          <span style={{
            display: 'inline-block', transition: 'transform 0.25s',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', fontSize: '10px',
          }}>▾</span>
        </button>
      )}
    </div>
  )
}
