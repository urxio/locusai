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
  const [isRedo, setIsRedo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const initFetched = useRef(false)

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchReply = useCallback(
    async (msgs: Message[]) => {
      setStreaming(true)
      setError(null)
      let fullText = ''

      // Append empty assistant bubble immediately
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      try {
        const res = await fetch('/api/checkin/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: msgs }),
        })

        if (!res.ok || !res.body) throw new Error('Request failed')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          fullText += decoder.decode(value, { stream: true })

          // Strip the data block from the visible message while streaming
          const display = fullText.replace(CHECKIN_DATA_RE, '').trim()
          setMessages(prev => {
            const next = [...prev]
            next[next.length - 1] = { role: 'assistant', content: display }
            return next
          })
        }

        // Check for completion signal
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
        setMessages(prev => prev.slice(0, -1)) // remove the empty bubble
      } finally {
        setStreaming(false)
        inputRef.current?.focus()
      }
    },
    [router]
  )

  // Fetch opening question on mount
  useEffect(() => {
    if (step !== 'chat' || initFetched.current) return
    initFetched.current = true
    fetchReply([])
  }, [step, fetchReply])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return

    const next: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    await fetchReply(next)
  }, [input, messages, streaming, fetchReply])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Auto-grow textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }

  const handleRedo = () => {
    setIsRedo(true)
    setStep('chat')
    setMessages([])
    setCheckinData(null)
    setError(null)
    initFetched.current = false
  }

  const energyLabel = !checkinData
    ? ''
    : checkinData.energy_level >= 9
    ? 'Exceptional'
    : checkinData.energy_level >= 7
    ? 'High'
    : checkinData.energy_level >= 5
    ? 'Moderate'
    : checkinData.energy_level >= 3
    ? 'Low'
    : 'Depleted'

  const energyColor = !checkinData
    ? 'var(--text-0)'
    : checkinData.energy_level >= 7
    ? 'var(--sage)'
    : checkinData.energy_level >= 5
    ? 'var(--gold)'
    : '#c08060'

  return (
    <div
      className="page-pad"
      style={{ maxWidth: '860px', animation: 'fadeUp 0.3s var(--ease) both' }}
    >
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div
          style={{
            fontSize: '11px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            fontWeight: 600,
            marginBottom: '6px',
            opacity: 0.85,
          }}
        >
          {isRedo ? 'Updating Check-in' : 'Daily Check-in'}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '34px',
            fontWeight: 400,
            color: 'var(--text-0)',
            lineHeight: 1.15,
          }}
        >
          How are you{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--text-1)' }}>
            showing up
          </em>{' '}
          today?
        </div>
        <div
          style={{
            fontSize: '14px',
            color: 'var(--text-2)',
            marginTop: '6px',
          }}
        >
          Takes about 90 seconds. Helps Locus understand you better over time.
        </div>
      </div>

      <div style={{ maxWidth: '560px' }}>
        {/* ── CHAT / SAVING ── */}
        {(step === 'chat' || step === 'saving') && (
          <div style={{ animation: 'fadeUp 0.3s var(--ease) both' }}>
            {/* Message thread */}
            <div
              style={{
                minHeight: '120px',
                maxHeight: '380px',
                overflowY: 'auto',
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                paddingRight: '4px',
              }}
            >
              {messages.map((msg, i) => {
                const isLastAssistant =
                  i === messages.length - 1 && msg.role === 'assistant'
                const showCursor = isLastAssistant && streaming && !msg.content

                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent:
                        msg.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '85%',
                        padding: '10px 14px',
                        borderRadius:
                          msg.role === 'user'
                            ? '16px 16px 4px 16px'
                            : '16px 16px 16px 4px',
                        background:
                          msg.role === 'user'
                            ? 'var(--gold-dim)'
                            : 'var(--bg-2)',
                        border: `1px solid ${
                          msg.role === 'user'
                            ? 'rgba(212,168,83,0.25)'
                            : 'var(--border-md)'
                        }`,
                        fontSize: '14px',
                        color:
                          msg.role === 'user'
                            ? 'var(--gold)'
                            : 'var(--text-0)',
                        lineHeight: 1.6,
                        minHeight: showCursor ? '38px' : undefined,
                        minWidth: showCursor ? '48px' : undefined,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {showCursor ? (
                        <span
                          style={{
                            display: 'inline-block',
                            width: '7px',
                            height: '14px',
                            background: 'var(--text-2)',
                            borderRadius: '2px',
                            animation: 'pulse 1.1s ease-in-out infinite',
                          }}
                        />
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Saving indicator */}
              {step === 'saving' && (
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-3)',
                    textAlign: 'center',
                    padding: '8px 0',
                    animation: 'fadeUp 0.2s var(--ease) both',
                  }}
                >
                  Saving check-in…
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  fontSize: '13px',
                  color: '#c08060',
                  marginBottom: '12px',
                  padding: '10px 14px',
                  background: 'rgba(192,128,96,0.1)',
                  border: '1px solid rgba(192,128,96,0.2)',
                  borderRadius: '8px',
                }}
              >
                {error}
              </div>
            )}

            {/* Input row */}
            <div
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-end',
                background: 'var(--bg-1)',
                border: '1px solid var(--border-md)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 12px',
                transition: 'border-color 0.15s',
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder={
                  streaming
                    ? 'Locus is thinking…'
                    : 'Share how you\'re doing…'
                }
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
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || streaming || step === 'saving'}
                aria-label="Send"
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  background:
                    input.trim() && !streaming && step !== 'saving'
                      ? 'var(--gold)'
                      : 'var(--bg-4)',
                  border: 'none',
                  color:
                    input.trim() && !streaming && step !== 'saving'
                      ? '#131110'
                      : 'var(--text-3)',
                  cursor:
                    input.trim() && !streaming && step !== 'saving'
                      ? 'pointer'
                      : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'background 0.15s, color 0.15s',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                }}
              >
                ↑
              </button>
            </div>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-3)',
                marginTop: '8px',
              }}
            >
              Enter to send · Shift+Enter for new line
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {step === 'done' && checkinData && (
          <div style={{ animation: 'fadeUp 0.3s var(--ease) both' }}>
            {/* Summary card */}
            <div
              style={{
                background: 'var(--bg-1)',
                border: '1px solid var(--border-md)',
                borderRadius: 'var(--radius-xl)',
                padding: '28px',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  marginBottom: '20px',
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    background:
                      'linear-gradient(135deg, rgba(122,158,138,0.2), rgba(122,158,138,0.08))',
                    border: '1px solid rgba(122,158,138,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    flexShrink: 0,
                  }}
                >
                  ✓
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '22px',
                      fontWeight: 400,
                      color: 'var(--text-0)',
                    }}
                  >
                    {isRedo ? 'Check-in updated.' : 'Check-in complete.'}
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-2)',
                      marginTop: '3px',
                    }}
                  >
                    {isRedo
                      ? 'Your brief will regenerate with the new data.'
                      : 'Locus has updated your daily brief.'}
                  </div>
                </div>
              </div>

              <div className="stats-grid-3">
                <SummaryTile
                  label="Energy"
                  value={`${checkinData.energy_level}/10`}
                  sub={energyLabel}
                  color={energyColor}
                />
                <SummaryTile
                  label="Mood note"
                  value={checkinData.mood_note ? '✓ logged' : '—'}
                  sub={
                    checkinData.mood_note
                      ? checkinData.mood_note.slice(0, 24) +
                        (checkinData.mood_note.length > 24 ? '…' : '')
                      : 'skipped'
                  }
                />
                <SummaryTile
                  label="Blockers"
                  value={`${
                    checkinData.blockers.filter(b => b !== 'No blockers today')
                      .length
                  }`}
                  sub={
                    checkinData.blockers.length === 0 ||
                    checkinData.blockers.includes('No blockers today')
                      ? 'none today'
                      : checkinData.blockers[0]
                  }
                />
              </div>

              {checkinData.highlight && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '10px 14px',
                    background: 'rgba(122,158,138,0.08)',
                    border: '1px solid rgba(122,158,138,0.2)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: 'var(--text-1)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                  }}
                >
                  <span style={{ color: 'var(--sage)', flexShrink: 0 }}>
                    ★
                  </span>
                  <span>{checkinData.highlight}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleRedo}
                style={{
                  flex: 1,
                  background: 'none',
                  border: '1px solid var(--border-md)',
                  color: 'var(--text-2)',
                  borderRadius: '9px',
                  padding: '12px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                ↺ Update check-in
              </button>
              <a
                href="/brief"
                style={{
                  flex: 2,
                  display: 'block',
                  padding: '12px',
                  background: 'var(--gold)',
                  color: '#131110',
                  borderRadius: '9px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  textAlign: 'center',
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

function SummaryTile({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string
  sub: string
  color?: string
}) {
  return (
    <div
      style={{
        background: 'var(--bg-2)',
        borderRadius: '10px',
        padding: '12px 14px',
      }}
    >
      <div
        style={{
          fontSize: '10px',
          color: 'var(--text-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          fontWeight: 600,
          marginBottom: '4px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '18px',
          fontWeight: 400,
          color: color ?? 'var(--text-0)',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: '11px',
          color: 'var(--text-3)',
          marginTop: '3px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {sub}
      </div>
    </div>
  )
}
