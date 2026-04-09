'use client'

import { useState, useRef, useCallback } from 'react'
import { saveJournalAction } from '@/app/actions/journal'
import type { JournalEntry } from '@/lib/types'

export default function JournalSection({ existing }: { existing: JournalEntry | null }) {
  const [content, setContent]   = useState(existing?.content ?? '')
  const [status, setStatus]     = useState<'idle' | 'saving' | 'saved'>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const wordCount = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0

  const save = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setStatus('saving')
    try {
      await saveJournalAction(trimmed)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2500)
    } catch {
      setStatus('idle')
    }
  }, [])

  const handleChange = (val: string) => {
    setContent(val)
    setStatus('idle')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => save(val), 1800)
  }

  const handleBlur = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (content.trim()) save(content)
  }

  const handleSaveNow = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    save(content)
  }

  return (
    <div style={{ maxWidth: '560px', marginTop: '40px', paddingTop: '36px', borderTop: '1px solid var(--border-sm)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '6px' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 400, color: 'var(--text-0)' }}>
          Today&apos;s Journal
        </div>
        <div style={{ fontSize: '12px', minWidth: '60px', textAlign: 'right', transition: 'color 0.2s' }}>
          {status === 'saving' && <span style={{ color: 'var(--text-3)' }}>Saving…</span>}
          {status === 'saved'  && <span style={{ color: 'var(--sage)', fontWeight: 600 }}>✓ Saved</span>}
        </div>
      </div>

      <div style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '16px', lineHeight: 1.55 }}>
        A space for longer reflection — what happened today, how you&apos;re processing it, what&apos;s on your mind. Locus reads these to understand you better over time.
      </div>

      {/* Textarea */}
      <textarea
        value={content}
        onChange={e => handleChange(e.target.value)}
        onBlur={handleBlur}
        rows={9}
        placeholder="Write freely. No structure required — a stream of thought, a few observations, or a detailed account of your day. Locus will look for patterns across entries over time..."
        style={{
          width: '100%',
          background: 'var(--bg-1)',
          border: '1px solid var(--border-md)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          fontFamily: 'var(--font-sans)',
          fontSize: '14px',
          color: 'var(--text-0)',
          resize: 'vertical',
          outline: 'none',
          lineHeight: 1.75,
          boxSizing: 'border-box',
          minHeight: '200px',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = 'rgba(212,168,83,0.4)' }}
        onBlurCapture={e => { (e.target as HTMLTextAreaElement).style.borderColor = 'var(--border-md)' }}
      />

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
          {wordCount > 0 ? `${wordCount} word${wordCount !== 1 ? 's' : ''}` : 'Auto-saves as you write'}
        </span>
        {content.trim() && status !== 'saved' && (
          <button
            onClick={handleSaveNow}
            style={{
              fontSize: '12px',
              padding: '4px 12px',
              background: 'none',
              border: '1px solid var(--border-md)',
              borderRadius: '6px',
              color: 'var(--text-2)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Save now
          </button>
        )}
      </div>
    </div>
  )
}
