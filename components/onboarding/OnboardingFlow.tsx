'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding, type GoalInput, type HabitInput } from '@/app/actions/onboarding'

type GoalDraft = GoalInput & { id: string }
type HabitDraft = HabitInput & { id: string }

const GOAL_CATEGORIES = [
  { value: 'product',   label: 'Product / Work' },
  { value: 'health',    label: 'Health' },
  { value: 'learning',  label: 'Learning' },
  { value: 'financial', label: 'Financial' },
  { value: 'wellbeing', label: 'Wellbeing' },
  { value: 'other',     label: 'Other' },
]
const TIMEFRAMES = [
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year',    label: 'This Year' },
  { value: 'ongoing', label: 'Ongoing' },
]
const FREQUENCIES = [
  { value: 'daily',    label: 'Daily' },
  { value: '3x_week',  label: '3× per week' },
  { value: 'weekdays', label: 'Weekdays' },
]

const HABIT_SUGGESTIONS: HabitDraft[] = [
  { id: 's1', emoji: '🏃', name: 'Morning run',       frequency: 'daily' },
  { id: 's2', emoji: '📚', name: 'Read 30 min',       frequency: 'daily' },
  { id: 's3', emoji: '🧘', name: 'Meditate',          frequency: 'daily' },
  { id: 's4', emoji: '💪', name: 'Workout',           frequency: '3x_week' },
  { id: 's5', emoji: '✍️', name: 'Journal',           frequency: 'daily' },
  { id: 's6', emoji: '💧', name: 'Drink 2L water',    frequency: 'daily' },
]

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--bg-3)', border: '1px solid var(--border)',
  borderRadius: '8px', padding: '10px 13px', fontSize: '14px',
  color: 'var(--text-0)', outline: 'none', boxSizing: 'border-box',
}
const selectStyle: React.CSSProperties = {
  ...inputStyle, cursor: 'pointer', appearance: 'none',
}
const labelStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 600, color: 'var(--text-2)',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', display: 'block',
}

const STEPS = ['Welcome', 'Goals', 'Habits', 'Done']

export default function OnboardingFlow({ userName, isRedo }: { userName: string; isRedo: boolean }) {
  const [step, setStep] = useState(isRedo ? 2 : 1)
  const [goals, setGoals] = useState<GoalDraft[]>([])
  const [habits, setHabits] = useState<HabitDraft[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Goal form
  const [gTitle, setGTitle] = useState('')
  const [gCategory, setGCategory] = useState('product')
  const [gTimeframe, setGTimeframe] = useState('quarter')
  const [gNextAction, setGNextAction] = useState('')
  const [gError, setGError] = useState('')

  // Habit form
  const [hEmoji, setHEmoji] = useState('✨')
  const [hName, setHName] = useState('')
  const [hFreq, setHFreq] = useState('daily')
  const [hError, setHError] = useState('')

  const addGoal = () => {
    if (!gTitle.trim()) { setGError('Give your goal a title.'); return }
    setGError('')
    setGoals(g => [...g, { id: crypto.randomUUID(), title: gTitle.trim(), category: gCategory, timeframe: gTimeframe, next_action: gNextAction.trim() }])
    setGTitle(''); setGNextAction('')
  }

  const addHabit = () => {
    if (!hName.trim()) { setHError('Give your habit a name.'); return }
    setHError('')
    setHabits(h => [...h, { id: crypto.randomUUID(), emoji: hEmoji, name: hName.trim(), frequency: hFreq }])
    setHName(''); setHEmoji('✨')
  }

  const addSuggestedHabit = (s: HabitDraft) => {
    if (habits.find(h => h.name === s.name)) return
    setHabits(h => [...h, { ...s, id: crypto.randomUUID() }])
  }

  const handleFinish = () => {
    setError(null)
    startTransition(async () => {
      try {
        await completeOnboarding(goals, habits, Intl.DateTimeFormat().resolvedOptions().timeZone)
        router.push('/brief')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  const progressPct = ((step - 1) / (STEPS.length - 1)) * 100

  return (
    <div style={{ width: '100%', maxWidth: '560px', animation: 'fadeUp 0.4s var(--ease) both' }}>

      {/* Progress */}
      {step > 1 && step < 4 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            {STEPS.slice(1, 4).map((s, i) => (
              <span key={s} style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: step === i + 2 ? 'var(--gold)' : 'var(--text-3)' }}>{s}</span>
            ))}
          </div>
          <div style={{ height: '2px', background: 'var(--bg-3)', borderRadius: '2px' }}>
            <div style={{ height: '100%', background: 'var(--gold)', borderRadius: '2px', width: `${((step - 1) / 3) * 100}%`, transition: 'width 0.4s var(--ease)' }} />
          </div>
        </div>
      )}

      {/* Card */}
      <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-xl)', padding: '40px', boxShadow: '0 4px 40px rgba(0,0,0,0.3)' }}>

        {/* ── STEP 1: WELCOME ── */}
        {step === 1 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg, var(--gold) 0%, #a07830 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 4px 20px rgba(212,168,83,0.3)' }}>
              <svg width="26" height="26" viewBox="0 0 16 16" fill="#131110"><circle cx="8" cy="8" r="3"/><circle cx="8" cy="2" r="1.2"/><circle cx="8" cy="14" r="1.2"/><circle cx="2" cy="8" r="1.2"/><circle cx="14" cy="8" r="1.2"/></svg>
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', fontWeight: 400, color: 'var(--text-0)', lineHeight: 1.2, marginBottom: '12px' }}>
              Welcome to Locus,<br /><em style={{ fontStyle: 'italic', color: 'var(--text-1)' }}>{userName}.</em>
            </div>
            <div style={{ fontSize: '15px', color: 'var(--text-2)', lineHeight: 1.7, marginBottom: '32px', maxWidth: '380px', margin: '0 auto 32px' }}>
              Your personal life OS. In two quick steps, we'll set up your goals and habits so Locus can generate a daily brief that actually means something.
            </div>
            <button onClick={() => setStep(2)} style={{ background: 'var(--gold)', color: '#131110', border: 'none', borderRadius: '10px', padding: '13px 32px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.01em' }}>
              Let's build your OS →
            </button>
          </div>
        )}

        {/* ── STEP 2: GOALS ── */}
        {step === 2 && (
          <div>
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 400, color: 'var(--text-0)', marginBottom: '6px' }}>What are you working towards?</div>
              <div style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.6 }}>Add 1–5 goals. These shape your daily brief and weekly reviews.</div>
            </div>

            {/* Added goals */}
            {goals.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                {goals.map((g, i) => (
                  <div key={g.id} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: 'var(--gold-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--gold)', flexShrink: 0, marginTop: '1px' }}>{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-0)', marginBottom: '2px' }}>{g.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{GOAL_CATEGORIES.find(c => c.value === g.category)?.label} · {TIMEFRAMES.find(t => t.value === g.timeframe)?.label}</div>
                      {g.next_action && <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px', fontStyle: 'italic' }}>→ {g.next_action}</div>}
                    </div>
                    <button onClick={() => setGoals(gs => gs.filter(x => x.id !== g.id))} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '18px', cursor: 'pointer', lineHeight: 1, flexShrink: 0, padding: '0 2px' }}>×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Goal form */}
            {goals.length < 5 && (
              <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', marginBottom: '8px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={labelStyle}>Goal title</label>
                  <input
                    value={gTitle} onChange={e => setGTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addGoal()}
                    placeholder="e.g. Launch my product by Q2"
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={labelStyle}>Category</label>
                    <select value={gCategory} onChange={e => setGCategory(e.target.value)} style={selectStyle}>
                      {GOAL_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Timeframe</label>
                    <select value={gTimeframe} onChange={e => setGTimeframe(e.target.value)} style={selectStyle}>
                      {TIMEFRAMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={labelStyle}>Next action <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                  <input
                    value={gNextAction} onChange={e => setGNextAction(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addGoal()}
                    placeholder="e.g. Write landing page copy"
                    style={inputStyle}
                  />
                </div>
                {gError && <div style={{ fontSize: '12px', color: '#e07060', marginBottom: '10px' }}>{gError}</div>}
                <button onClick={addGoal} style={{ background: 'var(--bg-4)', border: '1px solid var(--border-md)', color: 'var(--text-0)', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', width: '100%' }}>
                  + Add goal
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              {!isRedo && <button onClick={() => setStep(1)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: '8px', padding: '11px 20px', fontSize: '14px', cursor: 'pointer' }}>← Back</button>}
              <button
                onClick={() => setStep(3)}
                disabled={goals.length === 0}
                style={{ flex: 1, background: goals.length > 0 ? 'var(--gold)' : 'var(--bg-3)', color: goals.length > 0 ? '#131110' : 'var(--text-3)', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 700, cursor: goals.length > 0 ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
              >
                Continue → <span style={{ opacity: 0.7, fontWeight: 400 }}>({goals.length} goal{goals.length !== 1 ? 's' : ''})</span>
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: HABITS ── */}
        {step === 3 && (
          <div>
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 400, color: 'var(--text-0)', marginBottom: '6px' }}>What habits will move you forward?</div>
              <div style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.6 }}>Add 1–5 habits to track daily. Locus will include them in your brief.</div>
            </div>

            {/* Quick-add suggestions */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Quick add</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                {HABIT_SUGGESTIONS.map(s => {
                  const added = habits.some(h => h.name === s.name)
                  return (
                    <button
                      key={s.id}
                      onClick={() => addSuggestedHabit(s)}
                      disabled={added}
                      style={{ background: added ? 'var(--bg-3)' : 'var(--bg-2)', border: `1px solid ${added ? 'var(--sage)' : 'var(--border)'}`, borderRadius: '20px', padding: '5px 12px', fontSize: '13px', color: added ? 'var(--sage)' : 'var(--text-1)', cursor: added ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.15s' }}
                    >
                      {s.emoji} {s.name} {added && '✓'}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Added habits */}
            {habits.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '16px' }}>
                {habits.map(h => (
                  <div key={h.id} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px', flexShrink: 0 }}>{h.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-0)' }}>{h.name}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-3)', marginLeft: '8px' }}>{FREQUENCIES.find(f => f.value === h.frequency)?.label}</span>
                    </div>
                    <button onClick={() => setHabits(hs => hs.filter(x => x.id !== h.id))} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '18px', cursor: 'pointer', lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Habit form */}
            {habits.length < 5 && (
              <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', marginBottom: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={labelStyle}>Emoji</label>
                    <input value={hEmoji} onChange={e => setHEmoji(e.target.value)} maxLength={4} style={{ ...inputStyle, textAlign: 'center', fontSize: '18px', padding: '8px 6px' }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Habit name</label>
                    <input
                      value={hName} onChange={e => setHName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addHabit()}
                      placeholder="e.g. Morning walk"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Frequency</label>
                    <select value={hFreq} onChange={e => setHFreq(e.target.value)} style={selectStyle}>
                      {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                </div>
                {hError && <div style={{ fontSize: '12px', color: '#e07060', marginBottom: '10px' }}>{hError}</div>}
                <button onClick={addHabit} style={{ background: 'var(--bg-4)', border: '1px solid var(--border-md)', color: 'var(--text-0)', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', width: '100%' }}>
                  + Add habit
                </button>
              </div>
            )}

            {error && <div style={{ fontSize: '13px', color: '#e07060', marginTop: '10px', background: 'rgba(200,80,60,0.08)', padding: '10px 14px', borderRadius: '8px' }}>{error}</div>}

            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => setStep(2)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: '8px', padding: '11px 20px', fontSize: '14px', cursor: 'pointer' }}>← Back</button>
              <button
                onClick={handleFinish}
                disabled={habits.length === 0 || isPending}
                style={{ flex: 1, background: habits.length > 0 ? 'var(--gold)' : 'var(--bg-3)', color: habits.length > 0 ? '#131110' : 'var(--text-3)', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 700, cursor: habits.length > 0 && !isPending ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
              >
                {isPending ? 'Saving...' : `Finish setup → (${habits.length} habit${habits.length !== 1 ? 's' : ''})`}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Skip link for redo */}
      {(isRedo || step > 1) && (
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <a href="/brief" style={{ fontSize: '13px', color: 'var(--text-3)', textDecoration: 'none' }}>
            {isRedo ? '← Back to brief' : 'Skip for now'}
          </a>
        </div>
      )}
    </div>
  )
}
