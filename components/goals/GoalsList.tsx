'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Goal } from '@/lib/types'
import { createGoalAction, updateGoalAction, deleteGoalAction, type GoalFormData } from '@/app/actions/goals'

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
  learning:  { bg: 'rgba(96,144,200,0.12)', color: '#6090c8' },
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
  color: 'var(--text-0)', outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 600, color: 'var(--text-2)',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px', display: 'block',
}

const EMPTY_FORM: GoalFormData = {
  title: '', category: 'product', timeframe: 'quarter',
  progress_pct: 0, next_action: '', target_date: null, status: 'active',
}

type ModalState = null | { mode: 'add' } | { mode: 'edit'; goal: Goal }

export default function GoalsList({ goals: initial }: { goals: Goal[] }) {
  const [goals, setGoals] = useState<Goal[]>(initial)
  const [modal, setModal] = useState<ModalState>(null)
  const router = useRouter()

  const openAdd  = () => setModal({ mode: 'add' })
  const openEdit = (goal: Goal) => setModal({ mode: 'edit', goal })
  const closeModal = () => setModal(null)

  const handleSaved = (updated: Goal[], newGoal?: Goal) => {
    setGoals(updated)
    closeModal()
    router.refresh()
  }

  const handleDeleted = (goalId: string) => {
    setGoals(gs => gs.filter(g => g.id !== goalId))
    router.refresh()
  }

  const active    = goals.filter(g => g.status === 'active')
  const paused    = goals.filter(g => g.status === 'paused')
  const completed = goals.filter(g => g.status === 'completed')

  const quarter = active.filter(g => g.timeframe === 'quarter')
  const yearly  = active.filter(g => g.timeframe === 'year')
  const ongoing = active.filter(g => g.timeframe === 'ongoing')

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
          <button
            onClick={openAdd}
            style={{ background: 'var(--gold)', color: '#131110', border: 'none', borderRadius: '10px', padding: '11px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', flexShrink: 0, marginTop: '6px', whiteSpace: 'nowrap' }}
          >
            + Add goal
          </button>
        </div>

        {/* Active goals */}
        {quarter.length > 0 && (
          <GoalSection title={`This Quarter · Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`} goals={quarter} onEdit={openEdit} onDelete={handleDeleted} onUpdate={(updated) => setGoals(gs => gs.map(g => g.id === updated.id ? updated : g))} />
        )}
        {yearly.length > 0 && (
          <GoalSection title={`This Year · ${new Date().getFullYear()}`} goals={yearly} onEdit={openEdit} onDelete={handleDeleted} onUpdate={(updated) => setGoals(gs => gs.map(g => g.id === updated.id ? updated : g))} />
        )}
        {ongoing.length > 0 && (
          <GoalSection title="Ongoing" goals={ongoing} onEdit={openEdit} onDelete={handleDeleted} onUpdate={(updated) => setGoals(gs => gs.map(g => g.id === updated.id ? updated : g))} />
        )}

        {/* Paused */}
        {paused.length > 0 && (
          <GoalSection title="Paused" goals={paused} onEdit={openEdit} onDelete={handleDeleted} onUpdate={(updated) => setGoals(gs => gs.map(g => g.id === updated.id ? updated : g))} dim />
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <GoalSection title="Completed" goals={completed} onEdit={openEdit} onDelete={handleDeleted} onUpdate={(updated) => setGoals(gs => gs.map(g => g.id === updated.id ? updated : g))} dim />
        )}

        {/* Empty */}
        {goals.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-1)', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎯</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 300, color: 'var(--text-1)', marginBottom: '8px' }}>No goals yet.</div>
            <div style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '20px' }}>Add your first goal to get a personalized daily brief.</div>
            <button onClick={openAdd} style={{ background: 'var(--gold)', color: '#131110', border: 'none', borderRadius: '8px', padding: '11px 24px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
              Add your first goal →
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <GoalModal
          mode={modal.mode}
          goal={modal.mode === 'edit' ? modal.goal : undefined}
          onClose={closeModal}
          onSaved={(g) => {
            if (modal.mode === 'add') setGoals(gs => [...gs, g])
            else setGoals(gs => gs.map(x => x.id === g.id ? g : x))
            closeModal()
            router.refresh()
          }}
        />
      )}
    </>
  )
}

/* ─── SECTION ─────────────────────────────── */
function GoalSection({ title, goals, onEdit, onDelete, onUpdate, dim }: {
  title: string
  goals: Goal[]
  onEdit: (g: Goal) => void
  onDelete: (id: string) => void
  onUpdate: (g: Goal) => void
  dim?: boolean
}) {
  return (
    <div style={{ marginBottom: '32px', opacity: dim ? 0.65 : 1 }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', fontWeight: 400, color: 'var(--text-1)', marginBottom: '14px', letterSpacing: '0.01em', display: 'flex', alignItems: 'center', gap: '10px' }}>
        {title}
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
      </div>
      {goals.map(g => <GoalCard key={g.id} goal={g} onEdit={onEdit} onDelete={onDelete} onUpdate={onUpdate} />)}
    </div>
  )
}

/* ─── CARD ─────────────────────────────────── */
function GoalCard({ goal, onEdit, onDelete, onUpdate }: {
  goal: Goal
  onEdit: (g: Goal) => void
  onDelete: (id: string) => void
  onUpdate: (g: Goal) => void
}) {
  const [hovered, setHovered] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editingProgress, setEditingProgress] = useState(false)
  const [progressVal, setProgressVal] = useState(goal.progress_pct)
  const [isPending, startTransition] = useTransition()

  const gradient = CATEGORY_COLORS[goal.category] ?? CATEGORY_COLORS.other
  const badge    = CATEGORY_BADGE[goal.category] ?? CATEGORY_BADGE.other
  const daysLeft = goal.target_date
    ? Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / 86400000)
    : null

  const saveProgress = () => {
    startTransition(async () => {
      await updateGoalAction(goal.id, { progress_pct: progressVal })
      onUpdate({ ...goal, progress_pct: progressVal })
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
      style={{ background: 'var(--bg-1)', border: `1px solid ${hovered ? 'var(--border-md)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: '18px 22px', marginBottom: '10px', transition: 'border-color 0.2s', position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false) }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-0)', lineHeight: 1.3, marginBottom: '5px' }}>
            {goal.status === 'completed' && <span style={{ color: 'var(--sage)', marginRight: '6px' }}>✓</span>}
            {goal.title}
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', background: badge.bg, color: badge.color }}>
              {goal.category}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
              {goal.timeframe === 'quarter' ? `Q${Math.ceil((new Date().getMonth() + 1) / 3)}` : goal.timeframe === 'year' ? new Date().getFullYear() : 'Ongoing'}
            </span>
          </div>
        </div>

        {/* Progress % — click to edit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {hovered && !confirmDelete && !editingProgress && (
            <div style={{ display: 'flex', gap: '4px' }}>
              <IconBtn title="Edit" onClick={() => onEdit(goal)}>
                <PencilIcon />
              </IconBtn>
              <IconBtn title="Delete" danger onClick={() => setConfirmDelete(true)}>
                <TrashIcon />
              </IconBtn>
            </div>
          )}
          {confirmDelete && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>Delete?</span>
              <button onClick={handleDelete} disabled={isPending} style={{ background: '#c0392b', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Yes</button>
              <button onClick={() => setConfirmDelete(false)} style={{ background: 'var(--bg-3)', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}>No</button>
            </div>
          )}
          <button
            onClick={() => { setEditingProgress(true); setProgressVal(goal.progress_pct) }}
            title="Update progress"
            style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 300, color: 'var(--text-0)', background: 'none', border: 'none', cursor: 'pointer', padding: '0', lineHeight: 1 }}
          >
            {goal.progress_pct}%
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {editingProgress ? (
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <input
              type="range" min={0} max={100} value={progressVal}
              onChange={e => setProgressVal(Number(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--gold)', cursor: 'pointer' }}
            />
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', color: 'var(--text-0)', width: '44px', textAlign: 'right' }}>{progressVal}%</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={saveProgress} disabled={isPending} style={{ background: 'var(--gold)', color: '#131110', border: 'none', borderRadius: '7px', padding: '7px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
              {isPending ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setEditingProgress(false)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: '7px', padding: '7px 12px', fontSize: '13px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={{ height: '3px', background: 'var(--bg-4)', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
          <div style={{ height: '100%', borderRadius: '4px', background: gradient, width: `${goal.progress_pct}%`, transition: 'width 1.4s cubic-bezier(0.22,1,0.36,1)' }} />
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
    </div>
  )
}

/* ─── MODAL ────────────────────────────────── */
function GoalModal({ mode, goal, onClose, onSaved }: {
  mode: 'add' | 'edit'
  goal?: Goal
  onClose: () => void
  onSaved: (g: Goal) => void
}) {
  const [form, setForm] = useState<GoalFormData>(
    goal
      ? { title: goal.title, category: goal.category, timeframe: goal.timeframe, progress_pct: goal.progress_pct, next_action: goal.next_action || '', target_date: goal.target_date, status: goal.status }
      : EMPTY_FORM
  )
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const set = (k: keyof GoalFormData, v: string | number | null) =>
    setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = () => {
    if (!form.title.trim()) { setError('Title is required.'); return }
    setError('')
    startTransition(async () => {
      try {
        if (mode === 'add') {
          await createGoalAction(form)
          onSaved({ id: crypto.randomUUID(), user_id: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...form, title: form.title.trim(), next_action: form.next_action.trim() } as unknown as Goal)
        } else if (goal) {
          await updateGoalAction(goal.id, form)
          onSaved({ ...goal, ...form, title: form.title.trim(), next_action: form.next_action.trim() } as unknown as Goal)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  // Close on backdrop click
  const onBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      onClick={onBackdrop}
      className="modal-overlay"
      style={{ backdropFilter: 'blur(4px)', animation: 'fadeUp 0.15s var(--ease) both' }}
    >
      <div className="modal-box" style={{ padding: '32px', boxShadow: '0 8px 60px rgba(0,0,0,0.5)' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 400, color: 'var(--text-0)' }}>
            {mode === 'add' ? 'New goal' : 'Edit goal'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '22px', cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Title */}
          <div>
            <label style={labelStyle}>Title</label>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="What are you working towards?"
              autoFocus
              style={inputStyle}
            />
          </div>

          {/* Category + Timeframe */}
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

          {/* Progress */}
          <div>
            <label style={labelStyle}>Progress — {form.progress_pct}%</label>
            <input
              type="range" min={0} max={100} value={form.progress_pct}
              onChange={e => set('progress_pct', Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--gold)', cursor: 'pointer' }}
            />
            <div style={{ height: '3px', background: 'var(--bg-4)', borderRadius: '4px', overflow: 'hidden', marginTop: '6px' }}>
              <div style={{ height: '100%', borderRadius: '4px', background: CATEGORY_COLORS[form.category] ?? CATEGORY_COLORS.other, width: `${form.progress_pct}%`, transition: 'width 0.2s' }} />
            </div>
          </div>

          {/* Next action */}
          <div>
            <label style={labelStyle}>Next action <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <input
              value={form.next_action}
              onChange={e => set('next_action', e.target.value)}
              placeholder="e.g. Write first draft"
              style={inputStyle}
            />
          </div>

          {/* Target date + Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Target date <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
              <input
                type="date"
                value={form.target_date ?? ''}
                onChange={e => set('target_date', e.target.value || null)}
                style={{ ...inputStyle, colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {error && (
            <div style={{ fontSize: '13px', color: '#e07060', background: 'rgba(200,80,60,0.08)', padding: '10px 14px', borderRadius: '8px' }}>{error}</div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
            <button onClick={onClose} style={{ flex: 1, background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: '9px', padding: '12px', fontSize: '14px', cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              style={{ flex: 2, background: 'var(--gold)', color: '#131110', border: 'none', borderRadius: '9px', padding: '12px', fontSize: '14px', fontWeight: 700, cursor: isPending ? 'wait' : 'pointer', opacity: isPending ? 0.7 : 1 }}
            >
              {isPending ? 'Saving…' : mode === 'add' ? 'Add goal' : 'Save changes'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

/* ─── SMALL HELPERS ───────────────────────── */
function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title?: string; danger?: boolean }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ background: hov ? (danger ? 'rgba(192,57,43,0.15)' : 'var(--bg-3)') : 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '7px', padding: '5px 7px', cursor: 'pointer', color: danger ? '#e07060' : 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
    >
      {children}
    </button>
  )
}

function PencilIcon() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z"/></svg>
}
function TrashIcon() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5h10M6 5V3h4v2M5 5l.5 8h5l.5-8"/></svg>
}
