'use client'

import { useState, useRef, useTransition } from 'react'
import Link from 'next/link'
import type { MemoryNote } from '@/lib/types'
import { createMemoryNote, resolveMemoryNote, deleteMemoryNote } from '@/app/actions/memory-notes'
import { useToast } from '@/components/ui/ToastContext'

// ── Type config ───────────────────────────────────────────────────────────────

const TYPE_META = {
  reminder: { label: 'Reminders', color: '#d4a853', bg: 'rgba(212,168,83,0.12)', icon: <ClockIcon /> },
  idea:     { label: 'Ideas',     color: '#7a9e8a', bg: 'rgba(122,158,138,0.12)', icon: <LightbulbIcon /> },
  resource: { label: 'Resources', color: '#8a90b4', bg: 'rgba(138,144,180,0.12)', icon: <BookmarkNavIcon /> },
}

type Folder = 'all' | 'reminder' | 'idea' | 'resource'

// ── Helpers ───────────────────────────────────────────────────────────────────

function noteTitle(content: string) {
  const first = content.split('\n')[0].trim()
  return first.length > 70 ? first.slice(0, 70) + '…' : first || 'Untitled'
}

function notePreview(content: string) {
  const lines = content.split('\n')
  const rest = lines.slice(1).join(' ').trim() || (lines[0].length > 70 ? lines[0].slice(70) : '')
  return rest.length > 120 ? rest.slice(0, 120) + '…' : rest
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtShortDate(iso: string) {
  const d = new Date(iso)
  return { day: d.getDate(), month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() }
}

// ── Left Nav Panel ────────────────────────────────────────────────────────────

function LeftNav({
  folder, onFolder, userName, avatarUrl, noteCounts, searchQuery, onSearch,
}: {
  folder: Folder
  onFolder: (f: Folder) => void
  userName: string
  avatarUrl: string | null
  noteCounts: Record<string, number>
  searchQuery: string
  onSearch: (q: string) => void
}) {
  const navItems: { id: Folder | 'journal'; label: string; icon: React.ReactNode; href?: string }[] = [
    { id: 'all',      label: 'My Notes',    icon: <NavNotesIcon /> },
    { id: 'reminder', label: 'Reminders',   icon: <NavCheckIcon /> },
    { id: 'idea',     label: 'Ideas',       icon: <NavBulbIcon /> },
    { id: 'resource', label: 'Resources',   icon: <NavBookmarkIcon /> },
    { id: 'journal',  label: 'Journal',     icon: <NavPencilIcon />, href: '/journal' },
  ]

  return (
    <div style={{
      width: '210px',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 12px',
      borderRight: '1px solid var(--glass-card-border)',
      overflowY: 'auto',
    }}>
      {/* User row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px 18px', marginBottom: '4px' }}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--glass-card-border)', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold) 0%, var(--sage) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#1a1a1a', flexShrink: 0 }}>
            {userName.charAt(0).toUpperCase()}
          </div>
        )}
        <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-0)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {userName}
        </span>
        <ChevronDownIcon />
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none', display: 'flex' }}>
          <SearchMagIcon />
        </span>
        <input
          type="text"
          placeholder="Search notes…"
          value={searchQuery}
          onChange={e => onSearch(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '8px 10px 8px 30px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--bg-1)',
            color: 'var(--text-0)',
            fontSize: '12.5px',
            fontFamily: 'var(--font-sans)',
          }}
        />
      </div>

      {/* Folder nav */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {navItems.map(item => {
          const isActive = folder === item.id
          const count = noteCounts[item.id] ?? 0
          const btn = (
            <button
              key={item.id}
              onClick={() => !item.href && onFolder(item.id as Folder)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '9px',
                padding: '9px 10px', borderRadius: '8px', border: 'none',
                background: isActive ? 'var(--bg-2)' : 'transparent',
                color: isActive ? 'var(--text-0)' : 'var(--text-2)',
                cursor: 'pointer', fontSize: '13px',
                fontWeight: isActive ? 600 : 400,
                textAlign: 'left', transition: 'background 0.12s',
              }}
            >
              <span style={{ color: isActive ? 'var(--gold)' : 'var(--text-3)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                {item.icon}
              </span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {count > 0 && (
                <span style={{ fontSize: '10px', color: 'var(--text-3)', background: 'var(--bg-3)', borderRadius: '10px', padding: '1px 6px', flexShrink: 0 }}>
                  {count}
                </span>
              )}
              <span style={{ fontSize: '12px', color: 'var(--text-3)', opacity: 0.5, letterSpacing: '2px', lineHeight: 1, flexShrink: 0 }}>···</span>
            </button>
          )
          return item.href
            ? <Link key={item.id} href={item.href} style={{ textDecoration: 'none' }}>{btn}</Link>
            : btn
        })}
      </div>

      <div style={{ flex: 1 }} />

      {/* Bottom actions */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <button style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 10px', border: 'none', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer', borderRadius: '8px', fontSize: '13px', width: '100%', textAlign: 'left' }}>
          <PlusSmallIcon /> Add new folder
        </button>
        <Link href="/settings" style={{ textDecoration: 'none' }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 10px', border: 'none', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer', borderRadius: '8px', fontSize: '13px', width: '100%', textAlign: 'left' }}>
            <GearIcon /> Settings
          </button>
        </Link>
      </div>
    </div>
  )
}

// ── Note List Panel ───────────────────────────────────────────────────────────

function NoteListPanel({
  notes, selectedId, composerActive, onSelect, onNewNote, folderLabel,
}: {
  notes: MemoryNote[]
  selectedId: string | null
  composerActive: boolean
  onSelect: (note: MemoryNote) => void
  onNewNote: () => void
  folderLabel: string
}) {
  return (
    <div style={{
      width: '275px', flexShrink: 0, display: 'flex', flexDirection: 'column',
      borderRight: '1px solid var(--glass-card-border)', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 16px 12px', flexShrink: 0 }}>
        <h2 style={{ margin: '0 0 14px', fontSize: '22px', fontFamily: 'var(--font-serif)', fontWeight: 700, color: 'var(--text-0)', letterSpacing: '-0.01em' }}>
          {folderLabel}
        </h2>
        <button
          onClick={onNewNote}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 14px', borderRadius: '10px',
            border: `1px dashed ${composerActive ? 'var(--gold)' : 'var(--border-md)'}`,
            background: composerActive ? 'rgba(212,168,83,0.06)' : 'transparent',
            color: composerActive ? 'var(--gold)' : 'var(--text-2)',
            cursor: 'pointer', fontSize: '13px', fontWeight: 500,
            transition: 'all 0.15s',
          }}
        >
          <PlusSmallIcon /> Add new note
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {notes.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
            <div style={{ fontSize: '28px', marginBottom: '10px', opacity: 0.3 }}>◎</div>
            Nothing here yet.
          </div>
        ) : notes.map(note => {
          const title = noteTitle(note.content)
          const preview = notePreview(note.content)
          const { day, month } = fmtShortDate(note.created_at)
          const isSelected = !composerActive && note.id === selectedId
          const meta = TYPE_META[note.type]

          return (
            <button
              key={note.id}
              onClick={() => onSelect(note)}
              style={{
                width: '100%', textAlign: 'left', display: 'block',
                padding: '14px 16px', border: 'none',
                borderBottom: '1px solid var(--glass-card-border-subtle)',
                background: isSelected ? 'var(--bg-2)' : 'transparent',
                cursor: 'pointer', position: 'relative', transition: 'background 0.12s',
              }}
            >
              {isSelected && (
                <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '3px', borderRadius: '0 3px 3px 0', background: 'var(--gold)' }} />
              )}
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '5px' }}>
                {day} {month}
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-0)', lineHeight: 1.3, marginBottom: '5px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' as const }}>
                {title}
              </div>
              {preview && (
                <div style={{ fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.45, marginBottom: '8px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                  {preview}
                </div>
              )}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {note.ai_tags.slice(0, 3).map(tag => (
                  <span key={tag} style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '5px', background: meta.bg, color: meta.color, fontWeight: 500 }}>
                    {tag}
                  </span>
                ))}
                {note.ai_tags.length > 3 && (
                  <span style={{ fontSize: '10px', color: 'var(--text-3)', padding: '2px 4px' }}>
                    +{note.ai_tags.length - 3} more
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Editor Toolbar ────────────────────────────────────────────────────────────

function EditorToolbar({ targetRef, disabled }: { targetRef?: React.RefObject<HTMLDivElement | null>; disabled?: boolean }) {
  function exec(cmd: string, value?: string) {
    if (disabled || !targetRef?.current) return
    targetRef.current.focus()
    document.execCommand(cmd, false, value)
  }

  const btn: React.CSSProperties = {
    width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', borderRadius: '5px', background: 'transparent',
    cursor: disabled ? 'default' : 'pointer',
    color: disabled ? 'var(--text-3)' : 'var(--text-1)',
    fontSize: '13px', fontWeight: 700, transition: 'background 0.1s',
    flexShrink: 0,
  }
  const sep = <div style={{ width: '1px', height: '18px', background: 'var(--border)', margin: '0 3px', flexShrink: 0 }} />

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '1px',
      padding: '7px 10px', background: 'var(--bg-1)',
      borderRadius: '10px', border: '1px solid var(--border)',
      marginBottom: '16px', flexWrap: 'wrap',
    }}>
      <select
        defaultValue="Encode Sans"
        disabled={disabled}
        style={{ border: 'none', background: 'transparent', color: 'var(--text-1)', fontSize: '12px', cursor: disabled ? 'default' : 'pointer', outline: 'none', padding: '0 4px', maxWidth: '96px', fontFamily: 'var(--font-sans)' }}
      >
        <option>Encode Sans</option>
        <option>Georgia</option>
        <option>Courier New</option>
      </select>
      {sep}
      <select
        defaultValue="16"
        disabled={disabled}
        style={{ border: 'none', background: 'transparent', color: 'var(--text-1)', fontSize: '12px', cursor: disabled ? 'default' : 'pointer', outline: 'none', padding: '0 4px', maxWidth: '42px', fontFamily: 'var(--font-sans)' }}
      >
        {[12, 14, 16, 18, 20, 24, 32].map(s => <option key={s}>{s}</option>)}
      </select>
      {sep}
      <button style={btn} onClick={() => exec('bold')} title="Bold"><strong>B</strong></button>
      <button style={{ ...btn, fontStyle: 'italic' }} onClick={() => exec('italic')} title="Italic"><em>I</em></button>
      <button style={btn} onClick={() => { const url = window.prompt('URL:'); if (url) exec('createLink', url) }} title="Link"><ToolLinkIcon /></button>
      {sep}
      <button style={btn} onClick={() => exec('insertUnorderedList')} title="Bullet list"><ToolListIcon /></button>
      <button style={btn} onClick={() => exec('insertOrderedList')} title="Numbered list"><ToolOListIcon /></button>
      {sep}
      <button style={btn} onClick={() => exec('justifyLeft')} title="Align left"><ToolAlignLeftIcon /></button>
      <button style={btn} onClick={() => exec('justifyCenter')} title="Center"><ToolAlignCenterIcon /></button>
      <button style={btn} onClick={() => exec('justifyRight')} title="Align right"><ToolAlignRightIcon /></button>
      <button style={btn} onClick={() => exec('justifyFull')} title="Justify"><ToolAlignJustifyIcon /></button>
      {sep}
      <button style={btn} title="Image" disabled={disabled}><ToolImageIcon /></button>
      <button style={btn} title="Video" disabled={disabled}><ToolVideoIcon /></button>
      <button style={btn} title="Table" disabled={disabled}><ToolTableIcon /></button>
      <button style={btn} title="Embed" disabled={disabled}><ToolEmbedIcon /></button>
    </div>
  )
}

// ── Note Detail Panel ─────────────────────────────────────────────────────────

function NoteDetail({
  note, folderLabel, userName, avatarUrl, onResolve, onDelete,
}: {
  note: MemoryNote
  folderLabel: string
  userName: string
  avatarUrl: string | null
  onResolve: () => void
  onDelete: () => void
}) {
  const title = noteTitle(note.content)
  const meta = TYPE_META[note.type]
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Breadcrumb bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px', borderBottom: '1px solid var(--glass-card-border-subtle)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--text-3)', overflow: 'hidden' }}>
          <span style={{ whiteSpace: 'nowrap' }}>{folderLabel}</span>
          <span>›</span>
          <span style={{ color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
        </div>
        <div style={{ position: 'relative', flexShrink: 0, marginLeft: '12px' }}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{
              width: '30px', height: '30px', borderRadius: '8px',
              border: '1px solid var(--border)',
              background: menuOpen ? 'var(--bg-2)' : 'transparent',
              color: 'var(--text-2)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '15px', letterSpacing: '2px', lineHeight: 1,
            }}
          >
            ···
          </button>
          {menuOpen && (
            <>
              <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
              <div style={{
                position: 'absolute', right: 0, top: '36px', zIndex: 50,
                background: 'var(--glass-card-bg-strong)',
                backdropFilter: 'blur(32px) saturate(180%)',
                WebkitBackdropFilter: 'blur(32px) saturate(180%)',
                border: '1px solid var(--glass-card-border)',
                borderRadius: '10px', boxShadow: 'var(--glass-card-shadow-sm)',
                minWidth: '148px', overflow: 'hidden',
              }}>
                <button onClick={() => { setMenuOpen(false); onResolve() }} style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', color: 'var(--text-1)', cursor: 'pointer', fontSize: '13px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SmallCheckIcon /> Mark done
                </button>
                <button onClick={() => { setMenuOpen(false); onDelete() }} style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', color: '#e05c4a', cursor: 'pointer', fontSize: '13px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrashIcon /> Delete note
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 48px' }}>
        <h1 style={{ margin: '0 0 24px', fontSize: '30px', fontFamily: 'var(--font-serif)', fontWeight: 700, color: 'var(--text-0)', lineHeight: 1.25, letterSpacing: '-0.01em' }}>
          {title}
        </h1>

        {/* Metadata */}
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px 12px', marginBottom: '20px', fontSize: '13px', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-3)' }}>Created by</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold), var(--sage))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: '#1a1a1a', flexShrink: 0 }}>
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
            <span style={{ color: 'var(--text-1)' }}>{userName}</span>
          </div>
          <span style={{ color: 'var(--text-3)' }}>Last Modified</span>
          <span style={{ color: 'var(--text-1)' }}>{fmtDate(note.created_at)}</span>
          {note.trigger_date && (
            <>
              <span style={{ color: 'var(--text-3)' }}>Due Date</span>
              <span style={{ color: meta.color }}>
                {new Date(note.trigger_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </>
          )}
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', paddingBottom: '20px', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-3)', minWidth: '36px', flexShrink: 0 }}>Tags</span>
          <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '5px', background: meta.bg, color: meta.color, fontWeight: 600, letterSpacing: '0.04em' }}>
            {meta.label.slice(0, -1)}
          </span>
          {note.ai_tags.map(tag => (
            <span key={tag} style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '6px', background: 'var(--bg-2)', color: 'var(--text-1)', border: '1px solid var(--border)' }}>
              {tag}
            </span>
          ))}
          <button style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '6px', border: '1px dashed var(--border-md)', background: 'transparent', color: 'var(--text-3)', fontSize: '12px', cursor: 'pointer' }}>
            <span style={{ fontSize: '14px', lineHeight: 1, marginTop: '-1px' }}>+</span> Add new tag
          </button>
        </div>

        {/* Editor toolbar (display-only for existing notes) */}
        <EditorToolbar disabled />

        {/* Note content */}
        <div style={{ fontSize: '14.5px', color: 'var(--text-0)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
          {note.content}
        </div>
      </div>
    </div>
  )
}

// ── Composer Panel (new note in detail area) ──────────────────────────────────

function ComposerPanel({
  onAdded, onCancel, userName, avatarUrl, folderLabel,
}: {
  onAdded: (note: MemoryNote) => void
  onCancel: () => void
  userName: string
  avatarUrl: string | null
  folderLabel: string
}) {
  type Classified = { type: MemoryNote['type']; trigger_date: string | null; ai_tags: string[]; clarifying_question: string | null }

  const toast = useToast()
  const editorRef = useRef<HTMLDivElement>(null)
  const clarifyRef = useRef<HTMLInputElement>(null)
  const [classifying, setClassifying] = useState(false)
  const [classified, setClassified] = useState<Classified | null>(null)
  const [clarifyAnswer, setClarifyAnswer] = useState('')
  const [saving, startSave] = useTransition()
  const [customTag, setCustomTag] = useState('')
  const [addingTag, setAddingTag] = useState(false)
  const [extraTags, setExtraTags] = useState<string[]>([])

  const waitingForClarification = !!classified?.clarifying_question
  const loading = classifying || saving

  function preClassifyLocal(content: string): MemoryNote['type'] | null {
    const lower = content.toLowerCase()
    if (/https?:\/\/[^\s]+/.test(content)) return 'resource'
    if (/\b(today|tomorrow|tonight|this (monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month|weekend)|next (week|month|monday|tuesday|wednesday|thursday|friday)|by (friday|monday|end of|the)|before |deadline|due |don'?t forget|remember to|need to (call|email|send|submit|pay|buy|pick up|book|schedule|follow up)|appointment|renew|expires?)\b/i.test(lower)) return 'reminder'
    if (/\b(app|tool|site|website|book|article|course|podcast|video|plugin|software|service|platform|newsletter|channel|repo|github|library|framework|recipe)\b/i.test(lower)) return 'resource'
    return null
  }

  async function classify(content: string): Promise<Classified> {
    const [classifyRes, clarifyRes] = await Promise.all([
      fetch('/api/memory-notes/classify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) }),
      fetch('/api/memory-notes/clarify',  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) }),
    ])
    const [classifyData, clarifyData] = await Promise.all([classifyRes.json(), clarifyRes.json()])
    const preType = preClassifyLocal(content)
    const finalType = (preType && classifyData.type === 'idea') ? preType : (classifyData.type ?? 'idea')
    return {
      type: finalType,
      trigger_date: classifyData.trigger_date ?? null,
      ai_tags: classifyData.ai_tags ?? [],
      clarifying_question: clarifyData.question ?? null,
    }
  }

  function getContent() {
    return editorRef.current?.innerText?.trim() ?? ''
  }

  async function handleSave() {
    const content = getContent()
    if (!content || loading) return

    if (waitingForClarification) {
      const enriched = clarifyAnswer.trim() ? `${content} — ${clarifyAnswer.trim()}` : content
      await save(enriched, classified!)
      return
    }

    setClassifying(true)
    let result: Classified = { type: 'idea', trigger_date: null, ai_tags: [], clarifying_question: null }
    try {
      result = await classify(content)
      setClassified(result)
      if (result.clarifying_question) {
        setTimeout(() => clarifyRef.current?.focus(), 50)
        return
      }
    } catch { /* fallback */ } finally {
      setClassifying(false)
    }
    await save(content, result)
  }

  async function save(content: string, meta: Classified) {
    startSave(async () => {
      try {
        const allTags = [...new Set([...meta.ai_tags, ...extraTags])]
        const note = await createMemoryNote(content, meta.type, meta.trigger_date, allTags)
        if (note) {
          onAdded(note)
          if (editorRef.current) editorRef.current.innerHTML = ''
          setClassified(null)
          setClarifyAnswer('')
          setExtraTags([])
        } else {
          toast.error('Failed to save — check your Supabase setup.')
        }
      } catch (e) {
        console.error('createMemoryNote error:', e)
        toast.error('Something went wrong saving your note.')
      }
    })
  }

  function handleSkipClarification() {
    if (!classified) return
    const content = getContent()
    save(content, { ...classified, clarifying_question: null })
  }

  const content = typeof window !== 'undefined' ? (editorRef.current?.innerText?.trim() ?? '') : ''
  const classifiedMeta = classified ? TYPE_META[classified.type] : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Breadcrumb bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px', borderBottom: '1px solid var(--glass-card-border-subtle)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--text-3)' }}>
          <span>{folderLabel}</span>
          <span>›</span>
          <span style={{ color: 'var(--gold)' }}>New Note</span>
        </div>
        <button
          onClick={onCancel}
          style={{ fontSize: '12px', color: 'var(--text-3)', border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 10px', borderRadius: '6px' }}
        >
          Cancel
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 40px' }}>
        {/* Placeholder title */}
        <div style={{ fontSize: '28px', fontFamily: 'var(--font-serif)', fontWeight: 700, color: 'var(--text-3)', marginBottom: '20px', letterSpacing: '-0.01em' }}>
          New Note
        </div>

        {/* Metadata */}
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px 12px', marginBottom: '20px', fontSize: '13px', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-3)' }}>Created by</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold), var(--sage))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: '#1a1a1a', flexShrink: 0 }}>
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
            <span style={{ color: 'var(--text-1)' }}>{userName}</span>
          </div>
          <span style={{ color: 'var(--text-3)' }}>Type</span>
          <span style={{ color: classifiedMeta?.color ?? 'var(--text-3)', fontSize: '12px', fontWeight: classifiedMeta ? 600 : 400 }}>
            {classifiedMeta ? classifiedMeta.label.slice(0, -1) : 'Auto-detected on save'}
          </span>
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', paddingBottom: '20px', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-3)', minWidth: '36px', flexShrink: 0 }}>Tags</span>
          {classified && (
            <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '5px', background: classifiedMeta!.bg, color: classifiedMeta!.color, fontWeight: 600 }}>
              {classifiedMeta!.label.slice(0, -1)}
            </span>
          )}
          {classified?.ai_tags.map(tag => (
            <span key={tag} style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '6px', background: 'var(--bg-2)', color: 'var(--text-1)', border: '1px solid var(--border)' }}>
              {tag}
            </span>
          ))}
          {extraTags.map(tag => (
            <span key={tag} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '3px 10px', borderRadius: '6px', background: 'var(--bg-2)', color: 'var(--text-1)', border: '1px solid var(--border)' }}>
              {tag}
              <button onClick={() => setExtraTags(prev => prev.filter(t => t !== tag))} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-3)', fontSize: '14px', lineHeight: 1, padding: 0 }}>×</button>
            </span>
          ))}
          {addingTag ? (
            <input
              autoFocus
              value={customTag}
              onChange={e => setCustomTag(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && customTag.trim()) {
                  setExtraTags(prev => [...prev, customTag.trim()])
                  setCustomTag('')
                  setAddingTag(false)
                }
                if (e.key === 'Escape') { setCustomTag(''); setAddingTag(false) }
              }}
              onBlur={() => { if (customTag.trim()) { setExtraTags(prev => [...prev, customTag.trim()]) } setCustomTag(''); setAddingTag(false) }}
              placeholder="tag name…"
              style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--gold)', background: 'transparent', color: 'var(--text-0)', width: '90px', outline: 'none', fontFamily: 'var(--font-sans)' }}
            />
          ) : (
            <button onClick={() => setAddingTag(true)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '6px', border: '1px dashed var(--border-md)', background: 'transparent', color: 'var(--text-3)', fontSize: '12px', cursor: 'pointer' }}>
              <span style={{ fontSize: '14px', lineHeight: 1, marginTop: '-1px' }}>+</span> Add new tag
            </button>
          )}
        </div>

        {/* Toolbar */}
        <EditorToolbar targetRef={editorRef} />

        {/* Contenteditable editor */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onKeyDown={e => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleSave() }
          }}
          data-placeholder="Jot something down — a reminder, a resource, an idea…"
          style={{
            minHeight: '140px',
            fontSize: '14.5px',
            color: 'var(--text-0)',
            lineHeight: 1.75,
            outline: 'none',
            fontFamily: 'var(--font-sans)',
          }}
        />

        {/* Clarification prompt */}
        {waitingForClarification && (
          <div style={{ marginTop: '20px', padding: '14px 16px', background: 'var(--bg-2)', borderRadius: '10px', border: '1px solid rgba(212,168,83,0.3)' }}>
            <div style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Locus needs a bit more
            </div>
            <p style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--text-1)' }}>{classified!.clarifying_question}</p>
            <input
              ref={clarifyRef}
              value={clarifyAnswer}
              onChange={e => setClarifyAnswer(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSave() } }}
              placeholder="type your answer…"
              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', color: 'var(--text-0)', fontFamily: 'var(--font-sans)' }}
            />
            <button onClick={handleSkipClarification} style={{ marginTop: '6px', background: 'none', border: 'none', fontSize: '11px', color: 'var(--text-3)', cursor: 'pointer', padding: 0 }}>
              skip and save as-is
            </button>
          </div>
        )}
      </div>

      {/* Save bar */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px',
        padding: '12px 24px', borderTop: '1px solid var(--glass-card-border-subtle)',
        background: 'var(--bg-1)',
      }}>
        <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>⌘↵ to save</span>
        <div style={{ flex: 1 }} />
        <button
          onClick={onCancel}
          style={{ padding: '8px 16px', borderRadius: '9px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer' }}
        >
          Discard
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            padding: '8px 20px', borderRadius: '9px', border: 'none',
            background: loading ? 'var(--bg-3)' : 'var(--gold)',
            color: loading ? 'var(--text-3)' : '#1a1a1a',
            fontSize: '13px', fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s', minWidth: '90px',
          }}
        >
          {loading ? '…' : waitingForClarification ? 'Save' : 'Capture'}
        </button>
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyDetail({ onNewNote }: { onNewNote: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '14px', padding: '40px' }}>
      <div style={{ fontSize: '42px', opacity: 0.2, lineHeight: 1 }}>◎</div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>Select a note or create one</div>
        <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>Your notes will appear here</div>
      </div>
      <button
        onClick={onNewNote}
        style={{ marginTop: '4px', padding: '10px 22px', borderRadius: '10px', background: 'var(--gold)', color: '#1a1a1a', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
      >
        + New note
      </button>
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

export default function CaptureView({
  initialNotes,
  userName,
  avatarUrl,
}: {
  initialNotes: MemoryNote[]
  userName: string
  avatarUrl: string | null
}) {
  const [notes, setNotes] = useState<MemoryNote[]>(initialNotes)
  const [selectedFolder, setSelectedFolder] = useState<Folder>('all')
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredNotes = notes.filter(n => {
    if (selectedFolder !== 'all' && n.type !== selectedFolder) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return n.content.toLowerCase().includes(q) || n.ai_tags.some(t => t.toLowerCase().includes(q))
    }
    return true
  })

  const selectedNote = notes.find(n => n.id === selectedNoteId) ?? null
  const folderLabel = selectedFolder === 'all' ? 'My Notes' : TYPE_META[selectedFolder]?.label ?? 'Notes'

  const noteCounts = {
    all: notes.length,
    reminder: notes.filter(n => n.type === 'reminder').length,
    idea:     notes.filter(n => n.type === 'idea').length,
    resource: notes.filter(n => n.type === 'resource').length,
  }

  function handleAdded(note: MemoryNote) {
    setNotes(prev => [note, ...prev])
    setSelectedNoteId(note.id)
    setComposerOpen(false)
  }

  function handleResolve(id: string) {
    resolveMemoryNote(id)
    setNotes(prev => prev.filter(n => n.id !== id))
    if (selectedNoteId === id) setSelectedNoteId(null)
  }

  function handleDelete(id: string) {
    deleteMemoryNote(id)
    setNotes(prev => prev.filter(n => n.id !== id))
    if (selectedNoteId === id) setSelectedNoteId(null)
  }

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        flex: 1, display: 'flex', overflow: 'hidden',
        background: 'var(--glass-card-bg)',
        backdropFilter: 'blur(32px) saturate(180%)',
        WebkitBackdropFilter: 'blur(32px) saturate(180%)',
        border: '1px solid var(--glass-card-border)',
        boxShadow: 'var(--glass-card-shadow)',
        borderRadius: 'var(--radius-card)',
      }}>
        {/* Left nav — hidden on mobile */}
        <div className="capture-left-nav">
          <LeftNav
            folder={selectedFolder}
            onFolder={f => { setSelectedFolder(f); setSelectedNoteId(null); setComposerOpen(false) }}
            userName={userName}
            avatarUrl={avatarUrl}
            noteCounts={noteCounts}
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
          />
        </div>

        {/* Note list — hidden on mobile when detail is open */}
        <div className={`capture-note-list${(composerOpen || selectedNote) ? ' capture-note-list-hidden-mobile' : ''}`}>
          <NoteListPanel
            notes={filteredNotes}
            selectedId={selectedNoteId}
            composerActive={composerOpen}
            onSelect={note => { setSelectedNoteId(note.id); setComposerOpen(false) }}
            onNewNote={() => { setComposerOpen(true); setSelectedNoteId(null) }}
            folderLabel={folderLabel}
          />
        </div>

        {/* Detail panel */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {composerOpen ? (
            <ComposerPanel
              onAdded={handleAdded}
              onCancel={() => setComposerOpen(false)}
              userName={userName}
              avatarUrl={avatarUrl}
              folderLabel={folderLabel}
            />
          ) : selectedNote ? (
            <NoteDetail
              note={selectedNote}
              folderLabel={folderLabel}
              userName={userName}
              avatarUrl={avatarUrl}
              onResolve={() => handleResolve(selectedNote.id)}
              onDelete={() => handleDelete(selectedNote.id)}
            />
          ) : (
            <EmptyDetail onNewNote={() => setComposerOpen(true)} />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function NavNotesIcon() {
  return <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="12" height="13" rx="2"/><path d="M5 6h6M5 9h4"/></svg>
}
function NavCheckIcon() {
  return <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M2 7h12M5 2v2M11 2v2"/></svg>
}
function NavBulbIcon() {
  return <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2a4 4 0 014 4c0 1.8-1 3.3-2.5 4H6.5C5 10.3 4 8.8 4 6a4 4 0 014-4z"/><path d="M6 12h4M6.5 14h3"/></svg>
}
function NavBookmarkIcon() {
  return <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2h8v13l-4-3-4 3V2z"/></svg>
}
function NavPencilIcon() {
  return <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2l3 3L5 14H2v-3L11 2z"/></svg>
}
function ChevronDownIcon() {
  return <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6l4 4 4-4"/></svg>
}
function SearchMagIcon() {
  return <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5l3 3"/></svg>
}
function PlusSmallIcon() {
  return <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M8 3v10M3 8h10"/></svg>
}
function GearIcon() {
  return <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4"/></svg>
}
function ClockIcon() {
  return <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="7" cy="7" r="5.5"/><path d="M7 4v3l2 1.5"/></svg>
}
function LightbulbIcon() {
  return <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M7 1.5A3.5 3.5 0 0110.5 5c0 1.6-.9 2.9-2.2 3.5H5.7C4.4 7.9 3.5 6.6 3.5 5A3.5 3.5 0 017 1.5z"/><path d="M5.5 10.5h3M6 12.5h2"/></svg>
}
function BookmarkNavIcon() {
  return <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 1h8v12L7 9.5 3 13V1z"/></svg>
}
function SmallCheckIcon() {
  return <svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 7l3.5 3.5L12 4"/></svg>
}
function TrashIcon() {
  return <svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M2 3.5h10M5 3.5V2h4v1.5M4.5 6v5M7 6v5M9.5 6v5M3 3.5l.75 8h6.5l.75-8"/></svg>
}
function ToolLinkIcon() {
  return <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 7.5A2.5 2.5 0 009.5 7L11 5.5a2.5 2.5 0 00-3.5-3.5L6.5 3"/><path d="M8 6.5A2.5 2.5 0 004.5 7L3 8.5a2.5 2.5 0 003.5 3.5L7.5 11"/></svg>
}
function ToolListIcon() {
  return <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="2.5" cy="4" r="1"/><circle cx="2.5" cy="7" r="1"/><circle cx="2.5" cy="10" r="1"/><path d="M5 4h7M5 7h7M5 10h7"/></svg>
}
function ToolOListIcon() {
  return <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M2 2.5h1.5v4M2 6.5h3M5 10h7M5 7h7M5 4h7" /><path d="M2 10.5c0-1 1.5-1 1.5-2s-1.5-.5-1.5.5"/></svg>
}
function ToolAlignLeftIcon() {
  return <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M1 3h12M1 6h8M1 9h12M1 12h6"/></svg>
}
function ToolAlignCenterIcon() {
  return <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M1 3h12M3 6h8M1 9h12M4 12h6"/></svg>
}
function ToolAlignRightIcon() {
  return <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M1 3h12M5 6h8M1 9h12M7 12h6"/></svg>
}
function ToolAlignJustifyIcon() {
  return <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M1 3h12M1 6h12M1 9h12M1 12h12"/></svg>
}
function ToolImageIcon() {
  return <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="2" width="12" height="10" rx="1.5"/><circle cx="4.5" cy="5" r="1"/><path d="M1 9l3-3 3 3 2-2 4 4"/></svg>
}
function ToolVideoIcon() {
  return <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="9" height="8" rx="1.5"/><path d="M10 5.5l3-2v7l-3-2v-3z"/></svg>
}
function ToolTableIcon() {
  return <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="2" width="12" height="10" rx="1.5"/><path d="M1 6h12M5 2v10M9 2v10"/></svg>
}
function ToolEmbedIcon() {
  return <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4L2 7l3 3M9 4l3 3-3 3"/></svg>
}
