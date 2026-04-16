'use client'

import { useState, useRef, useTransition } from 'react'
import type { MemoryNote } from '@/lib/types'
import { createMemoryNote, resolveMemoryNote, deleteMemoryNote } from '@/app/actions/memory-notes'

// ── Type config ──────────────────────────────────────────────────────────────

const TYPE_META = {
  reminder: { label: 'Reminders',  color: '#d4a853', bg: 'rgba(212,168,83,0.10)',  icon: <ReminderIcon /> },
  idea:     { label: 'Ideas',      color: '#7a9e8a', bg: 'rgba(122,158,138,0.10)', icon: <IdeaIcon /> },
  resource: { label: 'Resources',  color: '#8a90b4', bg: 'rgba(138,144,180,0.10)', icon: <ResourceIcon /> },
}

// ── Shared actions ───────────────────────────────────────────────────────────

function NoteActions({ id, onResolve, onDelete }: { id: string; onResolve: () => void; onDelete: () => void }) {
  return (
    <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
      <button onClick={onResolve} title="Mark done" style={actionBtn}>
        <CheckIcon />
      </button>
      <button onClick={onDelete} title="Delete" style={{ ...actionBtn, color: 'var(--text-3)' }}>
        <TrashIcon />
      </button>
    </div>
  )
}

const actionBtn: React.CSSProperties = {
  width: '26px', height: '26px', borderRadius: '7px',
  border: '1px solid var(--border-md)', background: 'transparent',
  color: 'var(--text-2)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

// ── Reminder card ─────────────────────────────────────────────────────────────

function ReminderCard({ note, onResolve, onDelete }: { note: MemoryNote; onResolve: () => void; onDelete: () => void }) {
  const today = new Date().toISOString().split('T')[0]
  const daysUntil = note.trigger_date
    ? Math.ceil((new Date(note.trigger_date + 'T12:00:00').getTime() - new Date(today + 'T12:00:00').getTime()) / 86400000)
    : null

  const urgency = daysUntil !== null
    ? daysUntil <= 0 ? { label: 'Today', color: '#e05c4a' }
    : daysUntil === 1 ? { label: 'Tomorrow', color: '#d4a853' }
    : daysUntil <= 3 ? { label: `${daysUntil} days`, color: '#d4a853' }
    : { label: `${daysUntil} days`, color: 'var(--text-3)' }
    : null

  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px 14px', background: 'var(--bg-2)', borderRadius: '11px', border: '1px solid var(--border)' }}>
      {/* Date column */}
      {note.trigger_date ? (
        <div style={{ flexShrink: 0, textAlign: 'center', minWidth: '40px' }}>
          <div style={{ fontSize: '18px', fontFamily: 'var(--font-serif)', fontWeight: 500, color: urgency?.color ?? 'var(--text-0)', lineHeight: 1 }}>
            {new Date(note.trigger_date + 'T12:00:00').getDate()}
          </div>
          <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', marginTop: '2px' }}>
            {new Date(note.trigger_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })}
          </div>
        </div>
      ) : (
        <div style={{ flexShrink: 0, width: '40px' }} />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: '0 0 6px', fontSize: '13.5px', color: 'var(--text-0)', lineHeight: 1.5 }}>{note.content}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {urgency && (
            <span style={{ fontSize: '10px', fontWeight: 600, color: urgency.color }}>
              {urgency.label}
            </span>
          )}
          {note.ai_tags.map(tag => (
            <span key={tag} style={{ fontSize: '10px', color: 'var(--text-3)', background: 'var(--bg-3)', padding: '1px 6px', borderRadius: '4px' }}>{tag}</span>
          ))}
        </div>
      </div>

      <NoteActions id={note.id} onResolve={onResolve} onDelete={onDelete} />
    </div>
  )
}

// ── Idea card ─────────────────────────────────────────────────────────────────

function IdeaCard({ note, onResolve, onDelete }: { note: MemoryNote; onResolve: () => void; onDelete: () => void }) {
  return (
    <div style={{ background: 'var(--bg-2)', borderRadius: '11px', border: '1px solid var(--border)', padding: '13px 14px', display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', boxSizing: 'border-box' }}>
      <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-0)', lineHeight: 1.55, flex: 1 }}>{note.content}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {note.ai_tags.map(tag => (
            <span key={tag} style={{ fontSize: '10px', color: 'var(--sage)', background: 'rgba(122,158,138,0.1)', padding: '1px 6px', borderRadius: '4px' }}>{tag}</span>
          ))}
        </div>
        <NoteActions id={note.id} onResolve={onResolve} onDelete={onDelete} />
      </div>
    </div>
  )
}

// ── Resource card ─────────────────────────────────────────────────────────────

function ResourceCard({ note, onResolve, onDelete }: { note: MemoryNote; onResolve: () => void; onDelete: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', background: 'var(--bg-2)', borderRadius: '11px', border: '1px solid var(--border)' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(138,144,180,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#8a90b4' }}>
        <BookmarkIcon />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: '0 0 4px', fontSize: '13.5px', color: 'var(--text-0)', lineHeight: 1.4 }}>{note.content}</p>
        {note.ai_tags.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {note.ai_tags.map(tag => (
              <span key={tag} style={{ fontSize: '10px', color: '#8a90b4', background: 'rgba(138,144,180,0.1)', padding: '1px 6px', borderRadius: '4px' }}>{tag}</span>
            ))}
          </div>
        )}
      </div>
      <NoteActions id={note.id} onResolve={onResolve} onDelete={onDelete} />
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ type, count }: { type: MemoryNote['type']; count: number }) {
  const meta = TYPE_META[type]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
      <span style={{ color: meta.color, display: 'flex', alignItems: 'center' }}>{meta.icon}</span>
      <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: meta.color }}>
        {meta.label}
      </span>
      <span style={{ fontSize: '11px', color: 'var(--text-3)', background: 'var(--bg-3)', borderRadius: '10px', padding: '1px 7px' }}>
        {count}
      </span>
    </div>
  )
}

// ── Gallery ───────────────────────────────────────────────────────────────────

function Gallery({ notes, onResolve, onDelete }: {
  notes: MemoryNote[]
  onResolve: (id: string) => void
  onDelete: (id: string) => void
}) {
  const reminders = notes.filter(n => n.type === 'reminder')
    .sort((a, b) => {
      if (!a.trigger_date) return 1
      if (!b.trigger_date) return -1
      return a.trigger_date.localeCompare(b.trigger_date)
    })
  const ideas = notes.filter(n => n.type === 'idea')
  const resources = notes.filter(n => n.type === 'resource')

  if (notes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-3)' }}>
        <div style={{ fontSize: '30px', marginBottom: '12px', opacity: 0.35 }}>◎</div>
        <div style={{ fontSize: '14px' }}>Nothing captured yet.</div>
        <div style={{ fontSize: '12px', marginTop: '4px' }}>Type something above — a reminder, a resource, an idea.</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Reminders — sorted timeline */}
      {reminders.length > 0 && (
        <section>
          <SectionHeader type="reminder" count={reminders.length} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {reminders.map(note => (
              <ReminderCard
                key={note.id}
                note={note}
                onResolve={() => onResolve(note.id)}
                onDelete={() => onDelete(note.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Ideas — 2-col grid */}
      {ideas.length > 0 && (
        <section>
          <SectionHeader type="idea" count={ideas.length} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
            {ideas.map(note => (
              <IdeaCard
                key={note.id}
                note={note}
                onResolve={() => onResolve(note.id)}
                onDelete={() => onDelete(note.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Resources — compact list */}
      {resources.length > 0 && (
        <section>
          <SectionHeader type="resource" count={resources.length} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {resources.map(note => (
              <ResourceCard
                key={note.id}
                note={note}
                onResolve={() => onResolve(note.id)}
                onDelete={() => onDelete(note.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ── Composer ──────────────────────────────────────────────────────────────────

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
    <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px', marginBottom: '28px' }}>
      <textarea
        ref={taRef}
        value={text}
        onChange={e => { setText(e.target.value); setPreview(null) }}
        onKeyDown={handleKeyDown}
        placeholder={'Jot something down…\n\n"Submit the project proposal before Friday"\n"Scott\'s Cheap Flights is great for deals"\n"Try cold plunges for recovery"'}
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
        {preview && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: TYPE_META[preview.type].color, background: TYPE_META[preview.type].bg, padding: '2px 8px', borderRadius: '5px' }}>
              {TYPE_META[preview.type].label.slice(0, -1)}
            </span>
            {preview.trigger_date && (
              <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>
                {new Date(preview.trigger_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
            {preview.ai_tags.map(tag => (
              <span key={tag} style={{ fontSize: '10px', color: 'var(--text-3)', background: 'var(--bg-3)', padding: '2px 7px', borderRadius: '4px' }}>{tag}</span>
            ))}
          </div>
        )}
        <div style={{ marginLeft: preview ? undefined : 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>⌘↵</span>
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || loading}
            style={{
              padding: '8px 18px', borderRadius: '9px',
              background: text.trim() && !loading ? 'var(--gold)' : 'var(--bg-3)',
              color: text.trim() && !loading ? 'var(--bg-0)' : 'var(--text-3)',
              border: 'none', fontSize: '13px', fontWeight: 600,
              cursor: text.trim() && !loading ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s', minWidth: '80px',
            }}
          >
            {loading ? '…' : 'Capture'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

export default function CaptureView({ initialNotes }: { initialNotes: MemoryNote[] }) {
  const [notes, setNotes] = useState<MemoryNote[]>(initialNotes)

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

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '24px 20px 80px' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--gold) 0%, #a07830 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CaptureHeaderIcon />
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 400, color: 'var(--text-0)', margin: 0 }}>
            Capture
          </h1>
          {notes.length > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-3)' }}>
              {notes.length} active
            </span>
          )}
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: 0, lineHeight: 1.5 }}>
          Jot anything down — Locus will remember it and surface it when it's relevant.
        </p>
      </div>

      {/* Composer */}
      <Composer onAdded={handleAdded} />

      {/* Gallery */}
      <Gallery notes={notes} onResolve={handleResolve} onDelete={handleDelete} />
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function CaptureHeaderIcon() {
  return <svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="#131110" strokeWidth="1.3" strokeLinecap="round">
    <path d="M3 4h10M3 8h7M3 12h5"/><path d="M13 10l-1.5 4L10 12l-2 1 1-3 3-3 1 3z" strokeLinejoin="round"/>
  </svg>
}
function ReminderIcon() {
  return <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><rect x="1" y="2" width="12" height="11" rx="2"/><path d="M1 6h12M4 1v2M10 1v2"/></svg>
}
function IdeaIcon() {
  return <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="7" cy="6" r="4"/><path d="M5 10.5h4M5.5 12.5h3"/></svg>
}
function ResourceIcon() {
  return <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4H3a2 2 0 000 4h1M8 10h3a2 2 0 000-4h-1M5 7h4"/></svg>
}
function BookmarkIcon() {
  return <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 1h8v12L7 9.5 3 13V1z"/></svg>
}
function CheckIcon() {
  return <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l3 3 7-6"/></svg>
}
function TrashIcon() {
  return <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9"/></svg>
}
