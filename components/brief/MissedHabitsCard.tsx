'use client'

import { useState, useEffect } from 'react'
import type { MissedHabit } from './HabitAuditStrip'

function auditKey(habitId: string, date: string) {
  return `locus_audit_${habitId}_${date}`
}

async function persistDismiss(habitId: string, auditDate: string) {
  try {
    await fetch('/api/habit-audit/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habitId, auditDate }),
    })
  } catch { /* non-fatal */ }
}

const BASE: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  overflow: 'hidden',
  aspectRatio: '1 / 1',
  padding: '16px',
}

export default function MissedHabitsCard({ missed, yesterday }: { missed: MissedHabit[]; yesterday: string }) {
  const [mounted, setMounted] = useState(false)
  const [gone, setGone] = useState<Set<string>>(new Set())
  const [reason, setReason] = useState('')
  const [aiReply, setAiReply] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const g = new Set<string>()
    missed.forEach(h => {
      try { if (sessionStorage.getItem(auditKey(h.id, yesterday)) === 'done') g.add(h.id) } catch { /* no-op */ }
    })
    setGone(g)
  }, [missed, yesterday])

  const pending = missed.filter(h => !gone.has(h.id))
  const current = pending[0] ?? null

  function dismiss(habitId: string) {
    try { sessionStorage.setItem(auditKey(habitId, yesterday), 'done') } catch { /* no-op */ }
    persistDismiss(habitId, yesterday)
    setGone(prev => new Set([...prev, habitId]))
    setReason('')
    setAiReply('')
    setSubmitted(false)
  }

  async function handleSubmit() {
    if (!reason.trim() || streaming || !current) return
    setStreaming(true)
    try {
      const res = await fetch('/api/habit-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habitId: current.id,
          habitName: current.name,
          habitEmoji: current.emoji,
          motivation: current.motivation,
          reason: reason.trim(),
          auditDate: yesterday,
        }),
      })
      if (!res.ok || !res.body) return
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      while (true) {
        const { done: d, value } = await reader.read()
        if (d) break
        setAiReply(prev => prev + dec.decode(value, { stream: true }))
      }
      setSubmitted(true)
      try { sessionStorage.setItem(auditKey(current.id, yesterday), 'done') } catch { /* no-op */ }
    } catch { /* non-fatal */ } finally {
      setStreaming(false)
    }
  }

  if (!mounted) return <div className="bento-card glass-card" style={BASE} />

  /* All dismissed */
  if (pending.length === 0) {
    return (
      <div className="bento-card glass-card" style={{ ...BASE, justifyContent: 'space-between' }}>
        <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--ink-400)' }}>Yesterday</span>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '50%',
            background: 'oklch(0.62 0.06 165 / 0.15)',
            border: '1.5px solid var(--sage)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="var(--sage)" strokeWidth="2" width="12" height="12">
              <path d="M3 8l3.5 3.5L13 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="font-serif-display" style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--ink-500)', textAlign: 'center' }}>
            All caught up
          </p>
        </div>
        <div />
      </div>
    )
  }

  const canSend = reason.trim().length > 0 && !streaming

  return (
    <div className="bento-card glass-card" style={BASE}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: 'rgb(210,130,80)',
            boxShadow: '0 0 7px rgba(210,130,80,0.7)',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgb(220,145,90)' }}>
            Missed
          </span>
          {pending.length > 1 && (
            <span style={{ fontSize: '10px', color: 'var(--ink-400)', fontWeight: 500 }}>· {pending.length} left</span>
          )}
        </div>
        <button
          onClick={() => dismiss(current.id)}
          style={{
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '50%', width: '22px', height: '22px',
            cursor: 'pointer', color: 'var(--ink-400)', fontSize: '14px', lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}
          title="Dismiss"
        >×</button>
      </div>

      {/* Habit identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{
          fontSize: '26px', flexShrink: 0,
          width: '42px', height: '42px',
          background: 'rgba(210,130,80,0.12)',
          border: '1px solid rgba(210,130,80,0.22)',
          borderRadius: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{current.emoji || '🔄'}</span>
        <div>
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink-900)', lineHeight: 1.2, margin: 0 }}>
            {current.name}
          </p>
          <p style={{ fontSize: '10px', color: 'rgb(210,130,80)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '2px 0 0' }}>
            missed yesterday
          </p>
        </div>
      </div>

      {/* Content area */}
      {submitted ? (
        <div style={{
          flex: 1,
          background: 'rgba(0,0,0,0.18)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '10px',
          padding: '10px 12px',
          overflow: 'hidden',
        }}>
          <p style={{
            fontSize: '12px', lineHeight: 1.6,
            color: 'var(--ink-900)', fontStyle: 'italic',
            display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            margin: 0,
          } as React.CSSProperties}>
            &ldquo;{aiReply.slice(0, 180)}{aiReply.length > 180 ? '…' : ''}&rdquo;
            {streaming && (
              <span style={{
                display: 'inline-block', width: '2px', height: '0.9em',
                background: 'var(--ink-400)', marginLeft: '2px', verticalAlign: 'middle',
                animation: 'statusPulse 0.9s ease-in-out infinite',
              }} />
            )}
          </p>
        </div>
      ) : (
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
          placeholder="What got in the way?"
          disabled={streaming}
          style={{
            flex: 1,
            background: 'rgba(0,0,0,0.22)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: '10px',
            padding: '10px 12px',
            fontSize: '12px',
            color: 'var(--ink-900)',
            fontFamily: 'inherit',
            resize: 'none',
            lineHeight: 1.5,
            outline: 'none',
            transition: 'border-color 0.15s',
          } as React.CSSProperties}
        />
      )}

      {/* CTA */}
      {submitted ? (
        <button
          onClick={() => dismiss(current.id)}
          style={{
            width: '100%',
            background: 'oklch(0.62 0.06 165 / 0.18)',
            border: '1px solid rgba(122,158,138,0.45)',
            borderRadius: '10px',
            padding: '9px',
            fontSize: '12px',
            color: 'var(--sage)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: 600,
            letterSpacing: '0.02em',
          }}
        >
          {pending.length > 1 ? 'Next →' : 'Done ✓'}
        </button>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={!canSend}
          style={{
            width: '100%',
            background: canSend ? 'var(--ink-900)' : 'rgba(255,255,255,0.07)',
            border: `1px solid ${canSend ? 'transparent' : 'rgba(255,255,255,0.10)'}`,
            borderRadius: '10px',
            padding: '9px',
            fontSize: '12px',
            fontWeight: 600,
            color: canSend ? 'var(--glass-card-bg)' : 'var(--ink-400)',
            cursor: canSend ? 'pointer' : 'default',
            fontFamily: 'inherit',
            transition: 'all 0.15s',
            letterSpacing: '0.02em',
          }}
        >
          {streaming ? '…' : 'Send'}
        </button>
      )}
    </div>
  )
}
