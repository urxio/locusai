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
  justifyContent: 'space-between',
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

  /* SSR / pre-mount: render an inert placeholder so the grid stays stable */
  if (!mounted) {
    return <div className="bento-card glass-card-soft" style={BASE} />
  }

  /* All dismissed */
  if (pending.length === 0) {
    return (
      <div className="bento-card glass-card-soft" style={BASE}>
        <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--ink-400)' }}>Yesterday</span>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'oklch(0.62 0.06 165 / 0.20)',
            border: '1.5px solid var(--sage)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="var(--sage)" strokeWidth="2" width="12" height="12">
              <path d="M3 8l3.5 3.5L13 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="font-serif-display" style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--ink-500)', textAlign: 'center' }}>
            All caught up
          </p>
        </div>
        <div />
      </div>
    )
  }

  const canSend = reason.trim().length > 0 && !streaming

  return (
    <div className="bento-card glass-card-soft" style={BASE}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(210,130,80,0.9)', boxShadow: '0 0 6px rgba(210,130,80,0.55)', flexShrink: 0 }} />
          <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(210,130,80,0.85)' }}>
            Missed
          </span>
          {pending.length > 1 && (
            <span style={{ fontSize: '9px', color: 'var(--ink-400)', fontWeight: 500 }}>· {pending.length} left</span>
          )}
        </div>
        <button
          onClick={() => dismiss(current.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-400)', fontSize: '18px', lineHeight: 1, padding: '0 2px', display: 'flex', alignItems: 'center' }}
          title="Dismiss"
        >×</button>
      </div>

      {/* Habit identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '22px', flexShrink: 0 }}>{current.emoji || '🔄'}</span>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-900)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {current.name}
        </span>
      </div>

      {/* AI reply or textarea */}
      {submitted ? (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <p style={{
            fontSize: '11px', lineHeight: 1.5, color: 'var(--ink-500)', fontStyle: 'italic',
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          } as React.CSSProperties}>
            &ldquo;{aiReply.slice(0, 120)}{aiReply.length > 120 ? '…' : ''}&rdquo;
          </p>
        </div>
      ) : (
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
          placeholder="What got in the way?"
          rows={2}
          disabled={streaming}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.35)',
            border: '1px solid rgba(255,255,255,0.55)',
            borderRadius: '10px',
            padding: '7px 10px',
            fontSize: '11px',
            color: 'var(--ink-900)',
            fontFamily: 'inherit',
            resize: 'none',
            lineHeight: 1.4,
            outline: 'none',
            '::placeholder': { color: 'var(--ink-400)' },
          } as React.CSSProperties}
        />
      )}

      {/* CTA */}
      {submitted ? (
        <button
          onClick={() => dismiss(current.id)}
          style={{
            width: '100%',
            background: 'oklch(0.62 0.06 165 / 0.15)',
            border: '1px solid rgba(122,158,138,0.40)',
            borderRadius: '10px',
            padding: '7px',
            fontSize: '11px',
            color: 'var(--sage)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: 600,
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
            background: canSend ? 'var(--ink-900)' : 'rgba(255,255,255,0.30)',
            border: '1px solid rgba(255,255,255,0.45)',
            borderRadius: '10px',
            padding: '7px',
            fontSize: '11px',
            fontWeight: 600,
            color: canSend ? 'var(--glass-card-bg)' : 'var(--ink-400)',
            cursor: canSend ? 'pointer' : 'default',
            fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
        >
          {streaming ? '…' : 'Send'}
        </button>
      )}
    </div>
  )
}
