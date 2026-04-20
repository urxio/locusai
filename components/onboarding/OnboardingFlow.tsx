'use client'

import { useState, useEffect, useRef, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding, type GoalInput, type HabitInput, type ProfileInput } from '@/app/actions/onboarding'

type Message = { role: 'user' | 'assistant'; content: string }

type OnboardingData = {
  profile: ProfileInput
  goals: GoalInput[]
  habits: HabitInput[]
  checkin: { energy_level: number; mood_note: string | null }
}

type GoalDraft  = GoalInput  & { id: string }
type HabitDraft = HabitInput & { id: string }

type Phase = 'chat' | 'review'

const ONBOARDING_DATA_RE = /<onboarding_data>\s*([\s\S]*?)\s*<\/onboarding_data>/

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
const FREQ_PRESETS = [
  { label: 'Daily',     days: [] as number[] },
  { label: '3× / week', days: [1, 3, 5] },
  { label: 'Weekdays',  days: [1, 2, 3, 4, 5] },
]

/* ── Shared styles ── */
const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--bg-2)', border: '1px solid var(--border)',
  borderRadius: '8px', padding: '9px 12px', fontSize: '13.5px',
  color: 'var(--text-0)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}
const labelStyle: React.CSSProperties = {
  fontSize: '10px', fontWeight: 700, color: 'var(--text-3)',
  textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '5px', display: 'block',
}
const chipBtn = (active: boolean): React.CSSProperties => ({
  padding: '5px 11px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
  cursor: 'pointer', border: `1px solid ${active ? 'rgba(212,168,83,0.4)' : 'var(--border)'}`,
  background: active ? 'var(--gold-dim)' : 'var(--bg-3)',
  color: active ? 'var(--gold)' : 'var(--text-2)',
  transition: 'all 0.15s',
})

/* ── Locus avatar icon ── */
const LocusIcon = () => (
  <div style={{
    width: '32px', height: '32px', borderRadius: '9px', flexShrink: 0,
    background: 'linear-gradient(135deg, var(--gold) 0%, #a07830 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 1px 10px rgba(212,168,83,0.25)', marginTop: '1px',
  }}>
    <svg width="14" height="14" viewBox="0 0 16 16" fill="#131110">
      <circle cx="8" cy="8" r="3"/>
      <circle cx="8" cy="2" r="1.2"/>
      <circle cx="8" cy="14" r="1.2"/>
      <circle cx="2" cy="8" r="1.2"/>
      <circle cx="14" cy="8" r="1.2"/>
    </svg>
  </div>
)

/* ═══════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                         */
/* ═══════════════════════════════════════════════════════ */
export default function OnboardingFlow({ userName, isRedo }: { userName: string; isRedo: boolean }) {
  /* ── Phase ── */
  const [phase, setPhase] = useState<Phase>('chat')

  /* ── Chat state ── */
  const [messages,  setMessages]  = useState<Message[]>([])
  const [input,     setInput]     = useState('')
  const [streaming, setStreaming] = useState(false)
  const [chatDone,  setChatDone]  = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  /* ── Review / edit state ── */
  const [profile,  setProfile]  = useState<ProfileInput | null>(null)
  const [checkin,  setCheckin]  = useState<{ energy_level: number; mood_note: string | null } | null>(null)
  const [goals,    setGoals]    = useState<GoalDraft[]>([])
  const [habits,   setHabits]   = useState<HabitDraft[]>([])
  const [addingGoal,  setAddingGoal]  = useState(false)
  const [addingHabit, setAddingHabit] = useState(false)
  const [gTitle,  setGTitle]   = useState('')
  const [gCat,    setGCat]     = useState('product')
  const [gTime,   setGTime]    = useState('quarter')
  const [hEmoji,  setHEmoji]   = useState('✨')
  const [hName,   setHName]    = useState('')
  const [hDays,   setHDays]    = useState<number[]>([])

  /* ── Save state ── */
  const [isPending, startTransition] = useTransition()
  const [saveError, setSaveError] = useState<string | null>(null)

  const router = useRouter()
  const messagesBoxRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLTextAreaElement>(null)
  const initFetched    = useRef(false)
  const dataRef        = useRef(false)

  /* ── Scroll messages to bottom ── */
  useEffect(() => {
    const box = messagesBoxRef.current
    if (box) box.scrollTop = box.scrollHeight
  }, [messages])

  /* ── Transition: chat → review ── */
  const enterReview = useCallback((data: OnboardingData) => {
    setProfile(data.profile)
    setCheckin(data.checkin)
    setGoals(data.goals.map(g => ({ ...g, id: crypto.randomUUID() })))
    setHabits(data.habits.map(h => ({ ...h, id: crypto.randomUUID() })))
    setChatDone(true)
    // Small delay so the final AI message renders before we switch
    setTimeout(() => setPhase('review'), 800)
  }, [])

  /* ── Stream a reply from /api/onboarding/chat ── */
  const fetchReply = useCallback(async (msgs: Message[]) => {
    setStreaming(true)
    setError(null)
    let fullText = ''

    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/onboarding/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: msgs, userName }),
      })
      if (!res.ok || !res.body) throw new Error('Request failed')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value, { stream: true })
        const display = fullText.replace(ONBOARDING_DATA_RE, '').trim()
        setMessages(prev => {
          const next = [...prev]
          next[next.length - 1] = { role: 'assistant', content: display }
          return next
        })
      }

      // Detect onboarding data and transition to review
      const dataMatch = fullText.match(ONBOARDING_DATA_RE)
      if (dataMatch && !dataRef.current) {
        dataRef.current = true
        try {
          const data: OnboardingData = JSON.parse(dataMatch[1])
          enterReview(data)
        } catch (parseErr) {
          console.error('[OnboardingFlow] parse error', parseErr)
          setError('Couldn\'t parse the data — please try again.')
        }
      }
    } catch (err) {
      console.error('[OnboardingFlow] fetch error', err)
      setError('Something went wrong — please try again.')
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setStreaming(false)
      if (!chatDone) inputRef.current?.focus()
    }
  }, [userName, enterReview, chatDone])

  /* ── Fetch opener on mount ── */
  useEffect(() => {
    if (initFetched.current) return
    initFetched.current = true
    fetchReply([])
  }, [fetchReply])

  /* ── Send message ── */
  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming || chatDone) return
    const next: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    await fetchReply(next)
  }, [input, messages, streaming, chatDone, fetchReply])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }

  const canSend = !!input.trim() && !streaming && !chatDone

  /* ── Review: add/remove goals & habits ── */
  const addGoal = () => {
    if (!gTitle.trim()) return
    setGoals(gs => [...gs, { id: crypto.randomUUID(), title: gTitle.trim(), category: gCat, timeframe: gTime }])
    setGTitle(''); setGCat('product'); setGTime('quarter')
    setAddingGoal(false)
  }
  const addHabit = () => {
    if (!hName.trim()) return
    setHabits(hs => [...hs, { id: crypto.randomUUID(), emoji: hEmoji, name: hName.trim(), days_of_week: hDays }])
    setHEmoji('✨'); setHName(''); setHDays([])
    setAddingHabit(false)
  }

  /* ── Final save ── */
  const handleLaunch = () => {
    if (!profile || !checkin) return
    setSaveError(null)
    startTransition(async () => {
      try {
        await completeOnboarding(
          goals.map(({ id: _id, ...g }) => g),
          habits.map(({ id: _id, ...h }) => h),
          profile,
          { energy_level: checkin.energy_level, mood_note: checkin.mood_note },
          Intl.DateTimeFormat().resolvedOptions().timeZone,
        )
        router.push('/brief')
        router.refresh()
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  const energyLabel =
    !checkin ? '' :
    checkin.energy_level >= 9 ? 'Exceptional' :
    checkin.energy_level >= 7 ? 'High' :
    checkin.energy_level >= 5 ? 'Moderate' :
    checkin.energy_level >= 3 ? 'Low' : 'Depleted'

  /* ══════════════════════════════════════════════════════ */
  /*  CHAT PHASE                                            */
  /* ══════════════════════════════════════════════════════ */
  if (phase === 'chat') {
    return (
      <div style={{ width: '100%', maxWidth: '540px', animation: 'fadeUp 0.4s var(--ease) both' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: 'linear-gradient(135deg, var(--gold) 0%, #a07830 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px', boxShadow: '0 4px 20px rgba(212,168,83,0.3)',
          }}>
            <svg width="22" height="22" viewBox="0 0 16 16" fill="#131110">
              <circle cx="8" cy="8" r="3"/>
              <circle cx="8" cy="2" r="1.2"/>
              <circle cx="8" cy="14" r="1.2"/>
              <circle cx="2" cy="8" r="1.2"/>
              <circle cx="14" cy="8" r="1.2"/>
            </svg>
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 400, color: 'var(--text-0)', lineHeight: 1.2 }}>
            {isRedo ? 'Update your profile' : 'Meet Locus'}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '6px' }}>
            {isRedo ? 'Tell Locus what\'s changed — takes about 2 minutes.' : 'A quick chat to get you set up. About 2 minutes.'}
          </div>
        </div>

        {/* Chat card */}
        <div style={{
          background: 'var(--bg-1)', border: '1px solid var(--border-md)',
          borderRadius: '18px', overflow: 'hidden',
          boxShadow: '0 4px 40px rgba(0,0,0,0.25)',
        }}>
          {/* Messages */}
          <div ref={messagesBoxRef} style={{
            height: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column',
            background: 'var(--bg-0)', scrollbarWidth: 'none',
          }}>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 20px 16px' }}>
              {messages.map((msg, i) => {
                const isLastAssistant = i === messages.length - 1 && msg.role === 'assistant'
                const showCursor = isLastAssistant && streaming && !msg.content
                if (msg.role === 'assistant') {
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <LocusIcon />
                      <div style={{ fontSize: '14px', color: 'var(--text-0)', lineHeight: 1.65, paddingTop: '4px', maxWidth: 'calc(100% - 42px)' }}>
                        {showCursor ? (
                          <span style={{ display: 'inline-flex', gap: '5px', alignItems: 'center', paddingTop: '6px' }}>
                            {[0, 180, 360].map(delay => (
                              <span key={delay} style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--text-3)', animation: 'pulse 1.4s ease-in-out infinite', animationDelay: `${delay}ms` }} />
                            ))}
                          </span>
                        ) : msg.content}
                      </div>
                    </div>
                  )
                }
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{
                      maxWidth: '75%', padding: '9px 14px',
                      borderRadius: '16px 16px 4px 16px',
                      background: 'var(--gold-dim)', border: '1px solid rgba(212,168,83,0.18)',
                      fontSize: '14px', color: 'var(--text-0)', lineHeight: 1.6,
                    }}>
                      {msg.content}
                    </div>
                  </div>
                )
              })}

              {/* "Reviewing…" indicator while switching phases */}
              {chatDone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-3)', animation: 'fadeUp 0.25s var(--ease) both' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--gold)', animation: 'pulse 1.2s ease-in-out infinite' }} />
                  Preparing your summary…
                </div>
              )}
              <div style={{ height: '1px' }} />
            </div>
          </div>

          <div style={{ height: '1px', background: 'var(--border)' }} />

          {/* Input */}
          {!chatDone ? (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', padding: '12px 14px', background: 'var(--bg-1)' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={streaming ? '' : 'Type your reply…'}
                disabled={streaming}
                rows={1}
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: 'var(--font-sans)', fontSize: '14px', color: 'var(--text-0)', resize: 'none', lineHeight: 1.5, overflow: 'hidden', paddingTop: '2px' }}
              />
              <button onClick={handleSend} disabled={!canSend} aria-label="Send" style={{ width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0, background: canSend ? 'var(--gold)' : 'var(--bg-4)', border: 'none', color: canSend ? '#131110' : 'var(--text-3)', cursor: canSend ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s, color 0.15s', fontSize: '16px', fontWeight: 700, fontFamily: 'inherit' }}>↑</button>
            </div>
          ) : (
            <div style={{ padding: '13px 20px', background: 'var(--bg-1)', fontSize: '13px', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--gold-dim)', border: '1px solid var(--gold)', display: 'inline-block' }} />
              Almost done…
            </div>
          )}
        </div>

        {error && (
          <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(200,80,60,0.08)', border: '1px solid rgba(200,80,60,0.18)', fontSize: '13px', color: '#e07060' }}>
            {error}
          </div>
        )}

        {!chatDone && <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '10px', textAlign: 'center' }}>Enter to send · Shift+Enter for new line</div>}

        <div style={{ textAlign: 'center', marginTop: '14px' }}>
          <a href="/brief" style={{ fontSize: '13px', color: 'var(--text-3)', textDecoration: 'none' }}>
            {isRedo ? '← Back to brief' : 'Skip for now →'}
          </a>
        </div>
      </div>
    )
  }

  /* ══════════════════════════════════════════════════════ */
  /*  REVIEW PHASE                                          */
  /* ══════════════════════════════════════════════════════ */
  return (
    <div style={{ width: '100%', maxWidth: '580px', animation: 'fadeUp 0.35s var(--ease) both' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: 'linear-gradient(135deg, var(--gold) 0%, #a07830 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px', boxShadow: '0 4px 20px rgba(212,168,83,0.3)',
        }}>
          <svg width="22" height="22" viewBox="0 0 16 16" fill="#131110">
            <circle cx="8" cy="8" r="3"/>
            <circle cx="8" cy="2" r="1.2"/>
            <circle cx="8" cy="14" r="1.2"/>
            <circle cx="2" cy="8" r="1.2"/>
            <circle cx="14" cy="8" r="1.2"/>
          </svg>
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 400, color: 'var(--text-0)' }}>
          Here's what I've got
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '6px' }}>
          Review and edit before launching. You can always change this later.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* ── GOALS CARD ── */}
        <ReviewCard title="Goals" count={goals.length}>
          {goals.map((g, i) => (
            <div key={g.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 0', borderBottom: i < goals.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: 'var(--gold-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: 'var(--gold)', flexShrink: 0, marginTop: '1px' }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-0)', marginBottom: '2px' }}>{g.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                  {GOAL_CATEGORIES.find(c => c.value === g.category)?.label ?? g.category}
                  {' · '}
                  {TIMEFRAMES.find(t => t.value === g.timeframe)?.label ?? g.timeframe}
                </div>
              </div>
              <button
                onClick={() => setGoals(gs => gs.filter(x => x.id !== g.id))}
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '18px', cursor: 'pointer', lineHeight: 1, flexShrink: 0, padding: '0 2px', opacity: 0.6 }}
                aria-label="Remove goal"
              >×</button>
            </div>
          ))}

          {/* Add goal inline form */}
          {addingGoal ? (
            <div style={{ marginTop: goals.length > 0 ? '12px' : '0', padding: '14px', background: 'var(--bg-2)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Goal title</label>
                <input
                  value={gTitle} onChange={e => setGTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addGoal()}
                  placeholder="e.g. Launch my product by Q2"
                  autoFocus style={inputStyle}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Category</label>
                  <select value={gCat} onChange={e => setGCat(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' }}>
                    {GOAL_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Timeframe</label>
                  <select value={gTime} onChange={e => setGTime(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' }}>
                    {TIMEFRAMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={addGoal} disabled={!gTitle.trim()} style={{ flex: 1, padding: '8px', background: gTitle.trim() ? 'var(--gold)' : 'var(--bg-3)', color: gTitle.trim() ? '#131110' : 'var(--text-3)', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 700, cursor: gTitle.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                  Add goal
                </button>
                <button onClick={() => { setAddingGoal(false); setGTitle('') }} style={{ padding: '8px 14px', background: 'none', border: '1px solid var(--border)', borderRadius: '7px', fontSize: '13px', color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : goals.length < 5 ? (
            <button
              onClick={() => setAddingGoal(true)}
              style={{ marginTop: goals.length > 0 ? '10px' : '0', width: '100%', padding: '8px', background: 'transparent', border: '1px dashed var(--border-md)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
            >
              <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span> Add a goal
            </button>
          ) : null}
        </ReviewCard>

        {/* ── HABITS CARD ── */}
        <ReviewCard title="Habits" count={habits.length}>
          {habits.map((h, i) => {
            const freq = FREQ_PRESETS.find(p => JSON.stringify([...p.days].sort()) === JSON.stringify([...h.days_of_week].sort()))?.label ?? 'Custom'
            return (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: i < habits.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: '20px', flexShrink: 0 }}>{h.emoji}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-0)' }}>{h.name}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-3)', marginLeft: '8px' }}>{freq}</span>
                </div>
                <button
                  onClick={() => setHabits(hs => hs.filter(x => x.id !== h.id))}
                  style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '18px', cursor: 'pointer', lineHeight: 1, flexShrink: 0, padding: '0 2px', opacity: 0.6 }}
                  aria-label="Remove habit"
                >×</button>
              </div>
            )
          })}

          {/* Add habit inline form */}
          {addingHabit ? (
            <div style={{ marginTop: habits.length > 0 ? '12px' : '0', padding: '14px', background: 'var(--bg-2)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Emoji</label>
                  <input value={hEmoji} onChange={e => setHEmoji(e.target.value)} maxLength={4} style={{ ...inputStyle, textAlign: 'center', fontSize: '18px', padding: '7px 4px' }} />
                </div>
                <div>
                  <label style={labelStyle}>Habit name</label>
                  <input value={hName} onChange={e => setHName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addHabit()} placeholder="e.g. Morning walk" autoFocus style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Frequency</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {FREQ_PRESETS.map(p => {
                    const active = JSON.stringify([...p.days].sort()) === JSON.stringify([...hDays].sort())
                    return (
                      <button key={p.label} onClick={() => setHDays(p.days)} style={{ flex: 1, padding: '7px 4px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: `1px solid ${active ? 'rgba(212,168,83,0.4)' : 'var(--border)'}`, background: active ? 'var(--gold-dim)' : 'var(--bg-3)', color: active ? 'var(--gold)' : 'var(--text-2)', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                        {p.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={addHabit} disabled={!hName.trim()} style={{ flex: 1, padding: '8px', background: hName.trim() ? 'var(--gold)' : 'var(--bg-3)', color: hName.trim() ? '#131110' : 'var(--text-3)', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 700, cursor: hName.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                  Add habit
                </button>
                <button onClick={() => { setAddingHabit(false); setHName(''); setHEmoji('✨'); setHDays([]) }} style={{ padding: '8px 14px', background: 'none', border: '1px solid var(--border)', borderRadius: '7px', fontSize: '13px', color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : habits.length < 5 ? (
            <button
              onClick={() => setAddingHabit(true)}
              style={{ marginTop: habits.length > 0 ? '10px' : '0', width: '100%', padding: '8px', background: 'transparent', border: '1px dashed var(--border-md)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
            >
              <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span> Add a habit
            </button>
          ) : null}
        </ReviewCard>

        {/* ── CHECK-IN CARD ── */}
        {checkin && (
          <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-md)', borderRadius: '12px', padding: '16px 20px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Today&apos;s Check-in</div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1, background: 'var(--bg-2)', borderRadius: '9px', padding: '10px 13px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: '3px' }}>Energy</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', color: 'var(--text-0)', lineHeight: 1 }}>{checkin.energy_level}<span style={{ fontSize: '12px', color: 'var(--text-3)', fontFamily: 'inherit' }}>/10</span></div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>{energyLabel}</div>
              </div>
              {checkin.mood_note && (
                <div style={{ flex: 2, background: 'var(--bg-2)', borderRadius: '9px', padding: '10px 13px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: '3px' }}>Mood</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-1)', lineHeight: 1.5 }}>{checkin.mood_note}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ERRORS ── */}
        {saveError && (
          <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(200,80,60,0.08)', border: '1px solid rgba(200,80,60,0.18)', fontSize: '13px', color: '#e07060' }}>
            {saveError}
          </div>
        )}

        {/* ── ACTIONS ── */}
        <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
          <button
            onClick={() => { setPhase('chat'); setChatDone(false); dataRef.current = false; setMessages([]); initFetched.current = false }}
            style={{ padding: '12px 18px', background: 'none', border: '1px solid var(--border-md)', color: 'var(--text-2)', borderRadius: '10px', fontSize: '13.5px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
          >
            ← Start over
          </button>
          <button
            onClick={handleLaunch}
            disabled={isPending || goals.length === 0 || habits.length === 0}
            style={{
              flex: 1, padding: '13px',
              background: (goals.length > 0 && habits.length > 0) ? 'var(--gold)' : 'var(--bg-3)',
              color: (goals.length > 0 && habits.length > 0) ? '#131110' : 'var(--text-3)',
              border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
              cursor: (isPending || goals.length === 0 || habits.length === 0) ? 'not-allowed' : 'pointer',
              opacity: isPending ? 0.7 : 1, fontFamily: 'inherit', transition: 'all 0.2s',
            }}
          >
            {isPending ? 'Setting up your OS…' : 'Launch my Locus →'}
          </button>
        </div>

        {goals.length === 0 && (
          <div style={{ fontSize: '12px', color: 'var(--text-3)', textAlign: 'center', marginTop: '-8px' }}>
            Add at least one goal to continue.
          </div>
        )}
        {goals.length > 0 && habits.length === 0 && (
          <div style={{ fontSize: '12px', color: 'var(--text-3)', textAlign: 'center', marginTop: '-8px' }}>
            Add at least one habit to continue.
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          <a href="/brief" style={{ fontSize: '13px', color: 'var(--text-3)', textDecoration: 'none' }}>
            {isRedo ? '← Back to brief' : 'Skip setup →'}
          </a>
        </div>
      </div>
    </div>
  )
}

/* ── Review section card wrapper ── */
function ReviewCard({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-md)', borderRadius: '12px', padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: count > 0 ? '4px' : '0' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-3)', background: 'var(--bg-3)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>{count}</div>
      </div>
      {children}
    </div>
  )
}
