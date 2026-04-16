'use client'

import { useState, useRef, useTransition } from 'react'
import type { MemoryNote } from '@/lib/types'
import { createMemoryNote, resolveMemoryNote, deleteMemoryNote } from '@/app/actions/memory-notes'

// ── Type config ─────────────────────────────────────────────────────────────

const TYPE_META: Record<MemoryNote['type'], { label: string; color: string; bg: string; desc: string }> = {
  reminder: { label: 'Reminder',  color: '#d4a853', bg: 'rgba(212,168,83,0.12)',  desc: 'Date-based — will surface before the date' },
  idea:     { label: 'Idea',      color: '#7a9e8a', bg: 'rgba(122,158,138,0.12)', desc: 'Topic-based — will surface when relevant' },
  resource: { label: 'Resource',  color: '#8a90b4', bg: 'rgba(138,144,180,0.12)', desc: 'Tool or link — will surface when you mention it' },
}

// ── Note card ────────────────────────────────────────────────────────────────

function NoteCard({ note, onResolve, onDelete }: {
  note: MemoryNote
  onResolve: (id: string) => void
  onDelete: (id: string) => void
}) {
  const meta = TYPE_META[note.type]
  const dateStr = note.trigger_date
    ? new Date(note.trigger_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null
  const created = new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const [deleting, setDeleting] = useState(false)

  return (
    <div style={{
      background: 'var(--bg-1)',
      border: `1px solid var(--border)`,
      borderLeft: `3px solid ${meta.color}`,
      borderRadius: '12px',
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      transition: 'opacity 0.2s',
      opacity: deleting ? 0.4 : 1,
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-0)', lineHeight: 1.5 }}>
            {note.content}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button
            onClick={() => { setDeleting(true); onResolve(note.id) }}
            title="Mark done"
            style={{ width: '28px', height: '28px', borderRadius: '7px', border: '1px solid var(--border-md)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <CheckIcon />
          </button>
          <button
            onClick={() => { setDeleting(true); onDelete(note.id) }}
            title="Delete"
            style={{ width: '28px', height: '28px', borderRadius: '7px', border: '1px solid var(--border-md)', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: meta.color, background: meta.bg, padding: '2px 8px', borderRadius: '5px' }}>
          {meta.label}
        </span>
        {dateStr && (
          <span style={{ fontSize: '11px', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CalIcon />
            {dateStr}
          </span>
        )}
        {note.ai_tags.length > 0 && note.ai_tags.map(tag => (
          <span key={tag} style={{ fontSize: '10px', color: 'var(--text-3)', background: 'var(--bg-3)', padding: '2px 7px', borderRadius: '4px' }}>
            {tag}
          </span>
        ))}
        <span style={{ fontSize: '10px', color: 'var(--text-3)', marginLeft: 'auto' }}>{created}</span>
      </div>
    </div>
  )
}

// ── Composer ─────────────────────────────────────────────────────────────────

function Composer({ onAdded }: { onAdded: (note: MemoryNote) => void }) {
  const [text, setText] = useState('')
  const [classifying, setClassifying] = useState(false)
  const [preview, setPreview] = useState<{ type: MemoryNote['type']; trigger_date: string | null; ai_tags: string[] } | null>(null)
  const [saving, startSave] = useTransition()
  const taRef = useRef<HTMLTextAreaElement>(null)

  async function handleSubmit() {
    if (!text.trim() || classifying || saving) return

    setClassifying(true)
    let classified = { type: 'idea' as MemoryNote['type'], trigger_date: null as string | null, ai_tags: [] as string[] }

    try {
      const res = await fetch('/api/memory-notes/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text.trim() }),
      })
      classified = await res.json()
      setPreview(classified)
    } catch {
      // fallback: proceed with default
    } finally {
      setClassifying(false)
    }

    startSave(async () => {
      const note = await createMemoryNote(
        text.trim(),
        classified.type,
        classified.trigger_date,
        classified.ai_tags
      )
      if (note) {
        onAdded(note)
        setText('')
        setPreview(null)
        taRef.current?.focus()
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  const loading = classifying || saving

  return (
    <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px', marginBottom: '24px' }}>
      <textarea
        ref={taRef}
        value={text}
        onChange={e => { setText(e.target.value); setPreview(null) }}
        onKeyDown={handleKeyDown}
        placeholder={'Jot something down…\n\n"Buy Sarah a birthday gift — her birthday is May 3"\n"Scott\'s Cheap Flights is great for deals"\n"Try cold plunges for recovery"'}
        rows={4}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          resize: 'none',
          fontSize: '14px',
          color: 'var(--text-0)',
          lineHeight: 1.6,
          fontFamily: 'var(--font-sans)',
          boxSizing: 'border-box',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
        {/* Preview badge */}
        {preview && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: TYPE_META[preview.type].color, background: TYPE_META[preview.type].bg, padding: '2px 8px', borderRadius: '5px' }}>
              {TYPE_META[preview.type].label}
            </span>
            {preview.trigger_date && (
              <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>
                {new Date(preview.trigger_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
            {preview.ai_tags.map(tag => (
              <span key={tag} style={{ fontSize: '10px', color: 'var(--text-3)', background: 'var(--bg-3)', padding: '2px 7px', borderRadius: '4px' }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        <div style={{ marginLeft: preview ? undefined : 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>⌘↵</span>
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || loading}
            style={{
              padding: '8px 18px',
              borderRadius: '9px',
              background: text.trim() && !loading ? 'var(--gold)' : 'var(--bg-3)',
              color: text.trim() && !loading ? 'var(--bg-0)' : 'var(--text-3)',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: text.trim() && !loading ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
              minWidth: '80px',
            }}
          >
            {loading ? '…' : 'Capture'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main view ────────────────────────────────────────────────────────────────

export default function CaptureView({ initialNotes }: { initialNotes: MemoryNote[] }) {
  const [notes, setNotes] = useState<MemoryNote[]>(initialNotes)
  const [filter, setFilter] = useState<'all' | MemoryNote['type']>('all')

  function handleAdded(note: MemoryNote) {
    setNotes(prev => [note, ...prev])
  }

  function handleResolve(id: string) {
    resolveMemoryNote(id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  function handleDelete(id: string) {
    deleteMemoryNote(id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  const filtered = filter === 'all' ? notes : notes.filter(n => n.type === filter)

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '24px 20px 80px' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--gold) 0%, #a07830 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CaptureIcon />
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 400, color: 'var(--text-0)', margin: 0 }}>
            Capture
          </h1>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: 0, lineHeight: 1.5 }}>
          Jot anything down — Locus will remember it and surface it when it's relevant.
        </p>
      </div>

      {/* Composer */}
      <Composer onAdded={handleAdded} />

      {/* Filter tabs */}
      {notes.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
          {(['all', 'reminder', 'idea', 'resource'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '5px 12px',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: filter === f ? 'var(--gold)' : 'var(--border-md)',
              background: filter === f ? 'var(--gold-dim, rgba(212,168,83,0.12))' : 'transparent',
              color: filter === f ? 'var(--gold)' : 'var(--text-2)',
              fontSize: '12px',
              fontWeight: filter === f ? 600 : 400,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}>
              {f === 'all' ? `All (${notes.length})` : f}
            </button>
          ))}
        </div>
      )}

      {/* Notes list */}
      {filtered.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              onResolve={handleResolve}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-3)' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.4 }}>◎</div>
          <div style={{ fontSize: '14px' }}>Nothing captured yet.</div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>Type something above — a reminder, a resource, an idea.</div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-3)', fontSize: '13px' }}>
          No {filter}s captured.
        </div>
      )}
    </div>
  )
}

// ── Icons ────────────────────────────────────────────────────────────────────

function CaptureIcon() {
  return <svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="#131110" strokeWidth="1.3" strokeLinecap="round">
    <path d="M3 4h10M3 8h7M3 12h5"/><path d="M13 10l-1.5 4L10 12l-2 1 1-3 3-3 1 3z" strokeLinejoin="round"/>
  </svg>
}
function CheckIcon() {
  return <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l3 3 7-6"/></svg>
}
function TrashIcon() {
  return <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9"/></svg>
}
function CalIcon() {
  return <svg viewBox="0 0 14 14" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><rect x="1" y="2" width="12" height="11" rx="2"/><path d="M1 6h12M4 1v2M10 1v2"/></svg>
}
