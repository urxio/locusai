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

// ── URL helpers ───────────────────────────────────────────────────────────────

const URL_RE = /https?:\/\/[^\s]+/g

function extractUrls(text: string): string[] {
  return Array.from(new Set(text.match(URL_RE) ?? []))
}

function renderWithLinks(text: string) {
  const parts = text.split(URL_RE)
  const urls = text.match(URL_RE) ?? []
  return parts.reduce<React.ReactNode[]>((acc, part, i) => {
    acc.push(part)
    if (urls[i]) {
      acc.push(
        <a key={i} href={urls[i]} target="_blank" rel="noopener noreferrer"
          style={{ color: '#8a90b4', textDecoration: 'underline', textUnderlineOffset: '2px', wordBreak: 'break-all' }}>
          {urls[i]}
        </a>
      )
    }
    return acc
  }, [])
}

function UrlPill({ url }: { url: string }) {
  let display = url
  try { display = new URL(url).hostname.replace(/^www\./, '') } catch {}
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#8a90b4', background: 'rgba(138,144,180,0.12)', border: '1px solid rgba(138,144,180,0.2)', borderRadius: '6px', padding: '3px 8px', textDecoration: 'none', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
    >
      <LinkIcon />
      {display}
    </a>
  )
}

// ── Resource card ─────────────────────────────────────────────────────────────

function ResourceCard({ note, onResolve, onDelete }: { note: MemoryNote; onResolve: () => void; onDelete: () => void }) {
  const urls = extractUrls(note.content)
  const textWithoutUrls = note.content.replace(URL_RE, '').trim()

  return (
    <div style={{ padding: '13px 14px', background: 'var(--bg-2)', borderRadius: '11px', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(138,144,180,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#8a90b4' }}>
          <BookmarkIcon />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {textWithoutUrls && (
            <p style={{ margin: '0 0 8px', fontSize: '13.5px', color: 'var(--text-0)', lineHeight: 1.4 }}>
              {textWithoutUrls}
            </p>
          )}
          {urls.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: note.ai_tags.length ? '8px' : 0 }}>
              {urls.map(url => <UrlPill key={url} url={url} />)}
            </div>
          )}
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
  type Classified = { type: MemoryNote['type']; trigger_date: string | null; ai_tags: string[]; clarifying_question: string | null }

  const [text, setText] = useState('')
  const [classifying, setClassifying] = useState(false)
  const [classified, setClassified] = useState<Classified | null>(null)
  // When AI asks for clarification — user answers here before saving
  const [clarifyAnswer, setClarifyAnswer] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, startSave] = useTransition()
  const taRef = useRef<HTMLTextAreaElement>(null)
  const clarifyRef = useRef<HTMLInputElement>(null)

  const waitingForClarification = !!classified?.clarifying_question

  async function classify(content: string): Promise<Classified> {
    const res = await fetch('/api/memory-notes/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    const result: Classified = await res.json()
    // Always force resource if content contains a URL
    if (/https?:\/\/[^\s]+/.test(content)) result.type = 'resource'
    return result
  }

  async function handleSubmit() {
    if (!text.trim() || classifying || saving) return
    setError(null)

    // If we already have classification and are waiting for a clarify answer,
    // save immediately with the enriched content
    if (waitingForClarification) {
      const enriched = clarifyAnswer.trim()
        ? `${text.trim()} — ${clarifyAnswer.trim()}`
        : text.trim()
      await save(enriched, classified!)
      return
    }

    setClassifying(true)
    let result: Classified = { type: 'idea', trigger_date: null, ai_tags: [], clarifying_question: null }
    try {
      result = await classify(text.trim())
      setClassified(result)
      // If a question was returned, pause and let the user answer
      if (result.clarifying_question) {
        setTimeout(() => clarifyRef.current?.focus(), 50)
        return
      }
    } catch {
      // fallback
    } finally {
      setClassifying(false)
    }

    await save(text.trim(), result)
  }

  async function save(content: string, meta: Classified) {
    startSave(async () => {
      try {
        const note = await createMemoryNote(content, meta.type, meta.trigger_date, meta.ai_tags)
        if (note) {
          onAdded(note)
          setText('')
          setClassified(null)
          setClarifyAnswer('')
          taRef.current?.focus()
        } else {
          setError('Failed to save — make sure the memory_notes table has been created in Supabase.')
        }
      } catch (e) {
        setError('Something went wrong. Check the console for details.')
        console.error('createMemoryNote error:', e)
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  function handleSkipClarification() {
    if (!classified) return
    save(text.trim(), { ...classified, clarifying_question: null })
  }

  const loading = classifying || saving

  return (
    <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px', marginBottom: '28px' }}>
      <textarea
        ref={taRef}
        value={text}
        onChange={e => { setText(e.target.value); setClassified(null); setClarifyAnswer('') }}
        onKeyDown={handleKeyDown}
        placeholder={'Jot something down…\n\n"Submit the project proposal before Friday"\n"Scott\'s Cheap Flights is great for deals"\n"Try cold plunges for recovery"'}
        rows={4}
        style={{
          width: '100%', background: 'transparent', border: 'none', outline: 'none',
          resize: 'none', fontSize: '14px', color: 'var(--text-0)', lineHeight: 1.6,
          fontFamily: 'var(--font-sans)', boxSizing: 'border-box',
        }}
      />

      {/* Clarification prompt */}
      {waitingForClarification && (
        <div style={{ margin: '10px 0 4px', padding: '12px 14px', background: 'var(--bg-2)', borderRadius: '10px', border: '1px solid color-mix(in srgb, var(--gold) 30%, var(--border))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <svg viewBox="0 0 12 12" width="11" height="11" fill="var(--gold)"><circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="1.5" r="1"/><circle cx="6" cy="10.5" r="1"/><circle cx="1.5" cy="6" r="1"/><circle cx="10.5" cy="6" r="1"/></svg>
            <span style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Locus needs a bit more</span>
          </div>
          <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--text-1)' }}>{classified!.clarifying_question}</p>
          <input
            ref={clarifyRef}
            value={clarifyAnswer}
            onChange={e => setClarifyAnswer(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit() } }}
            placeholder="type your answer…"
            style={{
              width: '100%', background: 'var(--bg-1)', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '7px 10px', fontSize: '13px',
              color: 'var(--text-0)', outline: 'none', boxSizing: 'border-box',
              fontFamily: 'var(--font-sans)',
            }}
          />
          <button onClick={handleSkipClarification} style={{ marginTop: '6px', background: 'none', border: 'none', fontSize: '11px', color: 'var(--text-3)', cursor: 'pointer', padding: 0 }}>
            skip and save as-is
          </button>
        </div>
      )}

      {error && (
        <div style={{ margin: '8px 0 0', fontSize: '12px', color: '#e05c4a', background: 'rgba(224,92,74,0.08)', border: '1px solid rgba(224,92,74,0.2)', borderRadius: '8px', padding: '8px 12px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
        {/* Classification preview (when no question) */}
        {classified && !waitingForClarification && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: TYPE_META[classified.type].color, background: TYPE_META[classified.type].bg, padding: '2px 8px', borderRadius: '5px' }}>
              {TYPE_META[classified.type].label.slice(0, -1)}
            </span>
            {classified.trigger_date && (
              <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>
                {new Date(classified.trigger_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
            {classified.ai_tags.map(tag => (
              <span key={tag} style={{ fontSize: '10px', color: 'var(--text-3)', background: 'var(--bg-3)', padding: '2px 7px', borderRadius: '4px' }}>{tag}</span>
            ))}
          </div>
        )}
        <div style={{ marginLeft: classified && !waitingForClarification ? undefined : 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!waitingForClarification && <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>⌘↵</span>}
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
            {loading ? '…' : waitingForClarification ? 'Save' : 'Capture'}
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
function LinkIcon() {
  return <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 6.5a2.5 2.5 0 003.5 0l1.5-1.5a2.5 2.5 0 00-3.5-3.5L5.5 3"/><path d="M7 5.5a2.5 2.5 0 00-3.5 0L2 7a2.5 2.5 0 003.5 3.5L6.5 9"/></svg>
}
function CheckIcon() {
  return <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l3 3 7-6"/></svg>
}
function TrashIcon() {
  return <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9"/></svg>
}
