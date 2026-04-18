'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding, type GoalInput, type HabitInput, type ProfileInput } from '@/app/actions/onboarding'

type GoalDraft  = GoalInput  & { id: string }
type HabitDraft = HabitInput & { id: string }  // HabitInput now has days_of_week: number[]

/* ── CONSTANTS ── */
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
// Simple frequency presets for onboarding — maps to days_of_week
const FREQ_PRESETS = [
  { label: 'Daily',      days: [] as number[] },
  { label: '3× / week', days: [1, 3, 5] },
  { label: 'Weekdays',  days: [1, 2, 3, 4, 5] },
]
const HABIT_SUGGESTIONS: HabitDraft[] = [
  { id: 's1', emoji: '🏃', name: 'Morning run',    days_of_week: [] },
  { id: 's2', emoji: '📚', name: 'Read 30 min',    days_of_week: [] },
  { id: 's3', emoji: '🧘', name: 'Meditate',       days_of_week: [] },
  { id: 's4', emoji: '💪', name: 'Workout',        days_of_week: [1, 3, 5] },
  { id: 's5', emoji: '✍️', name: 'Journal',        days_of_week: [] },
  { id: 's6', emoji: '💧', name: 'Drink 2L water', days_of_week: [] },
]

const REL_OPTIONS = [
  { value: 'single',          label: 'Single' },
  { value: 'in_relationship', label: 'In a relationship' },
  { value: 'married',         label: 'Married' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const

const WORK_OPTIONS = [
  { value: 'remote',  label: '🏠 Remote' },
  { value: 'office',  label: '🏢 Office' },
  { value: 'hybrid',  label: '🔀 Hybrid' },
  { value: 'other',   label: 'Other' },
] as const

const PERSONALITY_TAGS = [
  'Introvert', 'Extrovert',
  'Morning person', 'Night owl',
  'Creative', 'Analytical',
  'Detail-oriented', 'Big-picture thinker',
  'High-energy', 'Calm & steady',
]

/* ── STYLES ── */
const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--bg-3)', border: '1px solid var(--border)',
  borderRadius: '8px', padding: '10px 13px', fontSize: '14px',
  color: 'var(--text-0)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer', appearance: 'none' }
const labelStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 600, color: 'var(--text-2)',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', display: 'block',
}

// step 1=Welcome 2=AboutYou 3=Goals 4=Habits 5=CheckIn
const STEP_LABELS = ['About You', 'Goals', 'Habits', 'Check-in']

export default function OnboardingFlow({ userName, isRedo }: { userName: string; isRedo: boolean }) {
  const [step, setStep]   = useState(isRedo ? 3 : 1)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  /* ── PROFILE STATE ── */
  const [occupation, setOccupation]     = useState('')
  const [relStatus, setRelStatus]       = useState<ProfileInput['relationship_status']>('')
  const [hasKids, setHasKids]           = useState<boolean | null>(null)
  const [workArrangement, setWorkArrangement] = useState<ProfileInput['work_arrangement']>('')
  const [personality, setPersonality]   = useState<string[]>([])
  const [lifeContext, setLifeContext]   = useState('')

  /* ── GOALS STATE ── */
  const [goals, setGoals]       = useState<GoalDraft[]>([])
  const [gTitle, setGTitle]     = useState('')
  const [gCategory, setGCategory] = useState('product')
  const [gTimeframe, setGTimeframe] = useState('quarter')
  const [gError, setGError]     = useState('')

  /* ── HABITS STATE ── */
  const [habits, setHabits]   = useState<HabitDraft[]>([])
  const [hEmoji, setHEmoji]   = useState('✨')
  const [hName,  setHName]  = useState('')
  const [hDays,  setHDays]  = useState<number[]>([])  // empty = daily
  const [hError, setHError] = useState('')

  /* ── CHECK-IN STATE ── */
  const [energy, setEnergy]   = useState(7)
  const [moodNote, setMoodNote] = useState('')

  /* ── HELPERS ── */
  const addGoal = () => {
    if (!gTitle.trim()) { setGError('Give your goal a title.'); return }
    setGError('')
    setGoals(g => [...g, { id: crypto.randomUUID(), title: gTitle.trim(), category: gCategory, timeframe: gTimeframe }])
    setGTitle('')
  }
  const addHabit = () => {
    if (!hName.trim()) { setHError('Give your habit a name.'); return }
    setHError('')
    setHabits(h => [...h, { id: crypto.randomUUID(), emoji: hEmoji, name: hName.trim(), days_of_week: hDays }])
    setHName(''); setHEmoji('✨'); setHDays([])
  }
  const togglePersonality = (tag: string) => {
    setPersonality(p => p.includes(tag) ? p.filter(t => t !== tag) : p.length < 4 ? [...p, tag] : p)
  }

  const handleFinish = () => {
    setError(null)
    const profile: ProfileInput = {
      occupation, relationship_status: relStatus, has_kids: hasKids,
      work_arrangement: workArrangement, personality, life_context: lifeContext,
    }
    startTransition(async () => {
      try {
        await completeOnboarding(
          goals, habits, profile,
          { energy_level: energy, mood_note: moodNote.trim() || null },
          Intl.DateTimeFormat().resolvedOptions().timeZone
        )
        router.push('/brief')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  const energyLabel = energy >= 9 ? 'Exceptional' : energy >= 7 ? 'High' : energy >= 5 ? 'Moderate' : energy >= 3 ? 'Low' : 'Depleted'
  const energyColor = energy >= 7 ? 'var(--sage)' : energy >= 5 ? 'var(--gold)' : '#c08060'

  return (
    <div style={{ width: '100%', maxWidth: '580px', animation: 'fadeUp 0.4s var(--ease) both' }}>

      {/* Progress bar — visible on steps 2–5 */}
      {step >= 2 && step <= 5 && (
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            {STEP_LABELS.map((s, i) => {
              const stepNum = i + 2
              return (
                <span key={s} style={{
                  fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: step === stepNum ? 'var(--gold)' : step > stepNum ? 'var(--text-3)' : 'var(--bg-4)',
                  transition: 'color 0.3s',
                }}>{s}</span>
              )
            })}
          </div>
          <div style={{ height: '2px', background: 'var(--bg-3)', borderRadius: '2px' }}>
            <div style={{
              height: '100%', background: 'var(--gold)', borderRadius: '2px',
              width: `${((step - 2) / 3) * 100}%`, transition: 'width 0.4s var(--ease)',
            }} />
          </div>
        </div>
      )}

      {/* Card */}
      <div style={{
        background: 'var(--bg-1)', border: '1px solid var(--border-md)',
        borderRadius: 'var(--radius-xl)', padding: '40px',
        boxShadow: '0 4px 40px rgba(0,0,0,0.3)',
      }}>

        {/* ── STEP 1: WELCOME ── */}
        {step === 1 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: 'linear-gradient(135deg, var(--gold) 0%, #a07830 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
              boxShadow: '0 4px 20px rgba(212,168,83,0.3)',
            }}>
              <svg width="28" height="28" viewBox="0 0 100 100" fill="#131110">
                <circle cx="50" cy="50" r="10"/><circle cx="50" cy="21" r="5.5"/><circle cx="50" cy="79" r="5.5"/><circle cx="21" cy="50" r="5.5"/><circle cx="79" cy="50" r="5.5"/>
              </svg>
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', fontWeight: 400, color: 'var(--text-0)', lineHeight: 1.2, marginBottom: '16px' }}>
              Welcome to Locus,<br /><em style={{ fontStyle: 'italic', color: 'var(--text-1)' }}>{userName}.</em>
            </div>
            <div style={{ fontSize: '15px', color: 'var(--text-2)', lineHeight: 1.7, marginBottom: '12px', maxWidth: '400px', margin: '0 auto 12px' }}>
              Your personal AI life OS — daily briefs, habit tracking, goal momentum, and an AI that genuinely learns who you are.
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '32px' }}>
              Four quick steps to get you set up. Takes about 2 minutes.
            </div>
            <button
              onClick={() => setStep(2)}
              style={{ background: 'var(--gold)', color: '#131110', border: 'none', borderRadius: '10px', padding: '13px 32px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}
            >
              Let&apos;s get started →
            </button>
          </div>
        )}

        {/* ── STEP 2: ABOUT YOU ── */}
        {step === 2 && (
          <div>
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 400, color: 'var(--text-0)', marginBottom: '6px' }}>
                Tell Locus about yourself
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.6 }}>
                This helps the AI understand your context — not just your data. All fields are optional.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Occupation */}
              <div>
                <label style={labelStyle}>What do you do?</label>
                <input
                  value={occupation}
                  onChange={e => setOccupation(e.target.value)}
                  placeholder="e.g. Software engineer, Founder, Designer, Student…"
                  style={inputStyle}
                />
              </div>

              {/* Relationship status */}
              <div>
                <label style={labelStyle}>Relationship status</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                  {REL_OPTIONS.map(o => (
                    <button key={o.value} onClick={() => setRelStatus(relStatus === o.value ? '' : o.value)}
                      style={{ padding: '7px 14px', background: relStatus === o.value ? 'var(--gold-dim)' : 'var(--bg-2)', border: `1px solid ${relStatus === o.value ? 'rgba(212,168,83,0.4)' : 'var(--border)'}`, borderRadius: '20px', fontSize: '13px', color: relStatus === o.value ? 'var(--gold)' : 'var(--text-1)', cursor: 'pointer', transition: 'all 0.15s' }}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kids */}
              <div>
                <label style={labelStyle}>Do you have kids?</label>
                <div style={{ display: 'flex', gap: '7px' }}>
                  {[{ val: false, label: 'No' }, { val: true, label: 'Yes' }, { val: null, label: 'Prefer not to say' }].map(o => (
                    <button key={String(o.val)} onClick={() => setHasKids(hasKids === o.val ? null : o.val)}
                      style={{ padding: '7px 14px', background: hasKids === o.val && o.val !== null ? 'var(--gold-dim)' : 'var(--bg-2)', border: `1px solid ${hasKids === o.val && o.val !== null ? 'rgba(212,168,83,0.4)' : 'var(--border)'}`, borderRadius: '20px', fontSize: '13px', color: hasKids === o.val && o.val !== null ? 'var(--gold)' : 'var(--text-1)', cursor: 'pointer', transition: 'all 0.15s' }}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Work arrangement */}
              <div>
                <label style={labelStyle}>How do you work?</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                  {WORK_OPTIONS.map(o => (
                    <button key={o.value} onClick={() => setWorkArrangement(workArrangement === o.value ? '' : o.value)}
                      style={{ padding: '7px 14px', background: workArrangement === o.value ? 'var(--gold-dim)' : 'var(--bg-2)', border: `1px solid ${workArrangement === o.value ? 'rgba(212,168,83,0.4)' : 'var(--border)'}`, borderRadius: '20px', fontSize: '13px', color: workArrangement === o.value ? 'var(--gold)' : 'var(--text-1)', cursor: 'pointer', transition: 'all 0.15s' }}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Personality tags */}
              <div>
                <label style={labelStyle}>How would you describe yourself? <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(pick up to 4)</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                  {PERSONALITY_TAGS.map(tag => {
                    const selected = personality.includes(tag)
                    const maxed    = !selected && personality.length >= 4
                    return (
                      <button key={tag} onClick={() => togglePersonality(tag)} disabled={maxed}
                        style={{ padding: '7px 14px', background: selected ? 'var(--gold-dim)' : 'var(--bg-2)', border: `1px solid ${selected ? 'rgba(212,168,83,0.4)' : 'var(--border)'}`, borderRadius: '20px', fontSize: '13px', color: selected ? 'var(--gold)' : maxed ? 'var(--text-3)' : 'var(--text-1)', cursor: maxed ? 'default' : 'pointer', opacity: maxed ? 0.5 : 1, transition: 'all 0.15s' }}>
                        {selected ? '✓ ' : ''}{tag}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Life context */}
              <div>
                <label style={labelStyle}>What&apos;s your life like right now? <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                <textarea
                  value={lifeContext}
                  onChange={e => setLifeContext(e.target.value)}
                  rows={3}
                  placeholder="e.g. Building a startup while raising two kids. Trying to get more consistent with my health routines…"
                  style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
                />
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>
                  This is your context in your own words — the AI uses it to make your briefs feel personal.
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '28px' }}>
              {!isRedo && <button onClick={() => setStep(1)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: '8px', padding: '11px 20px', fontSize: '14px', cursor: 'pointer' }}>← Back</button>}
              <button onClick={() => setStep(3)} style={{ flex: 1, background: 'var(--gold)', color: '#131110', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: GOALS ── */}
        {step === 3 && (
          <div>
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 400, color: 'var(--text-0)', marginBottom: '6px' }}>What are you working towards?</div>
              <div style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.6 }}>Add 1–5 goals. These shape your daily brief and weekly reviews.</div>
            </div>

            {goals.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                {goals.map((g, i) => (
                  <div key={g.id} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: 'var(--gold-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--gold)', flexShrink: 0, marginTop: '1px' }}>{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-0)', marginBottom: '2px' }}>{g.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{GOAL_CATEGORIES.find(c => c.value === g.category)?.label} · {TIMEFRAMES.find(t => t.value === g.timeframe)?.label}</div>
                    </div>
                    <button onClick={() => setGoals(gs => gs.filter(x => x.id !== g.id))} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '18px', cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>×</button>
                  </div>
                ))}
              </div>
            )}

            {goals.length < 5 && (
              <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', marginBottom: '8px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={labelStyle}>Goal title</label>
                  <input value={gTitle} onChange={e => setGTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addGoal()} placeholder="e.g. Launch my product by Q2" style={inputStyle} />
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
                {gError &&<div style={{ fontSize: '12px', color: '#e07060', marginBottom: '10px' }}>{gError}</div>}
                <button onClick={addGoal} style={{ background: 'var(--bg-4)', border: '1px solid var(--border-md)', color: 'var(--text-0)', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', width: '100%' }}>
                  + Add goal
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => setStep(2)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: '8px', padding: '11px 20px', fontSize: '14px', cursor: 'pointer' }}>← Back</button>
              <button onClick={() => setStep(4)} disabled={goals.length === 0}
                style={{ flex: 1, background: goals.length > 0 ? 'var(--gold)' : 'var(--bg-3)', color: goals.length > 0 ? '#131110' : 'var(--text-3)', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 700, cursor: goals.length > 0 ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
                Continue → <span style={{ opacity: 0.7, fontWeight: 400 }}>({goals.length} goal{goals.length !== 1 ? 's' : ''})</span>
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: HABITS ── */}
        {step === 4 && (
          <div>
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 400, color: 'var(--text-0)', marginBottom: '6px' }}>What habits will move you forward?</div>
              <div style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.6 }}>Add 1–5 habits to track daily. Locus will monitor your streaks and include them in your brief.</div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Quick add</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                {HABIT_SUGGESTIONS.map(s => {
                  const added = habits.some(h => h.name === s.name)
                  return (
                    <button key={s.id} onClick={() => { if (!added) setHabits(h => [...h, { ...s, id: crypto.randomUUID() }]) }} disabled={added}
                      style={{ background: added ? 'var(--bg-3)' : 'var(--bg-2)', border: `1px solid ${added ? 'var(--sage)' : 'var(--border)'}`, borderRadius: '20px', padding: '5px 12px', fontSize: '13px', color: added ? 'var(--sage)' : 'var(--text-1)', cursor: added ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.15s' }}>
                      {s.emoji} {s.name} {added && '✓'}
                    </button>
                  )
                })}
              </div>
            </div>

            {habits.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '16px' }}>
                {habits.map(h => (
                  <div key={h.id} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px', flexShrink: 0 }}>{h.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-0)' }}>{h.name}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-3)', marginLeft: '8px' }}>
                        {FREQ_PRESETS.find(p => JSON.stringify([...p.days].sort()) === JSON.stringify([...h.days_of_week].sort()))?.label ?? 'Custom'}
                      </span>
                    </div>
                    <button onClick={() => setHabits(hs => hs.filter(x => x.id !== h.id))} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '18px', cursor: 'pointer', lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            )}

            {habits.length < 5 && (
              <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', marginBottom: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={labelStyle}>Emoji</label>
                    <input value={hEmoji} onChange={e => setHEmoji(e.target.value)} maxLength={4} style={{ ...inputStyle, textAlign: 'center', fontSize: '18px', padding: '8px 6px' }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Habit name</label>
                    <input value={hName} onChange={e => setHName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addHabit()} placeholder="e.g. Morning walk" style={inputStyle} />
                  </div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={labelStyle}>Frequency</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {FREQ_PRESETS.map(p => {
                      const active = JSON.stringify([...p.days].sort()) === JSON.stringify([...hDays].sort())
                      return (
                        <button key={p.label} onClick={() => setHDays(p.days)}
                          style={{ flex: 1, padding: '7px 6px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: `1px solid ${active ? 'rgba(212,168,83,0.4)' : 'var(--border)'}`, background: active ? 'var(--gold-dim)' : 'var(--bg-3)', color: active ? 'var(--gold)' : 'var(--text-2)', transition: 'all 0.15s' }}>
                          {p.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                {hError && <div style={{ fontSize: '12px', color: '#e07060', marginBottom: '10px' }}>{hError}</div>}
                <button onClick={addHabit} style={{ background: 'var(--bg-4)', border: '1px solid var(--border-md)', color: 'var(--text-0)', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', width: '100%' }}>
                  + Add habit
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => setStep(3)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: '8px', padding: '11px 20px', fontSize: '14px', cursor: 'pointer' }}>← Back</button>
              <button onClick={() => setStep(5)} disabled={habits.length === 0}
                style={{ flex: 1, background: habits.length > 0 ? 'var(--gold)' : 'var(--bg-3)', color: habits.length > 0 ? '#131110' : 'var(--text-3)', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 700, cursor: habits.length > 0 ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
                Continue → <span style={{ opacity: 0.7, fontWeight: 400 }}>({habits.length} habit{habits.length !== 1 ? 's' : ''})</span>
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 5: FIRST CHECK-IN ── */}
        {step === 5 && (
          <div>
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 400, color: 'var(--text-0)', marginBottom: '6px' }}>
                One last thing — how are you showing up today?
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.6 }}>
                Your first check-in. This lets Locus generate your very first daily brief right after setup.
              </div>
            </div>

            {/* Energy slider */}
            <div style={{ marginBottom: '28px' }}>
              <label style={labelStyle}>Energy level right now</label>
              <input
                type="range" min="1" max="10" value={energy}
                onChange={e => setEnergy(Number(e.target.value))}
                style={{ width: '100%', appearance: 'none', height: '4px', borderRadius: '4px', background: `linear-gradient(to right, var(--gold) ${(energy-1)/9*100}%, var(--bg-4) ${(energy-1)/9*100}%)`, outline: 'none', cursor: 'pointer', marginBottom: '14px' }}
              />
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: '52px', fontWeight: 300, color: 'var(--text-0)', lineHeight: 1 }}>{energy}</span>
                <span style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: energyColor, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{energyLabel}</span>
              </div>
            </div>

            {/* Mood note */}
            <div style={{ marginBottom: '8px' }}>
              <label style={labelStyle}>What&apos;s on your mind? <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
              <textarea
                value={moodNote}
                onChange={e => setMoodNote(e.target.value)}
                rows={3}
                placeholder="e.g. Excited to finally start this. A bit overwhelmed but ready to focus…"
                style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
              />
            </div>

            {error && (
              <div style={{ fontSize: '13px', color: '#e07060', background: 'rgba(200,80,60,0.08)', padding: '10px 14px', borderRadius: '8px', marginTop: '12px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => setStep(4)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: '8px', padding: '11px 20px', fontSize: '14px', cursor: 'pointer' }}>← Back</button>
              <button
                onClick={handleFinish}
                disabled={isPending}
                style={{ flex: 1, background: 'var(--gold)', color: '#131110', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 700, cursor: isPending ? 'wait' : 'pointer', opacity: isPending ? 0.7 : 1, transition: 'all 0.2s' }}
              >
                {isPending ? 'Setting up your OS…' : 'Launch my Locus →'}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Skip / back link */}
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
