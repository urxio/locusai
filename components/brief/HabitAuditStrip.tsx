'use client'

import { useState, useEffect } from 'react'

export type MissedHabit = {
  id:         string
  name:       string
  emoji:      string
  motivation: string | null
}

type Props = {
  missed:    MissedHabit[]
  yesterday: string   // YYYY-MM-DD — passed from server so it matches DB dates
}

/* ── session storage key — fast local cache only ── */
function auditKey(habitId: string, date: string) {
  return `locus_audit_${habitId}_${date}`
}

/* ── persist dismissal to DB (cross-device) ── */
async function persistDismiss(habitId: string, auditDate: string) {
  try {
    await fetch('/api/habit-audit/dismiss', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ habitId, auditDate }),
    })
  } catch { /* non-fatal */ }
}

/* ── single audit card ───────────────────────────────── */

function AuditCard({ habit, yesterday }: { habit: MissedHabit; yesterday: string }) {
  const [reason,    setReason]    = useState('')
  const [aiReply,   setAiReply]   = useState('')
  const [streaming, setStreaming] = useState(false)
  const [done,      setDone]      = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Read sessionStorage only after mount to avoid SSR hydration mismatch
  useEffect(() => {
    try {
      if (sessionStorage.getItem(auditKey(habit.id, yesterday)) === 'done') setDismissed(true)
    } catch { /* no-op */ }
  }, [habit.id, yesterday])

  const dismiss = () => {
    try { sessionStorage.setItem(auditKey(habit.id, yesterday), 'done') } catch { /* no-op */ }
    persistDismiss(habit.id, yesterday)
    setDismissed(true)
  }

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

  if (dismissed) return null

  return (
    <div style={{
      background:    'var(--bg-1)',
      border:        '1px solid var(--border)',
      borderRadius:  '16px',
      padding:       '16px',
      animation:     'fadeUp 0.25s var(--ease) both',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <div style={{
          width:           '32px',
          height:          '32px',
          borderRadius:    '8px',
          background:      'rgba(192,112,80,0.12)',
          border:          '1px solid rgba(192,112,80,0.2)',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          fontSize:        '16px',
          flexShrink:      0,
        }}>
          {habit.emoji}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-0)' }}>
            {habit.name}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '1px' }}>
            missed yesterday
          </div>
        </div>
        <button
          onClick={dismiss}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-3)', fontSize: '18px', lineHeight: 1,
            padding: '2px 4px',
          }}
          title="Dismiss"
        >×</button>
      </div>

      {/* Motivation pill */}
      {habit.motivation && !done && (
        <div style={{
          fontSize:      '11px',
          color:         'var(--text-3)',
          fontStyle:     'italic',
          marginBottom:  '10px',
          padding:       '6px 10px',
          background:    'var(--bg-2)',
          borderRadius:  '8px',
          borderLeft:    '2px solid var(--gold)',
        }}>
          Your why: &ldquo;{habit.motivation}&rdquo;
        </div>
      )}

      {/* AI response */}
      {aiReply && (
        <div style={{
          fontFamily:    'var(--font-serif)',
          fontSize:      '14px',
          fontWeight:    300,
          color:         'var(--ai-card-text)',
          lineHeight:    1.65,
          marginBottom:  '12px',
          padding:       '10px 13px',
          background:    'var(--ai-card-bg)',
          borderRadius:  '10px',
          border:        '1px solid rgba(212,168,83,0.12)',
          animation:     'fadeUp 0.2s var(--ease) both',
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

      {/* Input + button */}
      {!done && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
            placeholder="What got in the way?"
            rows={1}
            disabled={streaming}
            style={{
              flex:        1,
              background:  'var(--bg-2)',
              border:      '1px solid var(--border)',
              borderRadius:'10px',
              padding:     '9px 12px',
              fontSize:    '13px',
              color:       'var(--text-0)',
              fontFamily:  'inherit',
              resize:      'none',
              lineHeight:  1.4,
              outline:     'none',
            }}
          />
          <button
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

      {/* Done state */}
      {done && !streaming && (
        <button
          onClick={dismiss}
          style={{
            width:        '100%',
            marginTop:    '4px',
            background:   'none',
            border:       '1px solid var(--border)',
            borderRadius: '10px',
            padding:      '8px',
            fontSize:     '12px',
            color:        'var(--text-3)',
            cursor:       'pointer',
            fontFamily:   'inherit',
          }}
        >
          Got it ✓
        </button>
      )}
    </div>
  )
}

/* ── main section ────────────────────────────────────── */

export default function HabitAuditStrip({ missed, yesterday }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Before mount, render nothing to avoid SSR/client sessionStorage mismatch
  if (!mounted) return null

  // Filter out habits already dismissed in this session (local cache)
  const pending = missed.filter(h => {
    try { return sessionStorage.getItem(auditKey(h.id, yesterday)) !== 'done' } catch { return true }
  })

  if (pending.length === 0) return null

  return (
    <div style={{ marginBottom: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
        <span style={{
          fontSize:      '10px',
          fontWeight:    700,
          color:         'var(--text-3)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          Yesterday&apos;s misses
        </span>
        <div style={{
          width: '5px', height: '5px', borderRadius: '50%',
          background: 'rgba(192,112,80,0.7)',
          boxShadow:  '0 0 5px rgba(192,112,80,0.5)',
        }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {pending.map(h => (
          <AuditCard key={h.id} habit={h} yesterday={yesterday} />
        ))}
      </div>
    </div>
  )
}
