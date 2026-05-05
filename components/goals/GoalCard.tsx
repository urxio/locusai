'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import type { GoalWithSteps, GoalStep, Habit } from '@/lib/types'
import { updateGoalAction, deleteGoalAction } from '@/app/actions/goals'
import {
  computeGoalVitality,
  VITALITY_STRIPE, VITALITY_BADGE, VITALITY_PROGRESS,
  type GoalVitality,
} from '@/lib/utils/goal-vitality'
import { PencilIcon, TrashIcon } from '@/components/ui/Icons'
import IconBtn from '@/components/ui/IconBtn'
import ConfirmDelete from '@/components/ui/ConfirmDelete'
import HabitSuggestionPanel from './HabitSuggestionPanel'
import StepRow from './StepRow'

/* ── STYLE CONSTANTS ── */
export const CATEGORY_COLORS: Record<string, string> = {
  product:   'linear-gradient(90deg, #b8882a 0%, #e8c870 100%)',
  health:    'linear-gradient(90deg, #8a5a38 0%, #c89060 100%)',
  learning:  'linear-gradient(90deg, #385a8a 0%, #6090c8 100%)',
  financial: 'linear-gradient(90deg, #b8882a 0%, #e8c870 100%)',
  wellbeing: 'linear-gradient(90deg, #4a7a60 0%, #8ab89a 100%)',
  other:     'linear-gradient(90deg, #4a7a60 0%, #8ab89a 100%)',
}
export const CATEGORY_BADGE: Record<string, { bg: string; color: string }> = {
  product:   { bg: 'rgba(212,168,83,0.12)',  color: 'var(--gold)' },
  health:    { bg: 'rgba(200,144,96,0.12)',  color: '#c89060' },
  learning:  { bg: 'rgba(96,144,200,0.12)',  color: '#6090c8' },
  financial: { bg: 'rgba(212,168,83,0.12)',  color: 'var(--gold)' },
  wellbeing: { bg: 'rgba(122,158,138,0.12)', color: 'var(--sage)' },
  other:     { bg: 'rgba(122,158,138,0.12)', color: 'var(--sage)' },
}

/* ── ADD STEP FORM ── */
function AddStepForm({ onAdd }: { onAdd: (title: string, due_date: string | null) => void }) {
  const [open,  setOpen]  = useState(false)
  const [title, setTitle] = useState('')
  const [date,  setDate]  = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (open) inputRef.current?.focus() }, [open])

  const submit = () => {
    if (!title.trim()) return
    onAdd(title.trim(), date || null)
    setTitle(''); setDate(''); setOpen(false)
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      style={{ marginTop: '10px', background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: '4px 0', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
      <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span> Add step
    </button>
  )

  return (
    <div style={{ marginTop: '10px', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        ref={inputRef}
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setOpen(false) }}
        placeholder="Step title…"
        style={{ flex: 1, minWidth: '160px', background: 'var(--bg-3)', border: '1px solid var(--border-md)', borderRadius: '7px', padding: '7px 10px', fontSize: '13px', color: 'var(--text-0)', outline: 'none', fontFamily: 'inherit' }}
      />
      <input
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        style={{ background: 'var(--bg-3)', border: '1px solid var(--border-md)', borderRadius: '7px', padding: '7px 8px', fontSize: '12px', color: 'var(--text-0)', outline: 'none', colorScheme: 'dark', fontFamily: 'inherit' }}
      />
      <button onClick={submit} style={{ background: 'var(--gold)', color: '#131110', border: 'none', borderRadius: '7px', padding: '7px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>Add</button>
      <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '20px', cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}>×</button>
    </div>
  )
}

/* ── CARD PROPS ── */
export type GoalCardProps = {
  goal: GoalWithSteps
  stepsMap: Map<string, GoalStep[]>
  generatingFor: Set<string>
  suggestingFor: Set<string>
  habitNames: string[]
  habits: Habit[]
  habitCompletions: Record<string, number>
  expanded: Set<string>
  onToggleExpand: (id: string) => void
  onEdit: (g: GoalWithSteps) => void
  onDelete: (id: string) => void
  onUpdate: (g: GoalWithSteps) => void
  onToggleStep: (goalId: string, stepId: string, completed: boolean) => void
  onAddStep: (goalId: string, title: string, due_date: string | null) => void
  onUpdateStep: (goalId: string, stepId: string, updates: { title?: string; due_date?: string | null }) => void
  onDeleteStep: (goalId: string, stepId: string) => void
  onRegenerate: (goalId: string) => void
  onHabitAdded: (name: string, habit: Habit) => void
  onDismissSuggestion: (goalId: string) => void
}

export default function GoalCard({
  goal, stepsMap, generatingFor, suggestingFor, habitNames, habits, habitCompletions,
  expanded, onToggleExpand, onEdit, onDelete, onUpdate,
  onToggleStep, onAddStep, onUpdateStep, onDeleteStep, onRegenerate,
  onHabitAdded, onDismissSuggestion,
}: GoalCardProps) {
  const [hovered,        setHovered]        = useState(false)
  const [confirmDelete,  setConfirmDelete]  = useState(false)
  const [editingProgress, setEditingProgress] = useState(false)
  const [progressVal,    setProgressVal]    = useState(goal.progress_pct)
  const [isPending, startTransition]        = useTransition()

  const steps          = stepsMap.get(goal.id) ?? []
  const isGenerating   = generatingFor.has(goal.id)
  const isSuggesting   = suggestingFor.has(goal.id)
  const isExpanded     = expanded.has(goal.id)
  const hasSteps       = steps.length > 0
  const doneCount      = steps.filter(s => s.completed).length
  const isHabitTracked = goal.tracking_mode === 'habits'

  const gradient = CATEGORY_COLORS[goal.category] ?? CATEGORY_COLORS.other
  const badge    = CATEGORY_BADGE[goal.category]  ?? CATEGORY_BADGE.other
  const daysLeft = goal.target_date
    ? Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / 86400000)
    : null

  const vitality: GoalVitality = goal.status === 'active'
    ? computeGoalVitality(goal, steps)
    : { signal: 'on_track', label: '', detail: null }

  const stripeColor  = VITALITY_STRIPE[vitality.signal]
  const progressGrad = vitality.signal !== 'on_track'
    ? VITALITY_PROGRESS[vitality.signal]
    : gradient
  const vBadge = vitality.signal !== 'on_track'
    ? VITALITY_BADGE[vitality.signal]
    : null

  useEffect(() => { setProgressVal(goal.progress_pct) }, [goal.progress_pct])

  const saveProgress = () => {
    startTransition(async () => {
      await updateGoalAction(goal.id, { progress_pct: progressVal })
      onUpdate({ ...goal, progress_pct: progressVal, steps })
      setEditingProgress(false)
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      await deleteGoalAction(goal.id)
      onDelete(goal.id)
    })
  }

  return (
    <div
      style={{ background: 'var(--glass-card-bg)', backdropFilter: 'blur(32px) saturate(180%)', WebkitBackdropFilter: 'blur(32px) saturate(180%)', border: `1px solid ${hovered ? 'rgba(255,255,255,0.22)' : 'var(--glass-card-border)'}`, boxShadow: 'var(--glass-card-shadow-sm)', borderRadius: 'var(--radius-lg)', marginBottom: '10px', transition: 'border-color 0.2s', position: 'relative', overflow: 'hidden' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false) }}
    >
      {/* Vitality left-stripe */}
      {vitality.signal !== 'on_track' && (
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: stripeColor, borderRadius: '4px 0 0 4px', zIndex: 1 }} />
      )}

      {/* Card body */}
      <div style={{ padding: '18px 22px 14px', paddingLeft: vitality.signal !== 'on_track' ? '25px' : '22px' }}>
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-0)', lineHeight: 1.3, marginBottom: '5px' }}>
              {goal.status === 'completed' && <span style={{ color: 'var(--sage)', marginRight: '6px' }}>✓</span>}
              {goal.title}
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', background: badge.bg, color: badge.color }}>
                {goal.category}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                {goal.timeframe === 'quarter' ? `Q${Math.ceil((new Date().getMonth() + 1) / 3)}` : goal.timeframe === 'year' ? new Date().getFullYear() : 'Ongoing'}
              </span>
              {hasSteps && (
                <span style={{ fontSize: '10.5px', color: doneCount === steps.length ? 'var(--sage)' : 'var(--text-3)', fontWeight: 600 }}>
                  {doneCount === steps.length ? '✓ ' : ''}{doneCount}/{steps.length} steps
                </span>
              )}
              {vBadge && (
                <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', fontWeight: 700, letterSpacing: '0.04em', background: vBadge.bg, color: vBadge.color, display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span>{vBadge.icon}</span>
                  <span>{vitality.label}{vitality.detail ? ` · ${vitality.detail}` : ''}</span>
                </span>
              )}
            </div>
          </div>

          {/* Actions + Progress % */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {hovered && !confirmDelete && !editingProgress && (
              <div style={{ display: 'flex', gap: '4px' }}>
                <IconBtn title="Edit" onClick={() => onEdit(goal)}><PencilIcon /></IconBtn>
                <IconBtn title="Delete" danger onClick={() => setConfirmDelete(true)}><TrashIcon /></IconBtn>
              </div>
            )}
            {confirmDelete && (
              <ConfirmDelete onConfirm={handleDelete} onCancel={() => setConfirmDelete(false)} />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isHabitTracked && (
                <span title="Progress auto-tracked from habit completions" style={{ fontSize: '13px', color: 'var(--sage)', lineHeight: 1 }}>⟳</span>
              )}
              <button
                onClick={() => !hasSteps && !isHabitTracked && setEditingProgress(true)}
                title={isHabitTracked ? 'Progress auto-tracked from habit completions' : hasSteps ? 'Progress driven by steps' : 'Update progress'}
                style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 300, color: 'var(--text-0)', background: 'none', border: 'none', cursor: (hasSteps || isHabitTracked) ? 'default' : 'pointer', padding: 0, lineHeight: 1 }}
              >
                {goal.progress_pct}%
              </button>
            </div>
          </div>
        </div>

        {/* Progress bar or inline slider */}
        {editingProgress && !hasSteps && !isHabitTracked ? (
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <input type="range" min={0} max={100} value={progressVal} onChange={e => setProgressVal(Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--gold)', cursor: 'pointer' }} />
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', color: 'var(--text-0)', width: '44px', textAlign: 'right' }}>{progressVal}%</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={saveProgress} disabled={isPending} style={{ background: 'var(--gold)', color: '#131110', border: 'none', borderRadius: '7px', padding: '7px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>{isPending ? 'Saving…' : 'Save'}</button>
              <button onClick={() => setEditingProgress(false)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: '7px', padding: '7px 12px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ height: '3px', background: 'var(--bg-4)', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
            <div style={{ height: '100%', borderRadius: '4px', background: progressGrad, width: `${goal.progress_pct}%`, transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)' }} />
          </div>
        )}

        {/* Deadline */}
        {daysLeft !== null && (
          <div style={{ fontSize: '11.5px', color: daysLeft <= 0 ? '#e07060' : daysLeft < 7 ? '#e0a060' : 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Due</span>
            <span>{daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? 'Today' : 'Overdue'}</span>
          </div>
        )}

        {/* Steps toggle button */}
        {isHabitTracked ? (
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--sage)', padding: '3px 8px', borderRadius: '20px', background: 'rgba(122,158,138,0.12)', border: '1px solid rgba(122,158,138,0.2)' }}>
              ⟳ Habit-tracked · updates on each check
            </span>
          </div>
        ) : (
          <button
            onClick={() => onToggleExpand(goal.id)}
            className="icon-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: '12px', fontWeight: 600, padding: '0', letterSpacing: '0.04em', textTransform: 'uppercase' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 4l4 4 4-4"/></svg>
            {isGenerating ? 'Locus is planning steps…' : hasSteps ? `Steps (${doneCount}/${steps.length})` : 'Steps'}
          </button>
        )}

        {/* Linked habits */}
        {(() => {
          const linked = habits.filter(h => h.goal_id === goal.id)
          if (linked.length === 0) return null
          return (
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '6px' }}>
                Habits linked · {linked.length}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {linked.map(h => {
                  const completions = habitCompletions[h.id] ?? 0
                  const byCount = !!(h.goal_target_count && h.goal_target_count > 0)
                  let pct = 0
                  if (byCount) {
                    pct = Math.min(100, Math.round((completions / h.goal_target_count!) * 100))
                  } else {
                    const today = new Date().toISOString().split('T')[0]
                    const windowStart = goal.created_at.split('T')[0]
                    const windowEnd = goal.target_date ?? today
                    const habitStart = h.created_at.split('T')[0]
                    const start = habitStart > windowStart ? habitStart : windowStart
                    const daysOfWeek = h.days_of_week
                    const cur = new Date(start + 'T12:00:00Z')
                    const end = new Date(windowEnd + 'T12:00:00Z')
                    let scheduled = 0
                    while (cur <= end) {
                      const dow = cur.getUTCDay()
                      if (!daysOfWeek || daysOfWeek.length === 0 || daysOfWeek.includes(dow)) scheduled++
                      cur.setUTCDate(cur.getUTCDate() + 1)
                    }
                    pct = scheduled > 0 ? Math.min(100, Math.round((completions / scheduled) * 100)) : 0
                  }
                  const barColor = pct >= 100 ? 'var(--sage)' : pct >= 60 ? 'var(--gold)' : 'var(--text-3)'
                  return (
                    <div key={h.id} style={{ padding: '8px 10px', borderRadius: '8px', background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '14px', flexShrink: 0 }}>{h.emoji}</span>
                        <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-1)', fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</span>
                        <span style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', flexShrink: 0, color: byCount ? 'var(--gold)' : 'var(--text-3)', background: byCount ? 'rgba(212,168,83,0.1)' : 'var(--bg-3)', border: `1px solid ${byCount ? 'rgba(212,168,83,0.25)' : 'var(--border)'}`, borderRadius: '10px', padding: '1px 6px' }}>
                          {byCount ? `× ${h.goal_target_count}` : h.frequency}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: barColor, flexShrink: 0, minWidth: '30px', textAlign: 'right' }}>{pct}%</span>
                      </div>
                      <div style={{ height: '3px', background: 'var(--bg-4)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: '4px', background: barColor, width: `${pct}%`, transition: 'width 0.5s cubic-bezier(0.22,1,0.36,1)' }} />
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '4px' }}>
                        {byCount ? `${completions} of ${h.goal_target_count} completions` : 'tracking by schedule'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* Habit suggestions */}
        {isSuggesting && (
          <HabitSuggestionPanel
            goalId={goal.id}
            existingHabitNames={habitNames}
            onHabitAdded={onHabitAdded}
            onDismiss={() => onDismissSuggestion(goal.id)}
          />
        )}
      </div>

      {/* Steps panel */}
      {isExpanded && !isHabitTracked && (
        <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-0)', padding: '0 22px 16px' }}>
          {isGenerating && (
            <div style={{ paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[0.9, 0.7, 0.8, 0.65, 0.75].map((w, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--bg-3)', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
                  <div style={{ height: '12px', borderRadius: '6px', background: 'var(--bg-3)', width: `${w * 100}%`, animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
                </div>
              ))}
              <div style={{ fontSize: '12px', color: 'var(--gold)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--gold)', animation: 'pulse 1s ease-in-out infinite' }} />
                Locus AI is breaking down your goal…
              </div>
            </div>
          )}

          {!isGenerating && steps.map(step => (
            <StepRow
              key={step.id}
              step={step}
              onToggle={completed => onToggleStep(goal.id, step.id, completed)}
              onUpdate={updates => onUpdateStep(goal.id, step.id, updates)}
              onDelete={() => onDeleteStep(goal.id, step.id)}
            />
          ))}

          {!isGenerating && steps.length === 0 && (
            <div style={{ paddingTop: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '12px' }}>No steps yet.</div>
              <button
                onClick={() => onRegenerate(goal.id)}
                style={{ background: 'var(--gold-dim)', border: '1px solid rgba(212,168,83,0.25)', borderRadius: '8px', color: 'var(--gold)', fontSize: '12px', fontWeight: 700, padding: '7px 16px', cursor: 'pointer', letterSpacing: '0.04em' }}
              >
                ✦ Generate steps with AI
              </button>
            </div>
          )}

          {!isGenerating && (
            <div style={{ marginTop: steps.length > 0 ? '4px' : '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <AddStepForm onAdd={(title, date) => onAddStep(goal.id, title, date)} />
              {steps.length > 0 && (
                <button
                  onClick={() => onRegenerate(goal.id)}
                  title="Regenerate steps with AI"
                  className="icon-btn"
                  style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '11px', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', letterSpacing: '0.04em' }}
                >
                  ✦ Re-generate
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
