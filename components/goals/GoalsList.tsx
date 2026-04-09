'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { GoalWithSteps, GoalStep } from '@/lib/types'
import { createGoalAction, updateGoalAction, deleteGoalAction, type GoalFormData } from '@/app/actions/goals'
import {
  generateAndSaveStepsAction,
  toggleStepAction,
  createStepAction,
  updateStepAction,
  deleteStepAction,
} from '@/app/actions/goal-steps'

/* ── STYLE CONSTANTS ── */
const CATEGORY_COLORS: Record<string, string> = {
  product:   'linear-gradient(90deg, #b8882a 0%, #e8c870 100%)',
  health:    'linear-gradient(90deg, #8a5a38 0%, #c89060 100%)',
  learning:  'linear-gradient(90deg, #385a8a 0%, #6090c8 100%)',
  financial: 'linear-gradient(90deg, #b8882a 0%, #e8c870 100%)',
  wellbeing: 'linear-gradient(90deg, #4a7a60 0%, #8ab89a 100%)',
  other:     'linear-gradient(90deg, #4a7a60 0%, #8ab89a 100%)',
}
const CATEGORY_BADGE: Record<string, { bg: string; color: string }> = {
  product:   { bg: 'rgba(212,168,83,0.12)',  color: 'var(--gold)' },
  health:    { bg: 'rgba(200,144,96,0.12)',  color: '#c89060' },
  learning:  { bg: 'rgba(96,144,200,0.12)',  color: '#6090c8' },
  financial: { bg: 'rgba(212,168,83,0.12)',  color: 'var(--gold)' },
  wellbeing: { bg: 'rgba(122,158,138,0.12)', color: 'var(--sage)' },
  other:     { bg: 'rgba(122,158,138,0.12)', color: 'var(--sage)' },
}
const CATEGORIES = ['product', 'health', 'learning', 'financial', 'wellbeing', 'other']
const TIMEFRAMES  = ['quarter', 'year', 'ongoing']
const STATUSES    = ['active', 'paused', 'completed']

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--bg-3)', border: '1px solid var(--border)',
  borderRadius: '8px', padding: '10px 13px', fontSize: '14px',
  color: 'var(--text-0)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}
const labelStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 600, color: 'var(--text-2)',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px', display: 'block',
}

const EMPTY_FORM: GoalFormData = {
  title: '', category: 'product', timeframe: 'quarter',
  progress_pct: 0, next_action: '', target_date: null, status: 'active',
}

type ModalState = null | { mode: 'add' } | { mode: 'edit'; goal: GoalWithSteps }

/* ── ROOT ── */
export default function GoalsList({ goals: initial }: { goals: GoalWithSteps[] }) {
  const [goals, setGoals]   = useState<GoalWithSteps[]>(initial)
  const [modal, setModal]   = useState<ModalState>(null)
  // steps state per goalId
  const [stepsMap, setStepsMap] = useState<Map<string, GoalStep[]>>(() => {
    const m = new Map<string, GoalStep[]>()
    initial.forEach(g => m.set(g.id, g.steps ?? []))
    return m
  })
  // which goal cards are currently generating AI steps
  const [generatingFor, setGeneratingFor] = useState<Set<string>>(new Set())
  // which goal cards have the steps panel expanded
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const router = useRouter()

  const closeModal = () => setModal(null)

  const toggleExpand = (goalId: string) =>
    setExpanded(s => {
      const n = new Set(s)
      n.has(goalId) ? n.delete(goalId) : n.add(goalId)
      return n
    })

  /* ── GOAL SAVED (add or edit) ── */
  const handleGoalSaved = async (goal: GoalWithSteps, isNew: boolean) => {
    if (isNew) {
      setGoals(gs => [...gs, goal])
      setStepsMap(m => new Map(m).set(goal.id, []))
      // auto-expand + generate steps
      setExpanded(s => new Set([...s, goal.id]))
      setGeneratingFor(s => new Set([...s, goal.id]))
      try {
        const steps = await generateAndSaveStepsAction(goal.id)
        setStepsMap(m => new Map(m).set(goal.id, steps))
        // progress starts at 0 when steps exist
        setGoals(gs => gs.map(g => g.id === goal.id ? { ...g, progress_pct: 0 } : g))
      } catch (err) {
        console.error('Step generation failed:', err)
      } finally {
        setGeneratingFor(s => { const n = new Set(s); n.delete(goal.id); return n })
      }
    } else {
      setGoals(gs => gs.map(g => g.id === goal.id ? { ...goal, steps: stepsMap.get(goal.id) ?? [] } : g))
    }
    closeModal()
    router.refresh()
  }

  /* ── GOAL DELETED ── */
  const handleDeleted = (goalId: string) => {
    setGoals(gs => gs.filter(g => g.id !== goalId))
    setStepsMap(m => { const n = new Map(m); n.delete(goalId); return n })
    router.refresh()
  }

  /* ── STEP TOGGLE (optimistic) ── */
  const handleToggleStep = async (goalId: string, stepId: string, completed: boolean) => {
    // Optimistic step update
    setStepsMap(m => {
      const n = new Map(m)
      n.set(goalId, (n.get(goalId) ?? []).map(s =>
        s.id === stepId ? { ...s, completed, completed_at: completed ? new Date().toISOString() : null } : s
      ))
      return n
    })
    // Optimistic progress update
    const currentSteps = stepsMap.get(goalId) ?? []
    const updatedSteps = currentSteps.map(s => s.id === stepId ? { ...s, completed } : s)
    const newPct = updatedSteps.length > 0
      ? Math.round(updatedSteps.filter(s => s.completed).length / updatedSteps.length * 100) : 0
    setGoals(gs => gs.map(g => g.id === goalId ? { ...g, progress_pct: newPct } : g))

    try {
      await toggleStepAction(stepId, completed)
    } catch {
      // Revert on failure
      setStepsMap(m => {
        const n = new Map(m)
        n.set(goalId, (n.get(goalId) ?? []).map(s =>
          s.id === stepId ? { ...s, completed: !completed, completed_at: null } : s
        ))
        return n
      })
      const revertPct = currentSteps.length > 0
        ? Math.round(currentSteps.filter(s => s.completed).length / currentSteps.length * 100) : 0
      setGoals(gs => gs.map(g => g.id === goalId ? { ...g, progress_pct: revertPct } : g))
    }
  }

  /* ── STEP ADD ── */
  const handleAddStep = async (goalId: string, title: string, due_date: string | null) => {
    try {
      const newStep = await createStepAction(goalId, title, due_date)
      setStepsMap(m => new Map(m).set(goalId, [...(m.get(goalId) ?? []), newStep]))
      // Recalculate progress
      const steps = [...(stepsMap.get(goalId) ?? []), newStep]
      const pct = steps.length > 0 ? Math.round(steps.filter(s => s.completed).length / steps.length * 100) : 0
      setGoals(gs => gs.map(g => g.id === goalId ? { ...g, progress_pct: pct } : g))
    } catch (err) { console.error('Add step failed:', err) }
  }

  /* ── STEP UPDATE ── */
  const handleUpdateStep = async (goalId: string, stepId: string, updates: { title?: string; due_date?: string | null }) => {
    setStepsMap(m => {
      const n = new Map(m)
      n.set(goalId, (n.get(goalId) ?? []).map(s => s.id === stepId ? { ...s, ...updates } : s))
      return n
    })
    try { await updateStepAction(stepId, updates) }
    catch (err) { console.error('Update step failed:', err) }
  }

  /* ── STEP DELETE ── */
  const handleDeleteStep = async (goalId: string, stepId: string) => {
    setStepsMap(m => {
      const n = new Map(m)
      n.set(goalId, (n.get(goalId) ?? []).filter(s => s.id !== stepId))
      return n
    })
    const steps = (stepsMap.get(goalId) ?? []).filter(s => s.id !== stepId)
    const pct = steps.length > 0 ? Math.round(steps.filter(s => s.completed).length / steps.length * 100) : 0
    setGoals(gs => gs.map(g => g.id === goalId ? { ...g, progress_pct: pct } : g))
    try { await deleteStepAction(stepId) }
    catch (err) { console.error('Delete step failed:', err) }
  }

  /* ── REGENERATE STEPS ── */
  const handleRegenerateSteps = async (goalId: string) => {
    setGeneratingFor(s => new Set([...s, goalId]))
    setStepsMap(m => new Map(m).set(goalId, []))
    try {
      const steps = await generateAndSaveStepsAction(goalId)
      setStepsMap(m => new Map(m).set(goalId, steps))
      const pct = steps.length > 0 ? Math.round(steps.filter(s => s.completed).length / steps.length * 100) : 0
      setGoals(gs => gs.map(g => g.id === goalId ? { ...g, progress_pct: pct } : g))
    } catch (err) { console.error('Regenerate failed:', err) }
    finally { setGeneratingFor(s => { const n = new Set(s); n.delete(goalId); return n }) }
  }

  const active    = goals.filter(g => g.status === 'active')
  const paused    = goals.filter(g => g.status === 'paused')
  const completed = goals.filter(g => g.status === 'completed')
  const quarter   = active.filter(g => g.timeframe === 'quarter')
  const yearly    = active.filter(g => g.timeframe === 'year')
  const ongoing   = active.filter(g => g.timeframe === 'ongoing')

  return (
    <>
      <div className="page-pad" style={{ maxWidth: '860px', animation: 'fadeUp 0.3s var(--ease) both' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 600, marginBottom: '6px', opacity: 0.85 }}>Your System</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '34px', fontWeight: 400, color: 'var(--text-0)', lineHeight: 1.15 }}>
              Goals & <em style={{ fontStyle: 'italic', color: 'var(--text-1)' }}>Direction</em>
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-2)', marginTop: '6px' }}>
              {active.length} active · {completed.length} completed
            </div>
          </div>
          <button onClick={() => setModal({ mode: 'add' })}
            style={{ background: 'var(--gold)', color: '#131110', border: 'none', borderRadius: '10px', padding: '11px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', flexShrink: 0, marginTop: '6px', whiteSpace: 'nowrap' }}>
            + Add goal
          </button>
        </div>

        {quarter.length > 0 && <GoalSection title={`This Quarter · Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`} goals={quarter} stepsMap={stepsMap} generatingFor={generatingFor} expanded={expanded} onToggleExpand={toggleExpand} onEdit={g => setModal({ mode: 'edit', goal: g })} onDelete={handleDeleted} onUpdate={g => setGoals(gs => gs.map(x => x.id === g.id ? g : x))} onToggleStep={handleToggleStep} onAddStep={handleAddStep} onUpdateStep={handleUpdateStep} onDeleteStep={handleDeleteStep} onRegenerate={handleRegenerateSteps} />}
        {yearly.length > 0  && <GoalSection title={`This Year · ${new Date().getFullYear()}`}    goals={yearly}   stepsMap={stepsMap} generatingFor={generatingFor} expanded={expanded} onToggleExpand={toggleExpand} onEdit={g => setModal({ mode: 'edit', goal: g })} onDelete={handleDeleted} onUpdate={g => setGoals(gs => gs.map(x => x.id === g.id ? g : x))} onToggleStep={handleToggleStep} onAddStep={handleAddStep} onUpdateStep={handleUpdateStep} onDeleteStep={handleDeleteStep} onRegenerate={handleRegenerateSteps} />}
        {ongoing.length > 0 && <GoalSection title="Ongoing"                                         goals={ongoing}  stepsMap={stepsMap} generatingFor={generatingFor} expanded={expanded} onToggleExpand={toggleExpand} onEdit={g => setModal({ mode: 'edit', goal: g })} onDelete={handleDeleted} onUpdate={g => setGoals(gs => gs.map(x => x.id === g.id ? g : x))} onToggleStep={handleToggleStep} onAddStep={handleAddStep} onUpdateStep={handleUpdateStep} onDeleteStep={handleDeleteStep} onRegenerate={handleRegenerateSteps} />}
        {paused.length > 0  && <GoalSection title="Paused"     goals={paused}    stepsMap={stepsMap} generatingFor={generatingFor} expanded={expanded} onToggleExpand={toggleExpand} onEdit={g => setModal({ mode: 'edit', goal: g })} onDelete={handleDeleted} onUpdate={g => setGoals(gs => gs.map(x => x.id === g.id ? g : x))} onToggleStep={handleToggleStep} onAddStep={handleAddStep} onUpdateStep={handleUpdateStep} onDeleteStep={handleDeleteStep} onRegenerate={handleRegenerateSteps} dim />}
        {completed.length > 0 && <GoalSection title="Completed" goals={completed} stepsMap={stepsMap} generatingFor={generatingFor} expanded={expanded} onToggleExpand={toggleExpand} onEdit={g => setModal({ mode: 'edit', goal: g })} onDelete={handleDeleted} onUpdate={g => setGoals(gs => gs.map(x => x.id === g.id ? g : x))} onToggleStep={handleToggleStep} onAddStep={handleAddStep} onUpdateStep={handleUpdateStep} onDeleteStep={handleDeleteStep} onRegenerate={handleRegenerateSteps} dim />}

        {goals.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-1)', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎯</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 300, color: 'var(--text-1)', marginBottom: '8px' }}>No goals yet.</div>
            <div style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '20px' }}>Add a goal and Locus AI will break it into steps automatically.</div>
            <button onClick={() => setModal({ mode: 'add' })} style={{ background: 'var(--gold)', color: '#131110', border: 'none', borderRadius: '8px', padding: '11px 24px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
              Add your first goal →
            </button>
          </div>
        )}
      </div>

      {modal && (
        <GoalModal
          mode={modal.mode}
          goal={modal.mode === 'edit' ? modal.goal : undefined}
          hasSteps={modal.mode === 'edit' ? (stepsMap.get(modal.goal.id) ?? []).length > 0 : false}
          onClose={closeModal}
          onSaved={(g, isNew) => handleGoalSaved(g, isNew)}
        />
      )}
    </>
  )
}

/* ── SECTION ── */
type SectionProps = {
  title: string; goals: GoalWithSteps[]; dim?: boolean
  stepsMap: Map<string, GoalStep[]>; generatingFor: Set<string>
  expanded: Set<string>; onToggleExpand: (id: string) => void
  onEdit: (g: GoalWithSteps) => void; onDelete: (id: string) => void
  onUpdate: (g: GoalWithSteps) => void
  onToggleStep: (goalId: string, stepId: string, completed: boolean) => void
  onAddStep: (goalId: string, title: string, due_date: string | null) => void
  onUpdateStep: (goalId: string, stepId: string, updates: { title?: string; due_date?: string | null }) => void
  onDeleteStep: (goalId: string, stepId: string) => void
  onRegenerate: (goalId: string) => void
}
function GoalSection({ title, goals, dim, ...handlers }: SectionProps) {
  return (
    <div style={{ marginBottom: '32px', opacity: dim ? 0.65 : 1 }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', fontWeight: 400, color: 'var(--text-1)', marginBottom: '14px', letterSpacing: '0.01em', display: 'flex', alignItems: 'center', gap: '10px' }}>
        {title}
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
      </div>
      {goals.map(g => <GoalCard key={g.id} goal={g} {...handlers} />)}
    </div>
  )
}

/* ── GOAL CARD ── */
type CardProps = Omit<SectionProps, 'title' | 'goals' | 'dim'> & { goal: GoalWithSteps }
function GoalCard({ goal, stepsMap, generatingFor, expanded, onToggleExpand, onEdit, onDelete, onUpdate, onToggleStep, onAddStep, onUpdateStep, onDeleteStep, onRegenerate }: CardProps) {
  const [hovered,       setHovered]       = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editingProgress, setEditingProgress] = useState(false)
  const [progressVal, setProgressVal]     = useState(goal.progress_pct)
  const [isPending, startTransition]      = useTransition()

  const steps      = stepsMap.get(goal.id) ?? []
  const isGenerating = generatingFor.has(goal.id)
  const isExpanded = expanded.has(goal.id)
  const hasSteps   = steps.length > 0
  const doneCount  = steps.filter(s => s.completed).length

  const gradient = CATEGORY_COLORS[goal.category] ?? CATEGORY_COLORS.other
  const badge    = CATEGORY_BADGE[goal.category]  ?? CATEGORY_BADGE.other
  const daysLeft = goal.target_date
    ? Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / 86400000)
    : null

  // Sync local progressVal when steps change
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
      style={{ background: 'var(--bg-1)', border: `1px solid ${hovered ? 'var(--border-md)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', marginBottom: '10px', transition: 'border-color 0.2s', position: 'relative', overflow: 'hidden' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false) }}
    >
      {/* Card body */}
      <div style={{ padding: '18px 22px 14px' }}>
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
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>Delete?</span>
                <button onClick={handleDelete} disabled={isPending} style={{ background: '#c0392b', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Yes</button>
                <button onClick={() => setConfirmDelete(false)} style={{ background: 'var(--bg-3)', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}>No</button>
              </div>
            )}
            {/* Progress % — only clickable when no steps */}
            <button
              onClick={() => !hasSteps && setEditingProgress(true)}
              title={hasSteps ? 'Progress driven by steps' : 'Update progress'}
              style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 300, color: 'var(--text-0)', background: 'none', border: 'none', cursor: hasSteps ? 'default' : 'pointer', padding: 0, lineHeight: 1 }}
            >
              {goal.progress_pct}%
            </button>
          </div>
        </div>

        {/* Progress bar or inline slider */}
        {editingProgress && !hasSteps ? (
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
            <div style={{ height: '100%', borderRadius: '4px', background: gradient, width: `${goal.progress_pct}%`, transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)' }} />
          </div>
        )}

        {/* Next action + deadline */}
        <div style={{ fontSize: '12.5px', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontWeight: 600, flexShrink: 0 }}>Next</span>
          <span style={{ flex: 1 }}>{goal.next_action || '—'}</span>
          {daysLeft !== null && (
            <span style={{ fontSize: '11px', color: daysLeft <= 0 ? '#e07060' : daysLeft < 7 ? '#e0a060' : 'var(--text-3)', flexShrink: 0 }}>
              {daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? 'Due today' : 'Overdue'}
            </span>
          )}
        </div>

        {/* Steps toggle button */}
        <button
          onClick={() => onToggleExpand(goal.id)}
          className="icon-btn"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: '12px', fontWeight: 600, padding: '0', letterSpacing: '0.04em', textTransform: 'uppercase' }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 4l4 4 4-4"/></svg>
          {isGenerating ? 'Locus is planning steps…' : hasSteps ? `Steps (${doneCount}/${steps.length})` : 'Steps'}
        </button>
      </div>

      {/* Steps panel */}
      {isExpanded && (
        <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-0)', padding: '0 22px 16px' }}>

          {/* Generating skeleton */}
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

          {/* Step list */}
          {!isGenerating && steps.map(step => (
            <StepRow
              key={step.id}
              step={step}
              onToggle={completed => onToggleStep(goal.id, step.id, completed)}
              onUpdate={updates => onUpdateStep(goal.id, step.id, updates)}
              onDelete={() => onDeleteStep(goal.id, step.id)}
            />
          ))}

          {/* No steps + empty state */}
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

          {/* Add step + regenerate */}
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

/* ── STEP ROW ── */
function StepRow({ step, onToggle, onUpdate, onDelete }: {
  step: GoalStep
  onToggle: (completed: boolean) => void
  onUpdate: (updates: { title?: string; due_date?: string | null }) => void
  onDelete: () => void
}) {
  const [editing,   setEditing]   = useState(false)
  const [title,     setTitle]     = useState(step.title)
  const [hovered,   setHovered]   = useState(false)
  const [editDate,  setEditDate]  = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const isOverdue = step.due_date && !step.completed &&
    new Date(step.due_date + 'T23:59:59') < new Date()
  const daysLeft = step.due_date
    ? Math.ceil((new Date(step.due_date).getTime() - Date.now()) / 86400000)
    : null

  const saveTitle = () => {
    if (title.trim() && title.trim() !== step.title) onUpdate({ title: title.trim() })
    setEditing(false)
  }

  const formattedDate = step.due_date
    ? new Date(step.due_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setEditDate(false) }}
      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: '1px solid var(--border)' }}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(!step.completed)}
        className="icon-btn"
        style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${step.completed ? 'var(--sage)' : 'var(--border-bright)'}`, background: step.completed ? 'var(--sage)' : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', padding: 0 }}
      >
        {step.completed && (
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path d="M1.5 4.5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Title */}
      {editing ? (
        <input
          ref={inputRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setTitle(step.title); setEditing(false) } }}
          style={{ flex: 1, background: 'var(--bg-3)', border: '1px solid var(--border-md)', borderRadius: '6px', padding: '4px 8px', fontSize: '13px', color: 'var(--text-0)', outline: 'none', fontFamily: 'inherit' }}
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          style={{ flex: 1, fontSize: '13px', color: step.completed ? 'var(--text-3)' : 'var(--text-1)', textDecoration: step.completed ? 'line-through' : 'none', cursor: 'text', lineHeight: 1.4 }}
        >
          {step.title}
        </span>
      )}

      {/* Due date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        {editDate ? (
          <input
            type="date"
            defaultValue={step.due_date ?? ''}
            autoFocus
            onBlur={e => { onUpdate({ due_date: e.target.value || null }); setEditDate(false) }}
            onChange={e => { if (e.target.value) onUpdate({ due_date: e.target.value }) }}
            style={{ background: 'var(--bg-3)', border: '1px solid var(--border-md)', borderRadius: '6px', padding: '2px 6px', fontSize: '11px', color: 'var(--text-0)', outline: 'none', colorScheme: 'dark', fontFamily: 'inherit' }}
          />
        ) : formattedDate ? (
          <button
            onClick={() => setEditDate(true)}
            title="Edit due date"
            className="icon-btn"
            style={{ fontSize: '11px', color: isOverdue ? '#e07060' : step.completed ? 'var(--text-3)' : daysLeft !== null && daysLeft <= 3 ? '#e0a060' : 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px', fontFamily: 'inherit' }}
          >
            {isOverdue ? '⚠ ' : ''}{formattedDate}
          </button>
        ) : hovered ? (
          <button onClick={() => setEditDate(true)} className="icon-btn" style={{ fontSize: '10px', color: 'var(--text-3)', background: 'none', border: '1px dashed var(--border-md)', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', fontFamily: 'inherit' }}>+ date</button>
        ) : null}

        {hovered && !editing && (
          <button onClick={onDelete} className="icon-btn" style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 2px', borderRadius: '4px' }} title="Remove step">×</button>
        )}
      </div>
    </div>
  )
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

/* ── GOAL MODAL ── */
function GoalModal({ mode, goal, hasSteps, onClose, onSaved }: {
  mode: 'add' | 'edit'; goal?: GoalWithSteps; hasSteps: boolean
  onClose: () => void; onSaved: (g: GoalWithSteps, isNew: boolean) => void
}) {
  const [form, setForm] = useState<GoalFormData>(
    goal
      ? { title: goal.title, category: goal.category, timeframe: goal.timeframe, progress_pct: goal.progress_pct, next_action: goal.next_action || '', target_date: goal.target_date, status: goal.status }
      : EMPTY_FORM
  )
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const set = (k: keyof GoalFormData, v: string | number | null) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = () => {
    if (!form.title.trim()) { setError('Title is required.'); return }
    setError('')
    startTransition(async () => {
      try {
        if (mode === 'add') {
          await createGoalAction(form)
          const stub: GoalWithSteps = {
            id: crypto.randomUUID(), user_id: '', created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(), ...form,
            title: form.title.trim(), next_action: form.next_action.trim(), steps: [],
          } as unknown as GoalWithSteps
          onSaved(stub, true)
        } else if (goal) {
          await updateGoalAction(goal.id, form)
          onSaved({ ...goal, ...form, title: form.title.trim(), next_action: form.next_action.trim() } as unknown as GoalWithSteps, false)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} className="modal-overlay" style={{ backdropFilter: 'blur(4px)', animation: 'fadeUp 0.15s var(--ease) both' }}>
      <div className="modal-box" style={{ padding: '32px', boxShadow: '0 8px 60px rgba(0,0,0,0.5)' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 400, color: 'var(--text-0)' }}>
            {mode === 'add' ? 'New goal' : 'Edit goal'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '22px', cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Title</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="What are you working towards?" autoFocus style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Timeframe</label>
              <select value={form.timeframe} onChange={e => set('timeframe', e.target.value)} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
                {TIMEFRAMES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {/* Progress — hidden if steps drive it */}
          {hasSteps ? (
            <div style={{ background: 'var(--bg-3)', borderRadius: '8px', padding: '10px 13px', fontSize: '13px', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--gold)', fontSize: '14px' }}>✦</span>
              Progress is calculated from step completion ({goal?.progress_pct ?? 0}% — {(goal?.steps ?? []).filter(s => s.completed).length}/{(goal?.steps ?? []).length} steps done)
            </div>
          ) : (
            <div>
              <label style={labelStyle}>Progress — {form.progress_pct}%</label>
              <input type="range" min={0} max={100} value={form.progress_pct} onChange={e => set('progress_pct', Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--gold)', cursor: 'pointer' }} />
              <div style={{ height: '3px', background: 'var(--bg-4)', borderRadius: '4px', overflow: 'hidden', marginTop: '6px' }}>
                <div style={{ height: '100%', borderRadius: '4px', background: CATEGORY_COLORS[form.category] ?? CATEGORY_COLORS.other, width: `${form.progress_pct}%`, transition: 'width 0.2s' }} />
              </div>
            </div>
          )}

          <div>
            <label style={labelStyle}>Next action <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <input value={form.next_action} onChange={e => set('next_action', e.target.value)} placeholder="e.g. Write first draft" style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Target date <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
              <input type="date" value={form.target_date ?? ''} onChange={e => set('target_date', e.target.value || null)} style={{ ...inputStyle, colorScheme: 'dark' }} />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {mode === 'add' && (
            <div style={{ background: 'var(--gold-dim)', border: '1px solid rgba(212,168,83,0.2)', borderRadius: '8px', padding: '10px 13px', fontSize: '12.5px', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px' }}>✦</span>
              Locus AI will automatically break this goal into steps when you save.
            </div>
          )}

          {error && <div style={{ fontSize: '13px', color: '#e07060', background: 'rgba(200,80,60,0.08)', padding: '10px 14px', borderRadius: '8px' }}>{error}</div>}

          <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
            <button onClick={onClose} style={{ flex: 1, background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: '9px', padding: '12px', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSubmit} disabled={isPending} style={{ flex: 2, background: 'var(--gold)', color: '#131110', border: 'none', borderRadius: '9px', padding: '12px', fontSize: '14px', fontWeight: 700, cursor: isPending ? 'wait' : 'pointer', opacity: isPending ? 0.7 : 1 }}>
              {isPending ? 'Saving…' : mode === 'add' ? 'Add goal' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── SMALL ICON HELPERS ── */
function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title?: string; danger?: boolean }) {
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
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z" /></svg>
}
function TrashIcon() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5h10M6 5V3h4v2M5 5l.5 8h5l.5-8" /></svg>
}
