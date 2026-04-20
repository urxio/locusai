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

const ONBOARDING_DATA_RE = /<onboarding_data>\s*([\s\S]*?)\s*<\/onboarding_data>/

/* ── Locus logo icon (reused from login page) ── */
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

export default function OnboardingFlow({ userName, isRedo }: { userName: string; isRedo: boolean }) {
  const [messages,  setMessages]  = useState<Message[]>([])
  const [input,     setInput]     = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [done,      setDone]      = useState(false)

  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const messagesBoxRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLTextAreaElement>(null)
  const initFetched    = useRef(false)
  const savedRef       = useRef(false)

  /* ── Scroll to bottom on new messages ── */
  useEffect(() => {
    const box = messagesBoxRef.current
    if (box) box.scrollTop = box.scrollHeight
  }, [messages])

  /* ── Save onboarding data then redirect ── */
  const saveOnboarding = useCallback(async (data: OnboardingData) => {
    if (savedRef.current) return
    savedRef.current = true
    setDone(true)

    startTransition(async () => {
      try {
        await completeOnboarding(
          data.goals,
          data.habits,
          data.profile,
          {
            energy_level: data.checkin.energy_level,
            mood_note: data.checkin.mood_note ?? null,
          },
          Intl.DateTimeFormat().resolvedOptions().timeZone
        )
        router.push('/brief')
        router.refresh()
      } catch (err) {
        console.error('[OnboardingFlow] save error', err)
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
        savedRef.current = false
        setDone(false)
      }
    })
  }, [router]) // eslint-disable-line react-hooks/exhaustive-deps

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
        const { done: rdDone, value } = await reader.read()
        if (rdDone) break
        fullText += decoder.decode(value, { stream: true })

        // Strip the hidden data tag from display
        const display = fullText.replace(ONBOARDING_DATA_RE, '').trim()

        setMessages(prev => {
          const next = [...prev]
          next[next.length - 1] = { role: 'assistant', content: display }
          return next
        })
      }

      // Detect and save onboarding data
      const dataMatch = fullText.match(ONBOARDING_DATA_RE)
      if (dataMatch && !savedRef.current) {
        try {
          const data: OnboardingData = JSON.parse(dataMatch[1])
          await saveOnboarding(data)
        } catch (parseErr) {
          console.error('[OnboardingFlow] parse error', parseErr)
        }
      }
    } catch (err) {
      console.error('[OnboardingFlow] fetch error', err)
      setError('Something went wrong — please try again.')
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setStreaming(false)
      if (!done) inputRef.current?.focus()
    }
  }, [userName, saveOnboarding, done])

  /* ── Fetch opener on mount ── */
  useEffect(() => {
    if (initFetched.current) return
    initFetched.current = true
    fetchReply([])
  }, [fetchReply])

  /* ── Send handler ── */
  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming || done) return
    const next: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    await fetchReply(next)
  }, [input, messages, streaming, done, fetchReply])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }

  const canSend = !!input.trim() && !streaming && !done

  return (
    <div style={{ width: '100%', maxWidth: '540px', animation: 'fadeUp 0.4s var(--ease) both' }}>

      {/* ── Header ── */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: 'linear-gradient(135deg, var(--gold) 0%, #a07830 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
          boxShadow: '0 4px 20px rgba(212,168,83,0.3)',
        }}>
          <svg width="22" height="22" viewBox="0 0 16 16" fill="#131110">
            <circle cx="8" cy="8" r="3"/>
            <circle cx="8" cy="2" r="1.2"/>
            <circle cx="8" cy="14" r="1.2"/>
            <circle cx="2" cy="8" r="1.2"/>
            <circle cx="14" cy="8" r="1.2"/>
          </svg>
        </div>
        <div style={{
          fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 400,
          color: 'var(--text-0)', lineHeight: 1.2,
        }}>
          {isRedo ? 'Update your profile' : 'Meet Locus'}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '6px' }}>
          {isRedo
            ? 'Tell Locus what\'s changed — takes about 2 minutes.'
            : 'A quick chat to get you set up. About 2 minutes.'}
        </div>
      </div>

      {/* ── Chat card ── */}
      <div style={{
        background: 'var(--bg-1)', border: '1px solid var(--border-md)',
        borderRadius: '18px', overflow: 'hidden',
        boxShadow: '0 4px 40px rgba(0,0,0,0.25)',
      }}>

        {/* Messages */}
        <div
          ref={messagesBoxRef}
          style={{
            height: '380px', overflowY: 'auto',
            display: 'flex', flexDirection: 'column',
            background: 'var(--bg-0)', scrollbarWidth: 'none',
          }}
        >
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 20px 16px' }}>

            {messages.map((msg, i) => {
              const isLastAssistant = i === messages.length - 1 && msg.role === 'assistant'
              const showCursor = isLastAssistant && streaming && !msg.content

              if (msg.role === 'assistant') {
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <LocusIcon />
                    <div style={{
                      fontSize: '14px', color: 'var(--text-0)', lineHeight: 1.65,
                      paddingTop: '4px', maxWidth: 'calc(100% - 42px)',
                    }}>
                      {showCursor ? (
                        <span style={{ display: 'inline-flex', gap: '5px', alignItems: 'center', paddingTop: '6px' }}>
                          {[0, 180, 360].map(delay => (
                            <span key={delay} style={{
                              width: '5px', height: '5px', borderRadius: '50%',
                              background: 'var(--text-3)',
                              animation: 'pulse 1.4s ease-in-out infinite',
                              animationDelay: `${delay}ms`,
                            }} />
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
                    background: 'var(--gold-dim)',
                    border: '1px solid rgba(212,168,83,0.18)',
                    fontSize: '14px', color: 'var(--text-0)', lineHeight: 1.6,
                  }}>
                    {msg.content}
                  </div>
                </div>
              )
            })}

            {/* Saving state */}
            {done && isPending && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '13px', color: 'var(--text-3)', padding: '4px 0',
                animation: 'fadeUp 0.25s var(--ease) both',
              }}>
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: 'var(--gold)',
                  animation: 'pulse 1.2s ease-in-out infinite',
                }} />
                Setting up your Locus…
              </div>
            )}

            <div style={{ height: '1px' }} />
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--border)' }} />

        {/* Input */}
        {!done ? (
          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: '10px',
            padding: '12px 14px', background: 'var(--bg-1)',
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={streaming ? '' : 'Type your reply…'}
              disabled={streaming}
              rows={1}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontFamily: 'var(--font-sans)', fontSize: '14px',
                color: 'var(--text-0)', resize: 'none', lineHeight: 1.5,
                overflow: 'hidden', paddingTop: '2px',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!canSend}
              aria-label="Send"
              style={{
                width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                background: canSend ? 'var(--gold)' : 'var(--bg-4)', border: 'none',
                color: canSend ? '#131110' : 'var(--text-3)',
                cursor: canSend ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s, color 0.15s',
                fontSize: '16px', fontWeight: 700, fontFamily: 'inherit',
              }}
            >↑</button>
          </div>
        ) : (
          /* Done state — no input, just a subtle status */
          !isPending && (
            <div style={{
              padding: '14px 20px', background: 'var(--bg-1)',
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '13px', color: 'var(--sage)',
              animation: 'fadeUp 0.25s var(--ease) both',
            }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M3 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Setup complete — loading your brief…
            </div>
          )
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          marginTop: '12px', padding: '10px 14px', borderRadius: '10px',
          background: 'rgba(200,80,60,0.08)', border: '1px solid rgba(200,80,60,0.18)',
          fontSize: '13px', color: '#e07060',
        }}>
          {error}
        </div>
      )}

      {/* Hint */}
      {!done && (
        <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '10px', textAlign: 'center' }}>
          Enter to send · Shift+Enter for new line
        </div>
      )}

      {/* Skip / back */}
      {(isRedo || true) && (
        <div style={{ textAlign: 'center', marginTop: '14px' }}>
          <a
            href="/brief"
            style={{ fontSize: '13px', color: 'var(--text-3)', textDecoration: 'none' }}
          >
            {isRedo ? '← Back to brief' : 'Skip for now →'}
          </a>
        </div>
      )}
    </div>
  )
}
