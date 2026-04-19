'use client'

import { useState, useEffect, useRef } from 'react'

export type MissedHabit = {
  id:         string
  name:       string
  emoji:      string
  motivation: string | null
}

type Props = {
  missed:    MissedHabit[]
  yesterday: string   // YYYY-MM-DD
}

function auditKey(habitId: string, date: string) {
  return `locus_audit_${habitId}_${date}`
}

async function persistDismiss(habitId: string, auditDate: string) {
  try {
    await fetch('/api/habit-audit/dismiss', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ habitId, auditDate }),
    })
  } catch { /* non-fatal */ }
}

/* ── Card body (input + AI reply) ────────────────────── */

function CardBody({
  habit, yesterday, onDone,
}: {
  habit: MissedHabit
  yesterday: string
  onDone: () => void
}) {
  const [reason,    setReason]    = useState('')
  const [aiReply,   setAiReply]   = useState('')
  const [streaming, setStreaming] = useState(false)
  const [done,      setDone]      = useState(false)

  const handleSubmit = async () => {
    if (!reason.trim() || streaming) return
    setStreaming(true)
    try {
      const res = await fetch('/api/habit-audit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          habitId:    habit.id,
          habitName:  habit.name,
          habitEmoji: habit.emoji,
          motivation: habit.motivation,
          reason:     reason.trim(),
          auditDate:  yesterday,
        }),
      })
      if (!res.ok || !res.body) return
      const reader = res.body.getReader()
      const dec    = new TextDecoder()
      while (true) {
        const { done: d, value } = await reader.read()
        if (d) break
        setAiReply(prev => prev + dec.decode(value, { stream: true }))
      }
      setDone(true)
      try { sessionStorage.setItem(auditKey(habit.id, yesterday), 'done') } catch { /* no-op */ }
    } catch { /* non-fatal */ } finally {
      setStreaming(false)
    }
  }

  return (
    <div style={{ padding: '14px 18px 18px' }}>
      {/* Motivation quote */}
      {habit.motivation && !done && (
        <div style={{
          fontSize:     '12px',
          color:        'var(--text-3)',
          fontStyle:    'italic',
          marginBottom: '14px',
          padding:      '8px 12px',
          background:   'rgba(212,168,83,0.05)',
          borderRadius: '8px',
          borderLeft:   '2px solid rgba(212,168,83,0.35)',
          lineHeight:   1.55,
        }}>
          &ldquo;{habit.motivation}&rdquo;
        </div>
      )}

      {/* AI reply stream */}
      {aiReply && (
        <div style={{
          fontFamily:   'var(--font-serif)',
          fontSize:     '14px',
          fontWeight:   300,
          color:        'var(--ai-card-text)',
          lineHeight:   1.65,
          marginBottom: '12px',
          padding:      '10px 13px',
          background:   'var(--ai-card-bg)',
          borderRadius: '10px',
          border:       '1px solid rgba(212,168,83,0.12)',
          animation:    'fadeUp 0.2s var(--ease) both',
        }}>
          {aiReply}
          {streaming && (
            <span style={{
              display:       'inline-block',
              width:         '2px',
              height:        '1em',
              background:    'var(--gold)',
              marginLeft:    '2px',
              verticalAlign: 'middle',
              animation:     'statusPulse 0.9s ease-in-out infinite',
            }} />
          )}
        </div>
      )}

      {/* Input row */}
      {!done && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
            onPointerDown={e => e.stopPropagation()}   /* don't let typing start a drag */
            placeholder="What got in the way?"
            rows={1}
            disabled={streaming}
            style={{
              flex:         1,
              background:   'var(--bg-3)',
              border:       '1px solid var(--border)',
              borderRadius: '10px',
              padding:      '9px 12px',
              fontSize:     '13px',
              color:        'var(--text-0)',
              fontFamily:   'inherit',
              resize:       'none',
              lineHeight:   1.4,
              outline:      'none',
            }}
          />
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={handleSubmit}
            disabled={!reason.trim() || streaming}
            style={{
              background:   reason.trim() && !streaming ? 'var(--gold)' : 'var(--bg-3)',
              border:       '1px solid var(--border)',
              borderRadius: '10px',
              padding:      '9px 16px',
              fontSize:     '13px',
              fontWeight:   600,
              color:        reason.trim() && !streaming ? '#131110' : 'var(--text-3)',
              cursor:       reason.trim() && !streaming ? 'pointer' : 'default',
              fontFamily:   'inherit',
              transition:   'all 0.15s',
              flexShrink:   0,
            }}
          >
            {streaming ? '…' : 'Send'}
          </button>
        </div>
      )}

      {/* Done CTA */}
      {done && !streaming && (
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={onDone}
          style={{
            width:          '100%',
            marginTop:      '4px',
            background:     'rgba(122,158,138,0.08)',
            border:         '1px solid rgba(122,158,138,0.25)',
            borderRadius:   '10px',
            padding:        '9px',
            fontSize:       '13px',
            color:          'var(--sage)',
            cursor:         'pointer',
            fontFamily:     'inherit',
            fontWeight:     600,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            '6px',
          }}
        >
          ✓ Got it — next
        </button>
      )}
    </div>
  )
}

/* ── Main: swipeable card stack ──────────────────────── */

export default function HabitAuditStrip({ missed, yesterday }: Props) {
  const [mounted,  setMounted]  = useState(false)
  const [gone,     setGone]     = useState<Set<string>>(new Set())
  const [dragX,    setDragX]    = useState(0)
  const [dragging, setDragging] = useState(false)
  const [exiting,  setExiting]  = useState<'left' | 'right' | null>(null)
  const startX = useRef(0)

  useEffect(() => {
    setMounted(true)
    const g = new Set<string>()
    missed.forEach(h => {
      try { if (sessionStorage.getItem(auditKey(h.id, yesterday)) === 'done') g.add(h.id) } catch { /* no-op */ }
    })
    setGone(g)
  }, [missed, yesterday])

  const pending = missed.filter(h => !gone.has(h.id))

  const dismiss = (habitId: string) => {
    try { sessionStorage.setItem(auditKey(habitId, yesterday), 'done') } catch { /* no-op */ }
    persistDismiss(habitId, yesterday)
    setGone(prev => new Set([...prev, habitId]))
    setDragX(0)
    setExiting(null)
  }

  const triggerSwipe = (dir: 'left' | 'right') => {
    setExiting(dir)
    setTimeout(() => { if (pending.length > 0) dismiss(pending[0].id) }, 280)
  }

  /* ── Pointer drag (header only) ── */
  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX
    setDragging(true)
    setExiting(null)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return
    setDragX(e.clientX - startX.current)
  }
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging) return
    setDragging(false)
    const dx = e.clientX - startX.current
    if (Math.abs(dx) > 80) triggerSwipe(dx < 0 ? 'left' : 'right')
    else setDragX(0)
  }

  if (!mounted || pending.length === 0) return null

  const top          = pending[0]
  const swipeFrac    = Math.min(1, Math.abs(dragX) / 70)
  const isLeft       = dragX < -10
  const isRight      = dragX > 10

  const cardTransform = exiting
    ? `translateX(${exiting === 'left' ? -560 : 560}px) rotate(${exiting === 'left' ? -20 : 20}deg)`
    : `translateX(${dragX}px) rotate(${dragX * 0.04}deg)`

  const cardTransition = exiting
    ? 'transform 0.28s cubic-bezier(0.4,0,1,1)'
    : dragging
    ? 'none'
    : 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)'

  return (
    <div style={{ marginBottom: '24px', animation: 'fadeUp 0.3s var(--ease) both' }}>

      {/* Section label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <div style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: 'rgba(192,112,80,0.9)',
          boxShadow:  '0 0 8px rgba(192,112,80,0.55)',
          flexShrink: 0,
        }} />
        <span style={{
          fontSize:      '11px',
          fontWeight:    700,
          color:         'var(--text-2)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          Yesterday&apos;s misses
        </span>
        {pending.length > 1 && (
          <span style={{
            marginLeft:  'auto',
            fontSize:    '11px',
            color:       'var(--text-3)',
            fontWeight:  600,
          }}>
            {pending.length} left
          </span>
        )}
      </div>

      {/* Card stack */}
      <div style={{ position: 'relative' }}>

        {/* Top card */}
        <div style={{
          position:   'relative',
          zIndex:     3,
          background: 'var(--bg-1)',
          border:     '1px solid var(--border-md)',
          borderRadius: '18px',
          boxShadow:  '0 6px 32px rgba(0,0,0,0.28)',
          transform:  cardTransform,
          transition: cardTransition,
          overflow:   'hidden',
        }}>
          {/* Swipe overlay tints */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '18px', pointerEvents: 'none', zIndex: 10,
            background: 'rgba(200,80,60,0.1)',
            opacity: isLeft ? swipeFrac : 0,
            transition: 'opacity 0.1s',
          }} />
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '18px', pointerEvents: 'none', zIndex: 10,
            background: 'rgba(122,158,138,0.1)',
            opacity: isRight ? swipeFrac : 0,
            transition: 'opacity 0.1s',
          }} />

          {/* SKIP badge */}
          <div style={{
            position: 'absolute', top: '16px', left: '16px', zIndex: 11,
            opacity: isLeft ? swipeFrac : 0, transition: 'opacity 0.1s', pointerEvents: 'none',
          }}>
            <span style={{
              fontSize: '10px', fontWeight: 800, color: '#e07060',
              letterSpacing: '0.1em', textTransform: 'uppercase',
              border: '2px solid #e07060', borderRadius: '6px', padding: '2px 8px',
            }}>Skip</span>
          </div>

          {/* DONE badge */}
          <div style={{
            position: 'absolute', top: '16px', right: '16px', zIndex: 11,
            opacity: isRight ? swipeFrac : 0, transition: 'opacity 0.1s', pointerEvents: 'none',
          }}>
            <span style={{
              fontSize: '10px', fontWeight: 800, color: 'var(--sage)',
              letterSpacing: '0.1em', textTransform: 'uppercase',
              border: '2px solid var(--sage)', borderRadius: '6px', padding: '2px 8px',
            }}>Done</span>
          </div>

          {/* Drag handle: header */}
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{
              padding:       '18px 18px 14px',
              display:       'flex',
              alignItems:    'center',
              gap:           '12px',
              borderBottom:  '1px solid var(--border)',
              userSelect:    'none',
              cursor:        dragging ? 'grabbing' : 'grab',
            }}
          >
            {/* Emoji avatar */}
            <div style={{
              width:          '48px',
              height:         '48px',
              borderRadius:   '14px',
              background:     'rgba(192,112,80,0.1)',
              border:         '1px solid rgba(192,112,80,0.25)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       '24px',
              flexShrink:     0,
            }}>
              {top.emoji}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-0)', marginBottom: '3px' }}>
                {top.name}
              </div>
              <div style={{
                fontSize:      '10.5px',
                color:         'rgba(192,112,80,0.85)',
                fontWeight:    700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}>
                missed yesterday
              </div>
            </div>

            {/* Dismiss × */}
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={() => dismiss(top.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-3)', fontSize: '22px', lineHeight: 1,
                padding: '4px 6px', flexShrink: 0,
              }}
              title="Dismiss"
            >×</button>
          </div>

          {/* Card body — keyed so state resets on card change */}
          <CardBody key={top.id} habit={top} yesterday={yesterday} onDone={() => dismiss(top.id)} />
        </div>

        {/* Peek strip: card 2 */}
        {pending.length >= 2 && (
          <div style={{
            height:       '14px',
            margin:       '-6px 10px 0',
            background:   'var(--bg-2)',
            border:       '1px solid var(--border)',
            borderTop:    'none',
            borderRadius: '0 0 16px 16px',
            position:     'relative',
            zIndex:       2,
            opacity:      0.85,
          }} />
        )}

        {/* Peek strip: card 3 */}
        {pending.length >= 3 && (
          <div style={{
            height:       '10px',
            margin:       '-4px 22px 0',
            background:   'var(--bg-2)',
            border:       '1px solid var(--border)',
            borderTop:    'none',
            borderRadius: '0 0 14px 14px',
            position:     'relative',
            zIndex:       1,
            opacity:      0.55,
          }} />
        )}
      </div>

      {/* Progress dots */}
      {pending.length > 1 && (
        <div style={{
          display:        'flex',
          justifyContent: 'center',
          gap:            '5px',
          marginTop:      '14px',
        }}>
          {pending.map((_, i) => (
            <div key={i} style={{
              width:        i === 0 ? '18px' : '6px',
              height:       '6px',
              borderRadius: '3px',
              background:   i === 0 ? 'rgba(192,112,80,0.8)' : 'var(--bg-4)',
              transition:   'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
            }} />
          ))}
        </div>
      )}

      {/* Swipe hint — shown only when there are multiple cards */}
      {pending.length > 1 && !dragging && dragX === 0 && (
        <div style={{
          textAlign:     'center',
          marginTop:     '8px',
          fontSize:      '10.5px',
          color:         'var(--text-3)',
          letterSpacing: '0.03em',
        }}>
          drag to skip · {pending.length - 1} more behind
        </div>
      )}
    </div>
  )
}
