'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { submitCheckin } from '@/app/actions/checkin'
import { localDateStr } from '@/lib/utils/date'
import type { CheckIn } from '@/lib/types'
import type { UserMemory } from '@/lib/ai/memory'
import PostCheckinBrief from '@/components/brief/PostCheckinBrief'

type Message = { role: 'user' | 'assistant'; content: string }

type CheckinData = {
  energy_level: number
  mood_note: string | null
  blockers: string[]
  highlight: string | null
}

const CHECKIN_DATA_RE = /<checkin_data>\s*([\s\S]*?)\s*<\/checkin_data>/
const SHOW_BRIEF_RE   = /<show_brief>/

export default function ConversationalCheckin({
  existingCheckin,
  memory,
}: {
  existingCheckin: CheckIn | null
  memory?: UserMemory | null
}) {
  const [messages,     setMessages]     = useState<Message[]>([])
  const [input,        setInput]        = useState('')
  const [streaming,    setStreaming]    = useState(false)
  const [isSaving,     setIsSaving]    = useState(false)
  const [checkinSaved, setCheckinSaved] = useState(!!existingCheckin)
  const [showBrief,    setShowBrief]    = useState(false)
  const [isRedo,       setIsRedo]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  const [checkinData, setCheckinData] = useState<CheckinData | null>(
    existingCheckin
      ? {
          energy_level: existingCheckin.energy_level,
          mood_note:    existingCheckin.mood_note ?? null,
          blockers:     existingCheckin.blockers ?? [],
          highlight:    existingCheckin.highlight ?? null,
        }
      : null
  )
  const [previousCheckin, setPreviousCheckin] = useState<CheckinData | null>(null)

  // Whether the chat interface should be active
  const chatActive = !existingCheckin || isRedo

  const router        = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef      = useRef<HTMLTextAreaElement>(null)
  const briefCTARef   = useRef<HTMLDivElement>(null)
  const initFetched   = useRef(false)
  const savedRef      = useRef(false) // prevent double-save

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Scroll "See daily insights" button into view after it appears
  useEffect(() => {
    if (checkinSaved && !showBrief) {
      setTimeout(() => {
        briefCTARef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 400)
    }
  }, [checkinSaved, showBrief])

  const saveCheckin = useCallback(async (data: CheckinData) => {
    if (savedRef.current) return
    savedRef.current = true
    setIsSaving(true)
    try {
      await submitCheckin({
        energy_level: data.energy_level,
        mood_note:    data.mood_note,
        blockers:     data.blockers,
        highlight:    data.highlight,
        localDate:    localDateStr(),
      })
      setCheckinSaved(true)
      router.refresh()
    } catch (err) {
      console.error('[saveCheckin]', err)
      savedRef.current = false // allow retry
    } finally {
      setIsSaving(false)
    }
  }, [router])

  const fetchReply = useCallback(
    async (msgs: Message[], prevCheckin: CheckinData | null = null) => {
      setStreaming(true)
      setError(null)
      let fullText = ''

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      try {
        const res = await fetch('/api/checkin/chat', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ messages: msgs, previousCheckin: prevCheckin }),
        })

        if (!res.ok || !res.body) throw new Error('Request failed')

        const reader  = res.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          fullText += decoder.decode(value, { stream: true })

          // Strip hidden tags before displaying
          const display = fullText
            .replace(CHECKIN_DATA_RE, '')
            .replace(SHOW_BRIEF_RE, '')
            .trim()

          setMessages(prev => {
            const next = [...prev]
            next[next.length - 1] = { role: 'assistant', content: display }
            return next
          })
        }

        // Detect and save check-in data as soon as stream ends
        const dataMatch = fullText.match(CHECKIN_DATA_RE)
        if (dataMatch && !savedRef.current) {
          const data: CheckinData = JSON.parse(dataMatch[1])
          setCheckinData(data)
          await saveCheckin(data)
        }

        // Detect user request to show brief
        if (SHOW_BRIEF_RE.test(fullText)) {
          setShowBrief(true)
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
    [saveCheckin]
  )

  // Start fresh chat when chat becomes active
  useEffect(() => {
    if (!chatActive || initFetched.current) return
    initFetched.current = true
    fetchReply([], previousCheckin)
  }, [chatActive, fetchReply, previousCheckin])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming || isSaving) return
    const next: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    await fetchReply(next, previousCheckin)
  }, [input, messages, streaming, isSaving, fetchReply, previousCheckin])

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
    setPreviousCheckin(checkinData)
    setIsRedo(true)
    setMessages([])
    setCheckinData(null)
    setCheckinSaved(false)
    setShowBrief(false)
    setError(null)
    savedRef.current = false
    initFetched.current = false
  }

  const canSend = !!input.trim() && !streaming && !isSaving

  const energyLabel = !checkinData ? '' :
    checkinData.energy_level >= 9 ? 'Exceptional' :
    checkinData.energy_level >= 7 ? 'High' :
    checkinData.energy_level >= 5 ? 'Moderate' :
    checkinData.energy_level >= 3 ? 'Low' : 'Depleted'

  return (
    <div className="page-pad" style={{ maxWidth: '860px', animation: 'fadeUp 0.3s var(--ease) both' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{
          fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--gold)', fontWeight: 600, marginBottom: '6px', opacity: 0.85,
        }}>
          {isRedo ? 'Updating Check-in' : existingCheckin && !isRedo ? 'Today\'s Check-in' : 'Daily Check-in'}
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
          {existingCheckin && !isRedo
            ? 'Your check-in is logged for today.'
            : 'Takes about 90 seconds. Helps Locus understand you better over time.'}
        </div>
      </div>

      <div style={{ maxWidth: '580px' }}>

        {/* ── EXISTING CHECK-IN: compact summary + actions (no chat) ── */}
        {existingCheckin && !isRedo && checkinData && (
          <div style={{ animation: 'fadeUp 0.25s var(--ease) both' }}>

            {/* Summary card */}
            <div style={{
              background: 'var(--bg-1)', border: '1px solid var(--border-md)',
              borderRadius: '16px', padding: '20px', marginBottom: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
                  background: 'linear-gradient(135deg, rgba(122,158,138,0.25), rgba(122,158,138,0.08))',
                  border: '1px solid rgba(122,158,138,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="var(--sage)" strokeWidth="2.2">
                    <path d="M4 10l4 4 8-8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-0)', lineHeight: 1.2 }}>
                    Check-in complete
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '1px' }}>
                    Logged for today
                  </div>
                </div>
              </div>

              <div className="stats-grid-3">
                <SummaryTile label="Energy" value={`${checkinData.energy_level}/10`} sub={energyLabel} />
                <SummaryTile
                  label="Mood"
                  value={checkinData.mood_note ? '✓' : '—'}
                  sub={checkinData.mood_note ? checkinData.mood_note.slice(0, 24) + (checkinData.mood_note.length > 24 ? '…' : '') : 'skipped'}
                />
                <SummaryTile
                  label="Blockers"
                  value={`${checkinData.blockers.filter(b => b !== 'No blockers today').length}`}
                  sub={checkinData.blockers.length === 0 || checkinData.blockers[0] === 'No blockers today'
                    ? 'none today'
                    : checkinData.blockers[0]?.slice(0, 22)}
                />
              </div>

              {checkinData.highlight && (
                <div style={{
                  marginTop: '12px', padding: '9px 13px',
                  background: 'rgba(122,158,138,0.07)', border: '1px solid rgba(122,158,138,0.18)',
                  borderRadius: '9px', fontSize: '13px', color: 'var(--text-1)',
                  display: 'flex', alignItems: 'flex-start', gap: '7px',
                }}>
                  <span style={{ color: 'var(--sage)', flexShrink: 0 }}>★</span>
                  <span>{checkinData.highlight}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              {!showBrief && (
                <button
                  onClick={() => setShowBrief(true)}
                  style={{
                    flex: 1, background: 'var(--gold)', color: '#131110', border: 'none',
                    borderRadius: '10px', padding: '13px', fontSize: '13.5px', fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  See daily insights →
                </button>
              )}
              <button
                onClick={handleRedo}
                style={{
                  background: 'none', border: '1px solid var(--border-md)', color: 'var(--text-2)',
                  borderRadius: '10px', padding: '13px 18px', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                }}
              >
                ↺ Update
              </button>
            </div>
          </div>
        )}

        {/* ── CHAT (new check-in or redo mode) ── */}
        {chatActive && (
          <div style={{ animation: 'fadeUp 0.25s var(--ease) both' }}>

            {/* "Saved" status badge — appears after check-in is logged */}
            {checkinSaved && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '8px 14px', marginBottom: '10px',
                background: 'rgba(122,158,138,0.08)', border: '1px solid rgba(122,158,138,0.2)',
                borderRadius: '10px', fontSize: '12px', color: 'var(--sage)', fontWeight: 600,
                animation: 'fadeUp 0.25s var(--ease) both',
              }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M3 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Check-in saved
              </div>
            )}

            {/* Chat card — stays in place, never moves */}
            <div style={{
              border: '1px solid var(--border-md)', borderRadius: '18px',
              overflow: 'hidden', background: 'var(--bg-1)',
            }}>
              {/* Messages — fixed height, scrolls internally */}
              <div style={{
                height: '300px', overflowY: 'auto',
                display: 'flex', flexDirection: 'column',
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
                          <div style={{
                            width: '26px', height: '26px', borderRadius: '8px', flexShrink: 0,
                            background: 'linear-gradient(135deg, var(--gold) 0%, #a07830 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 1px 8px rgba(212,168,83,0.2)', marginTop: '1px',
                          }}>
                            <svg width="11" height="11" viewBox="0 0 16 16" fill="#131110">
                              <circle cx="8" cy="8" r="3"/>
                              <circle cx="8" cy="2" r="1.2"/>
                              <circle cx="8" cy="14" r="1.2"/>
                              <circle cx="2" cy="8" r="1.2"/>
                              <circle cx="14" cy="8" r="1.2"/>
                            </svg>
                          </div>
                          <div style={{
                            fontSize: '14px', color: 'var(--text-0)', lineHeight: 1.65,
                            paddingTop: '3px', maxWidth: 'calc(100% - 36px)',
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

                  {isSaving && (
                    <div style={{ fontSize: '12px', color: 'var(--text-3)', textAlign: 'center', padding: '2px 0' }}>
                      Saving check-in…
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: 'var(--border)' }} />

              {/* Input */}
              <div style={{
                display: 'flex', alignItems: 'flex-end', gap: '10px',
                padding: '12px 14px', background: 'var(--bg-1)',
              }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    streaming ? '' :
                    checkinSaved ? 'Reply to Locus…' :
                    'Share how you\'re doing…'
                  }
                  disabled={streaming || isSaving}
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
                    fontSize: '15px', fontWeight: 700, fontFamily: 'inherit',
                  }}
                >↑</button>
              </div>
            </div>

            {error && (
              <div style={{
                fontSize: '13px', color: '#c08060', marginTop: '10px',
                padding: '10px 14px', background: 'rgba(192,128,96,0.08)',
                border: '1px solid rgba(192,128,96,0.2)', borderRadius: '10px',
              }}>
                {error}
              </div>
            )}

            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '10px' }}>
              Enter to send · Shift+Enter for new line
            </div>

            {/* ── CTA: See daily insights — slides in after check-in is saved ── */}
            {checkinSaved && !showBrief && (
              <div
                ref={briefCTARef}
                style={{
                  marginTop: '16px', display: 'flex', gap: '10px',
                  animation: 'fadeUp 0.35s var(--ease) both',
                }}
              >
                <button
                  onClick={() => setShowBrief(true)}
                  style={{
                    flex: 1, background: 'var(--gold)', color: '#131110', border: 'none',
                    borderRadius: '10px', padding: '13px', fontSize: '13.5px', fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  See daily insights →
                </button>
                <button
                  onClick={handleRedo}
                  style={{
                    background: 'none', border: '1px solid var(--border-md)', color: 'var(--text-2)',
                    borderRadius: '10px', padding: '13px 16px', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                  }}
                >
                  ↺ Update
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── BRIEF — grows below, never displaces chat ── */}
        {showBrief && (
          <div style={{ marginTop: '12px' }}>
            <PostCheckinBrief memory={memory} />
          </div>
        )}

      </div>
    </div>
  )
}

/* ── Small components ── */

function SummaryTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: 'var(--bg-2)', borderRadius: '10px', padding: '12px 14px' }}>
      <div style={{
        fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase',
        letterSpacing: '0.07em', fontWeight: 600, marginBottom: '4px',
      }}>{label}</div>
      <div style={{
        fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 400,
        color: 'var(--text-0)', lineHeight: 1,
      }}>{value}</div>
      {sub && (
        <div style={{
          fontSize: '11px', color: 'var(--text-3)', marginTop: '3px',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{sub}</div>
      )}
    </div>
  )
}
