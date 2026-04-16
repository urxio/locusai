'use client'

import { useState, useRef, useCallback } from 'react'
import { saveJournalAction } from '@/app/actions/journal'
import { localDateStr } from '@/lib/utils/date'
import type { JournalEntry } from '@/lib/types'
import FollowupQuestion from './FollowupQuestion'

// ─── Week dot-map ────────────────────────────────────────────────────────────

function WeekDotMap({
  recentJournals,
  todayHasEntry,
}: {
  recentJournals: JournalEntry[]
  todayHasEntry: boolean
}) {
  const today = new Date()
  const todayStr = localDateStr(today)

  // Build set of dates that have journal entries
  const journalDates = new Set(recentJournals.map(j => j.date))
  if (todayHasEntry) journalDates.add(todayStr)

  // Compute Mon–Sun of the current week
  const dow = today.getDay() // 0=Sun
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset)

  const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const weekDays = DAY_LABELS.map((label, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = localDateStr(d)
    const isFuture = d > today && dateStr !== todayStr
    return { label, dateStr, isToday: dateStr === todayStr, hasEntry: journalDates.has(dateStr), isFuture }
  })

  const filledCount = weekDays.filter(d => !d.isFuture && d.hasEntry).length
  const totalSoFar  = weekDays.filter(d => !d.isFuture).length

  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{
          fontSize: '11px', fontWeight: 600, color: 'var(--text-3)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          This week
        </div>
        <div style={{ fontSize: '11px', color: filledCount === totalSoFar ? 'var(--sage)' : 'var(--text-3)', fontWeight: 600 }}>
          {filledCount}/{totalSoFar} {filledCount === totalSoFar && totalSoFar > 1 ? '✓' : ''}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px' }}>
        {weekDays.map((day, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', flex: 1 }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '9px',
              background: day.hasEntry
                ? day.isToday ? 'var(--sage)'    : 'var(--sage-dim)'
                : day.isToday ? 'var(--bg-3)'    : 'var(--bg-2)',
              border: day.isToday
                ? `1.5px solid ${day.hasEntry ? 'var(--sage)' : 'var(--border-bright)'}`
                : '1px solid transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: day.isFuture ? 0.25 : 1,
              transition: 'background 0.2s, border-color 0.2s',
              flexShrink: 0,
            }}>
              {day.hasEntry && (
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path
                    d="M2 5.5l2.5 2.5 4.5-4.5"
                    stroke={day.isToday ? '#fff' : 'var(--sage)'}
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <div style={{
              fontSize: '10px',
              color: day.isToday ? 'var(--text-1)' : 'var(--text-3)',
              fontWeight: day.isToday ? 700 : 400,
            }}>
              {day.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Reflection card ─────────────────────────────────────────────────────────

function ReflectionCard({ reflection, onDismiss }: { reflection: string; onDismiss: () => void }) {
  return (
    <div style={{
      marginTop: '16px',
      background: 'var(--bg-1)',
      border: '1px solid var(--border-md)',
      borderRadius: '14px',
      overflow: 'hidden',
      animation: 'fadeUp 0.3s var(--ease) both',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        background: 'var(--bg-2)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Locus logo */}
          <div style={{
            width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--gold) 0%, #a07830 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="9" height="9" viewBox="0 0 16 16" fill="#131110">
              <circle cx="8" cy="8" r="3"/>
              <circle cx="8" cy="2" r="1.2"/>
              <circle cx="8" cy="14" r="1.2"/>
              <circle cx="2" cy="8" r="1.2"/>
              <circle cx="14" cy="8" r="1.2"/>
            </svg>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Locus noticed
          </span>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            background: 'none', border: 'none', color: 'var(--text-3)',
            cursor: 'pointer', fontSize: '16px', lineHeight: 1,
            padding: '0 2px', fontFamily: 'inherit',
          }}
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px' }}>
        <p style={{
          margin: 0,
          fontFamily: 'var(--font-serif)',
          fontSize: '15px',
          fontWeight: 300,
          color: 'var(--text-0)',
          lineHeight: 1.65,
        }}>
          {reflection}
        </p>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function JournalSection({
  existing,
  recentJournals = [],
}: {
  existing: JournalEntry | null
  recentJournals?: JournalEntry[]
}) {
  const [content, setContent] = useState(existing?.content ?? '')
  const [status, setStatus]   = useState<'idle' | 'saving' | 'saved'>('idle')

  // Follow-up question (for short/vague entries < 50 words)
  const [followupQ, setFollowupQ]       = useState<string | null>(null)
  const [followupDone, setFollowupDone] = useState(false)

  // Locus reflection (for substantial entries ≥ 50 words)
  const [reflection, setReflection]           = useState<string | null>(null)
  const [reflectionDismissed, setReflectionDismissed] = useState(false)

  const aiFetchedRef  = useRef(!!existing) // skip on first load if entry already exists
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null)

  const wordCount = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0
  const todayHasEntry = !!content.trim()

  const save = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setStatus('saving')
    try {
      await saveJournalAction(trimmed, localDateStr())
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2500)

      if (!aiFetchedRef.current) {
        aiFetchedRef.current = true
        const words = trimmed.split(/\s+/).filter(Boolean).length

        if (words < 50) {
          // Short entry → ask a clarifying follow-up question
          fetch('/api/followup/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: trimmed, type: 'journal' }),
          })
            .then(r => r.json())
            .then(({ question }) => { if (question) setFollowupQ(question) })
            .catch(() => {})
        } else {
          // Substantial entry → surface a Locus observation
          fetch('/api/journal/reflect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: trimmed }),
          })
            .then(r => r.json())
            .then(({ reflection: r }) => { if (r) setReflection(r) })
            .catch(() => {})
        }
      }
    } catch {
      setStatus('idle')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div style={{ maxWidth: '560px' }}>

      {/* Week dot-map */}
      <WeekDotMap recentJournals={recentJournals} todayHasEntry={todayHasEntry} />

      {/* Section header */}
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
          borderRadius: '12px',
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
              fontSize: '12px', padding: '4px 12px',
              background: 'none', border: '1px solid var(--border-md)',
              borderRadius: '6px', color: 'var(--text-2)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Save now
          </button>
        )}
      </div>

      {/* Locus reflection — for substantial entries */}
      {reflection && !reflectionDismissed && (
        <ReflectionCard
          reflection={reflection}
          onDismiss={() => setReflectionDismissed(true)}
        />
      )}

      {/* Follow-up question — for short/vague entries */}
      {followupQ && !followupDone && (
        <FollowupQuestion
          question={followupQ}
          context={content}
          onDone={() => setFollowupDone(true)}
        />
      )}
    </div>
  )
}
