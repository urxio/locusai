'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { submitCheckin } from '@/app/actions/checkin'
import { localDateStr } from '@/lib/utils/date'
import type { CheckIn } from '@/lib/types'

type Message = { role: 'user' | 'assistant'; content: string }

type CheckinData = {
  energy_level: number
  mood_note: string | null
  blockers: string[]
  highlight: string | null
}

const CHECKIN_DATA_RE = /<checkin_data>\s*([\s\S]*?)\s*<\/checkin_data>/

export default function ConversationalCheckin({
  existingCheckin,
}: {
  existingCheckin: CheckIn | null
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [step, setStep] = useState<'chat' | 'saving' | 'done'>(
    existingCheckin ? 'done' : 'chat'
  )
  const [checkinData, setCheckinData] = useState<CheckinData | null>(
    existingCheckin
      ? {
          energy_level: existingCheckin.energy_level,
          mood_note: existingCheckin.mood_note ?? null,
          blockers: existingCheckin.blockers ?? [],
          highlight: existingCheckin.highlight ?? null,
        }
      : null
  )
  // Snapshot of the check-in being replaced — shared with the API for redo context
  const [previousCheckin, setPreviousCheckin] = useState<CheckinData | null>(null)
  const [isRedo, setIsRedo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)

  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const initFetched = useRef(false)

  // Scroll to bottom on new content
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchReply = useCallback(
    async (msgs: Message[], prevCheckin: CheckinData | null = null) => {
      setStreaming(true)
      setError(null)
      let fullText = ''

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      try {
        const res = await fetch('/api/checkin/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: msgs,
            previousCheckin: prevCheckin,
          }),
        })

        if (!res.ok || !res.body) throw new Error('Request failed')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          fullText += decoder.decode(value, { stream: true })

          const display = fullText.replace(CHECKIN_DATA_RE, '').trim()
          setMessages(prev => {
            const next = [...prev]
            next[next.length - 1] = { role: 'assistant', content: display }
            return next
          })
        }

        const match = fullText.match(CHECKIN_DATA_RE)
        if (match) {
          const data: CheckinData = JSON.parse(match[1])
          setCheckinData(data)
          setStep('saving')
          await submitCheckin({
            energy_level: data.energy_level,
            mood_note: data.mood_note,
            blockers: data.blockers,
            highlight: data.highlight,
            localDate: localDateStr(),
          })
          setStep('done')
          router.refresh()
        }
      } catch (err) {
        console.error('[ConversationalCheckin]', err)
        setError('Something went wrong — please try again.')
        setMessages(prev => prev.slice(0, -1))
      } finally {
        setStreaming(false)
        inputRef.current?.focus()
      }
    },
    [router]
  )

  // Fetch opener on mount / after redo reset
  useEffect(() => {
    if (step !== 'chat' || initFetched.current) return
    initFetched.current = true
    fetchReply([], previousCheckin)
  }, [step, fetchReply, previousCheckin])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return
    const next: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    await fetchReply(next, previousCheckin)
  }, [input, messages, streaming, fetchReply, previousCheckin])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }

  const handleRedo = () => {
    setPreviousCheckin(checkinData) // save for redo context
    setIsRedo(true)
    setStep('chat')
    setMessages([])
    setCheckinData(null)
    setError(null)
    initFetched.current = false
  }

  const energyLabel = !checkinData ? '' :
    checkinData.energy_level >= 9 ? 'Exceptional' :
    checkinData.energy_level >= 7 ? 'High' :
    checkinData.energy_level >= 5 ? 'Moderate' :
    checkinData.energy_level >= 3 ? 'Low' : 'Depleted'

  const energyColor = !checkinData ? 'var(--text-0)' :
    checkinData.energy_level >= 7 ? 'var(--sage)' :
    checkinData.energy_level >= 5 ? 'var(--gold)' : '#c08060'

  const canSend = input.trim() && !streaming && step !== 'saving'

  return (
    <div
      className="page-pad"
      style={{ maxWidth: '860px', animation: 'fadeUp 0.3s var(--ease) both' }}
    >
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{
          fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--gold)', fontWeight: 600, marginBottom: '6px', opacity: 0.85,
        }}>
          {isRedo ? 'Updating Check-in' : 'Daily Check-in'}
        </div>
        <div style={{
          fontFamily: 'var(--font-serif)', fontSize: '34px', fontWeight: 400,
          color: 'var(--text-0)', lineHeight: 1.15,
        }}>
          How are you{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--text-1)' }}>showing up</em>{' '}
          today?
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-2)', marginTop: '6px' }}>
          Takes about 90 seconds. Helps Locus understand you better over time.
        </div>
      </div>

      <div style={{ maxWidth: '580px' }}>

        {/* ── CHAT / SAVING ── */}
        {(step === 'chat' || step === 'saving') && (
          <div style={{ animation: 'fadeUp 0.3s var(--ease) both' }}>

            {/* Unified chat card */}
            <div style={{
              background: 'var(--bg-1)',
              border: `1px solid ${focused ? 'var(--border-bright)' : 'var(--border-md)'}`,
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
              transition: 'border-color 0.2s',
            }}>

              {/* Messages area — fixed height, messages anchor to bottom */}
              <div style={{
                height: '280px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                padding: '20px 20px 12px',
                scrollbarWidth: 'none',
              }}>
                {/* Spacer pushes messages to the bottom */}
                <div style={{ flex: 1 }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {messages.map((msg, i) => {
                    const isLastAssistant = i === messages.length - 1 && msg.role === 'assistant'
                    const showCursor = isLastAssistant && streaming && !msg.content

                    return (
                      <div key={i} style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: '8px',
                        justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      }}>
                        {/* Locus avatar — only on assistant messages */}
                        {msg.role === 'assistant' && (
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '7px',
                            background: 'linear-gradient(135deg, var(--gold) 0%, #a07830 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginBottom: '2px',
                            boxShadow: '0 1px 6px rgba(212,168,83,0.25)',
                          }}>
                            <svg width="10" height="10" viewBox="0 0 16 16" fill="#131110">
                              <circle cx="8" cy="8" r="3"/>
                              <circle cx="8" cy="2" r="1.2"/>
                              <circle cx="8" cy="14" r="1.2"/>
                              <circle cx="2" cy="8" r="1.2"/>
                              <circle cx="14" cy="8" r="1.2"/>
                            </svg>
                          </div>
                        )}

                        {/* Bubble */}
                        <div style={{
                          maxWidth: '78%',
                          padding: showCursor ? '10px 14px' : '10px 14px',
                          borderRadius: msg.role === 'user'
                            ? '18px 18px 4px 18px'
                            : '4px 18px 18px 18px',
                          background: msg.role === 'user'
                            ? 'var(--gold-dim)'
                            : 'var(--bg-3)',
                          border: `1px solid ${msg.role === 'user'
                            ? 'rgba(212,168,83,0.2)'
                            : 'var(--border)'}`,
                          fontSize: '14px',
                          color: msg.role === 'user' ? 'var(--gold)' : 'var(--text-0)',
                          lineHeight: 1.6,
                          minWidth: showCursor ? '42px' : undefined,
                          minHeight: showCursor ? '38px' : undefined,
                          display: 'flex',
                          alignItems: 'center',
                        }}>
                          {showCursor ? (
                            <span style={{
                              display: 'inline-flex',
                              gap: '4px',
                              alignItems: 'center',
                            }}>
                              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--text-3)', animation: 'pulse 1.2s ease-in-out infinite', animationDelay: '0ms' }} />
                              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--text-3)', animation: 'pulse 1.2s ease-in-out infinite', animationDelay: '200ms' }} />
                              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--text-3)', animation: 'pulse 1.2s ease-in-out infinite', animationDelay: '400ms' }} />
                            </span>
                          ) : msg.content}
                        </div>
                      </div>
                    )
                  })}

                  {/* Saving state */}
                  {step === 'saving' && (
                    <div style={{
                      fontSize: '12px', color: 'var(--text-3)',
                      textAlign: 'center', padding: '4px 0',
                      animation: 'fadeUp 0.2s var(--ease) both',
                    }}>
                      Saving check-in…
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: 'var(--border)' }} />

              {/* Input row — inside the card */}
              <div style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-end',
                padding: '12px 14px',
              }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder={streaming ? '' : 'Share how you\'re doing…'}
                  disabled={streaming || step === 'saving'}
                  rows={1}
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '14px',
                    color: 'var(--text-0)',
                    resize: 'none',
                    lineHeight: 1.5,
                    overflow: 'hidden',
                    paddingTop: '2px',
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!canSend}
                  aria-label="Send"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: canSend ? 'var(--gold)' : 'var(--bg-4)',
                    border: 'none',
                    color: canSend ? '#131110' : 'var(--text-3)',
                    cursor: canSend ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'background 0.15s, color 0.15s',
                    fontFamily: 'inherit',
                    fontSize: '15px',
                    fontWeight: 700,
                  }}
                >
                  ↑
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                fontSize: '13px', color: '#c08060', marginTop: '10px',
                padding: '10px 14px', background: 'rgba(192,128,96,0.1)',
                border: '1px solid rgba(192,128,96,0.2)', borderRadius: '8px',
              }}>
                {error}
              </div>
            )}

            {/* Hint */}
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '10px' }}>
              Enter to send · Shift+Enter for new line
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {step === 'done' && checkinData && (
          <div style={{ animation: 'fadeUp 0.3s var(--ease) both' }}>
            <div style={{
              background: 'var(--bg-1)', border: '1px solid var(--border-md)',
              borderRadius: 'var(--radius-xl)', padding: '28px', marginBottom: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div style={{
                  width: '52px', height: '52px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(122,158,138,0.2), rgba(122,158,138,0.08))',
                  border: '1px solid rgba(122,158,138,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '24px', flexShrink: 0,
                }}>
                  ✓
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 400, color: 'var(--text-0)' }}>
                    {isRedo ? 'Check-in updated.' : 'Check-in complete.'}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '3px' }}>
                    {isRedo ? 'Your brief will regenerate with the new data.' : 'Locus has updated your daily brief.'}
                  </div>
                </div>
              </div>

              <div className="stats-grid-3">
                <SummaryTile label="Energy" value={`${checkinData.energy_level}/10`} sub={energyLabel} color={energyColor} />
                <SummaryTile
                  label="Mood note"
                  value={checkinData.mood_note ? '✓ logged' : '—'}
                  sub={checkinData.mood_note ? checkinData.mood_note.slice(0, 24) + (checkinData.mood_note.length > 24 ? '…' : '') : 'skipped'}
                />
                <SummaryTile
                  label="Blockers"
                  value={`${checkinData.blockers.filter(b => b !== 'No blockers today').length}`}
                  sub={checkinData.blockers.length === 0 || checkinData.blockers.includes('No blockers today') ? 'none today' : checkinData.blockers[0]}
                />
              </div>

              {checkinData.highlight && (
                <div style={{
                  marginTop: '12px', padding: '10px 14px',
                  background: 'rgba(122,158,138,0.08)', border: '1px solid rgba(122,158,138,0.2)',
                  borderRadius: '8px', fontSize: '13px', color: 'var(--text-1)',
                  display: 'flex', alignItems: 'flex-start', gap: '8px',
                }}>
                  <span style={{ color: 'var(--sage)', flexShrink: 0 }}>★</span>
                  <span>{checkinData.highlight}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleRedo}
                style={{
                  flex: 1, background: 'none', border: '1px solid var(--border-md)',
                  color: 'var(--text-2)', borderRadius: '9px', padding: '12px',
                  fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                ↺ Update check-in
              </button>
              <a
                href="/brief"
                style={{
                  flex: 2, display: 'block', padding: '12px', background: 'var(--gold)',
                  color: '#131110', borderRadius: '9px', fontSize: '13.5px',
                  fontWeight: 700, textDecoration: 'none', textAlign: 'center',
                }}
              >
                View Daily Brief →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryTile({ label, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div style={{ background: 'var(--bg-2)', borderRadius: '10px', padding: '12px 14px' }}>
      <div style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 400, color: color ?? 'var(--text-0)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>
    </div>
  )
}
