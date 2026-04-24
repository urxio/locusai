'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { saveJournalAction } from '@/app/actions/journal'
import { localDateStr } from '@/lib/utils/date'
import type { JournalEntry } from '@/lib/types'
import FollowupQuestion from './FollowupQuestion'
import { TabToggle, type Tab } from '@/components/checkin/CheckinTabs'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDisplayDate(dateStr: string): string {
  // dateStr is YYYY-MM-DD, parse as local date to avoid UTC offset shifting the day
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  })
}

function getWeekDays(todayStr: string, weekOffset = 0): Array<{
  label: string; dateStr: string; isToday: boolean; isFuture: boolean
}> {
  const [y, m, d] = todayStr.split('-').map(Number)
  const today = new Date(y, m - 1, d)
  const dow = today.getDay()
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset + weekOffset * 7)

  return ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    const dateStr = localDateStr(date)
    return { label, dateStr, isToday: dateStr === todayStr, isFuture: date > today }
  })
}

// ─── Week dot-map ─────────────────────────────────────────────────────────────

function WeekDotMap({
  recentJournals,
  selectedDate,
  todayStr,
  onSelectDate,
  weekOffset,
  onWeekOffsetChange,
}: {
  recentJournals: JournalEntry[]
  selectedDate: string
  todayStr: string
  onSelectDate: (date: string) => void
  weekOffset: number
  onWeekOffsetChange: (offset: number) => void
}) {
  const journalDates = new Set(recentJournals.filter(j => j.content.trim()).map(j => j.date))
  const weekDays = getWeekDays(todayStr, weekOffset)

  const filledCount = weekDays.filter(d => !d.isFuture && journalDates.has(d.dateStr)).length
  const totalSoFar  = weekDays.filter(d => !d.isFuture).length

  const isThisWeek  = weekOffset === 0
  const isLastWeek  = weekOffset === -1
  const weekLabel   = isThisWeek ? 'This week' : isLastWeek ? 'Last week' : 'Earlier'

  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Prev week */}
          {weekOffset > -1 && (
            <button
              onClick={() => onWeekOffsetChange(weekOffset - 1)}
              title="Previous week"
              style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '0 2px', fontSize: '14px', lineHeight: 1, fontFamily: 'inherit' }}
            >‹</button>
          )}
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {weekLabel}
          </div>
          {/* Next week — only if not already on current week */}
          {weekOffset < 0 && (
            <button
              onClick={() => onWeekOffsetChange(weekOffset + 1)}
              title="Next week"
              style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '0 2px', fontSize: '14px', lineHeight: 1, fontFamily: 'inherit' }}
            >›</button>
          )}
        </div>
        <div style={{ fontSize: '11px', color: filledCount === totalSoFar && totalSoFar > 0 ? 'var(--sage)' : 'var(--text-3)', fontWeight: 600 }}>
          {filledCount}/{totalSoFar}{filledCount === totalSoFar && totalSoFar > 1 ? ' ✓' : ''}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px' }}>
        {weekDays.map((day, i) => {
          const isSelected = day.dateStr === selectedDate
          const hasEntry   = journalDates.has(day.dateStr)
          const clickable  = !day.isFuture

          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', flex: 1 }}>
              <button
                onClick={() => clickable && onSelectDate(day.dateStr)}
                title={clickable ? formatDisplayDate(day.dateStr) : undefined}
                style={{
                  width: '32px', height: '32px', borderRadius: '9px',
                  background: hasEntry
                    ? isSelected ? 'var(--sage)' : 'var(--sage-dim)'
                    : isSelected ? 'var(--bg-3)'  : 'var(--bg-2)',
                  border: isSelected
                    ? `2px solid ${hasEntry ? 'var(--sage)' : 'var(--gold)'}`
                    : day.isToday
                      ? '1.5px solid var(--border-bright)'
                      : '1px solid transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: day.isFuture ? 0.25 : 1,
                  cursor: clickable ? 'pointer' : 'default',
                  transition: 'background 0.15s, border-color 0.15s, transform 0.1s',
                  flexShrink: 0,
                  padding: 0,
                  transform: isSelected && !hasEntry ? 'scale(1.05)' : 'scale(1)',
                }}
                onMouseEnter={e => { if (clickable && !isSelected) (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)' }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
              >
                {hasEntry && (
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path
                      d="M2 5.5l2.5 2.5 4.5-4.5"
                      stroke={isSelected ? '#fff' : 'var(--sage)'}
                      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
              <div style={{
                fontSize: '10px',
                color: isSelected ? 'var(--text-0)' : day.isToday ? 'var(--text-1)' : 'var(--text-3)',
                fontWeight: isSelected ? 700 : day.isToday ? 600 : 400,
              }}>
                {day.label}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Reflection card ──────────────────────────────────────────────────────────

function ReflectionCard({ reflection, onDismiss }: { reflection: string; onDismiss: () => void }) {
  return (
    <div style={{
      marginTop: '16px', background: 'var(--glass-card-bg)',
      backdropFilter: 'blur(32px) saturate(180%)',
      WebkitBackdropFilter: 'blur(32px) saturate(180%)',
      border: '1px solid var(--glass-card-border)',
      boxShadow: 'var(--glass-card-shadow-sm)',
      borderRadius: '14px',
      overflow: 'hidden', animation: 'fadeUp 0.3s var(--ease) both',
    }}>
      <div style={{
        padding: '10px 14px', background: 'var(--bg-2)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '20px', height: '20px', borderRadius: '6px',
            background: 'linear-gradient(135deg, var(--gold) 0%, #a07830 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
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
        <button onClick={onDismiss} aria-label="Dismiss" style={{
          background: 'none', border: 'none', color: 'var(--text-3)',
          cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 2px', fontFamily: 'inherit',
        }}>×</button>
      </div>
      <div style={{ padding: '14px 16px' }}>
        <p style={{
          margin: 0, fontFamily: 'var(--font-serif)', fontSize: '15px',
          fontWeight: 300, color: 'var(--text-0)', lineHeight: 1.65,
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
  tab,
  setTab,
  todayJournalHasContent = false,
}: {
  existing: JournalEntry | null
  recentJournals?: JournalEntry[]
  tab?: Tab
  setTab?: (t: Tab) => void
  todayJournalHasContent?: boolean
}) {
  const todayStr = localDateStr()

  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [weekOffset,   setWeekOffset]   = useState(0)   // 0 = this week, -1 = last week
  const isToday = selectedDate === todayStr

  // Derive initial content from existing (today's server-fetched entry) or recentJournals
  function entryForDate(date: string): string {
    if (date === todayStr) return existing?.content ?? ''
    return recentJournals.find(j => j.date === date)?.content ?? ''
  }

  const [content, setContent] = useState(entryForDate(todayStr))
  const [status, setStatus]   = useState<'idle' | 'saving' | 'saved'>('idle')

  // Per-date AI result cache backed by sessionStorage so it survives page navigation
  type AiCache = {
    aiFetched:       boolean
    followupQ:       string | null
    reflection:      string | null
    reflectionEmpty: boolean
  }
  const CACHE_KEY = 'locus_journal_ai_cache'

  const readStorage = (): Record<string, AiCache> => {
    try { return JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? '{}') } catch { return {} }
  }
  const writeStorage = (store: Record<string, AiCache>) => {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(store)) } catch {}
  }
  const EMPTY_CACHE: AiCache = { aiFetched: false, followupQ: null, reflection: null, reflectionEmpty: false }
  const getCache = (date: string): AiCache => readStorage()[date] ?? EMPTY_CACHE
  const setCache = (date: string, patch: Partial<AiCache>) => {
    const store = readStorage()
    store[date] = { ...getCache(date), ...patch }
    writeStorage(store)
  }

  // Reactive AI state — seeded from sessionStorage on mount, refreshed on date switch
  const [followupQ,          setFollowupQ]          = useState<string | null>(() => getCache(todayStr).followupQ)
  const [followupDone,       setFollowupDone]       = useState(false)
  const [reflection,         setReflection]         = useState<string | null>(() => getCache(todayStr).reflection)
  const [reflectionLoading,  setReflectionLoading]  = useState(false)
  const [reflectionDismissed,setReflectionDismissed]= useState(false)
  const [reflectionEmpty,    setReflectionEmpty]    = useState(false)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // When the selected date changes: flush timer, load content, restore cached AI state
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setContent(entryForDate(selectedDate))
    setStatus('idle')
    setFollowupDone(false)
    setReflectionDismissed(false)
    setReflectionLoading(false)

    const cached = getCache(selectedDate)
    setFollowupQ(cached.followupQ)
    setReflection(cached.reflection)
    setReflectionEmpty(cached.reflectionEmpty)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate])

  const wordCount = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0

  // Persist to DB only — called by the debounce timer while the user is still typing
  const saveToDb = useCallback(async (text: string, date: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setStatus('saving')
    try {
      await saveJournalAction(trimmed, date)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2500)
    } catch {
      setStatus('idle')
    }
  }, [])

  // Fire AI once per date — called only on blur/save, never by the auto-save debounce.
  // Results are cached in aiCacheRef so switching dates and back restores them.
  const triggerAI = useCallback((text: string, date: string) => {
    if (getCache(date).aiFetched) return
    setCache(date, { aiFetched: true })

    const trimmed = text.trim()
    if (!trimmed) return
    const words = trimmed.split(/\s+/).filter(Boolean).length

    // Too short for anything meaningful — skip
    if (words < 10) return

    if (words < 20) {
      // Very short: only try a follow-up question
      fetch('/api/followup/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed, type: 'journal' }),
      })
        .then(r => r.json())
        .then(({ question }) => {
          if (question) { setCache(date, { followupQ: question }); setFollowupQ(question) }
        })
        .catch(() => {})
    } else {
      // 20+ words: try reflection first; if null, fall back to follow-up question
      setReflectionLoading(true)
      fetch('/api/journal/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      })
        .then(r => r.json())
        .then(({ reflection: r }) => {
          if (r) {
            setCache(date, { reflection: r })
            setReflection(r)
          } else {
            // Reflection found nothing — try a follow-up question as fallback
            return fetch('/api/followup/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: trimmed, type: 'journal' }),
            })
              .then(r2 => r2.json())
              .then(({ question }) => {
                if (question) {
                  setCache(date, { followupQ: question })
                  setFollowupQ(question)
                } else {
                  // Both APIs returned null — show a brief neutral close
                  setCache(date, { reflectionEmpty: true })
                  setReflectionEmpty(true)
                  setTimeout(() => {
                    setCache(date, { reflectionEmpty: false })
                    setReflectionEmpty(false)
                  }, 4000)
                }
              })
          }
        })
        .catch(() => {})
        .finally(() => setReflectionLoading(false))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChange = (val: string) => {
    setContent(val)
    setStatus('idle')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => saveToDb(val, selectedDate), 1800)
  }

  const handleBlur = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!content.trim()) return
    saveToDb(content, selectedDate)
    triggerAI(content, selectedDate)
  }

  const handleSaveNow = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    saveToDb(content, selectedDate)
    triggerAI(content, selectedDate)
  }

  const handleSelectDate = (date: string) => {
    if (date === selectedDate) return
    setSelectedDate(date)
  }

  const handleWeekOffsetChange = (offset: number) => {
    setWeekOffset(offset)
    // If navigating back to this week, snap selection to today
    if (offset === 0) setSelectedDate(todayStr)
  }

  // Merge today's entry into recentJournals for the dot-map (server entry may be fresher)
  const journalsForMap: JournalEntry[] = existing
    ? [existing, ...recentJournals.filter(j => j.date !== todayStr)]
    : recentJournals

  return (
    <div style={{ maxWidth: '560px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 600, marginBottom: '6px', opacity: 0.85 }}>
            {isToday ? 'Today' : formatDisplayDate(selectedDate)}
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '34px', fontWeight: 400, color: 'var(--text-0)', lineHeight: 1.15 }}>
            Your <em style={{ fontStyle: 'italic', color: 'var(--text-1)' }}>journal.</em>
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-2)', marginTop: '6px' }}>
            Write freely. Locus reflects back what matters.
          </div>
        </div>
        {tab && setTab && (
          <div style={{ marginTop: '6px', flexShrink: 0 }}>
            <TabToggle tab={tab} setTab={setTab} todayJournalHasContent={todayJournalHasContent} />
          </div>
        )}
      </div>

      {/* Week dot-map */}
      <WeekDotMap
        recentJournals={journalsForMap}
        selectedDate={selectedDate}
        todayStr={todayStr}
        onSelectDate={handleSelectDate}
        weekOffset={weekOffset}
        onWeekOffsetChange={handleWeekOffsetChange}
      />

      {/* Past-date editing banner */}
      {!isToday && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '16px',
          padding: '10px 14px',
          background: 'var(--gold-dim)',
          border: '1px solid rgba(212,168,83,0.2)',
          borderRadius: '10px',
          animation: 'fadeUp 0.2s var(--ease) both',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--gold)" strokeWidth="1.5">
              <rect x="2" y="3" width="12" height="11" rx="1.5"/>
              <path d="M5 1v3M11 1v3M2 7h12" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: '13px', color: 'var(--gold)', fontWeight: 600 }}>
              {formatDisplayDate(selectedDate)}
            </span>
          </div>
          <button
            onClick={() => { setSelectedDate(todayStr); setWeekOffset(0) }}
            style={{
              fontSize: '12px', color: 'var(--text-2)', background: 'none',
              border: '1px solid var(--border-md)', borderRadius: '6px',
              padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
            }}
          >
            ← Today
          </button>
        </div>
      )}

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '6px' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 400, color: 'var(--text-0)' }}>
          {isToday ? 'Today\'s Journal' : 'Past Entry'}
        </div>
        <div style={{ fontSize: '12px', minWidth: '60px', textAlign: 'right', transition: 'color 0.2s' }}>
          {status === 'saving' && <span style={{ color: 'var(--text-3)' }}>Saving…</span>}
          {status === 'saved'  && <span style={{ color: 'var(--sage)', fontWeight: 600 }}>✓ Saved</span>}
        </div>
      </div>

      <div style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '16px', lineHeight: 1.55 }}>
        {isToday
          ? 'A space for longer reflection — what happened today, how you\'re processing it, what\'s on your mind.'
          : 'Add or update your reflection for this day. Locus will factor it into your patterns.'}
      </div>

      {/* Textarea */}
      <textarea
        value={content}
        onChange={e => handleChange(e.target.value)}
        onBlur={handleBlur}
        rows={9}
        placeholder={isToday
          ? 'Write freely. No structure required — a stream of thought, a few observations, or a detailed account of your day...'
          : `Write a reflection for ${formatDisplayDate(selectedDate)}…`}
        style={{
          width: '100%', background: 'var(--bg-1)',
          border: '1px solid var(--border-md)', borderRadius: '12px',
          padding: '16px', fontFamily: 'var(--font-sans)', fontSize: '14px',
          color: 'var(--text-0)', resize: 'vertical', outline: 'none',
          lineHeight: 1.75, boxSizing: 'border-box', minHeight: '200px',
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
              fontSize: '12px', padding: '4px 12px', background: 'none',
              border: '1px solid var(--border-md)', borderRadius: '6px',
              color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Save now
          </button>
        )}
      </div>

      {/* Locus reflection — loading state */}
      {reflectionLoading && !reflection && (
        <div style={{
          marginTop: '16px', padding: '14px 16px',
          background: 'var(--glass-card-bg)', backdropFilter: 'blur(32px) saturate(180%)', WebkitBackdropFilter: 'blur(32px) saturate(180%)',
          border: '1px solid var(--glass-card-border)', boxShadow: 'var(--glass-card-shadow-sm)',
          borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '10px',
          animation: 'fadeUp 0.25s var(--ease) both',
        }}>
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
          <span style={{ fontSize: '13px', color: 'var(--text-3)', fontStyle: 'italic' }}>
            Locus is reading…
          </span>
          <span style={{ display: 'inline-flex', gap: '4px', alignItems: 'center', marginLeft: '2px' }}>
            {[0, 200, 400].map(delay => (
              <span key={delay} style={{
                width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-3)',
                animation: 'pulse 1.4s ease-in-out infinite', animationDelay: `${delay}ms`,
              }} />
            ))}
          </span>
        </div>
      )}

      {/* Locus reflection — nothing to surface */}
      {reflectionEmpty && (
        <div style={{
          marginTop: '16px', padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'var(--glass-card-bg)', backdropFilter: 'blur(32px) saturate(180%)', WebkitBackdropFilter: 'blur(32px) saturate(180%)',
          border: '1px solid var(--glass-card-border)', boxShadow: 'var(--glass-card-shadow-sm)',
          borderRadius: '12px', animation: 'fadeUp 0.25s var(--ease) both',
        }}>
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
          <span style={{ fontSize: '13px', color: 'var(--text-2)', fontStyle: 'italic' }}>
            Nothing unusual to flag from this entry.
          </span>
        </div>
      )}

      {/* Locus reflection — result */}
      {reflection && !reflectionDismissed && (
        <ReflectionCard reflection={reflection} onDismiss={() => setReflectionDismissed(true)} />
      )}

      {/* Follow-up question */}
      {followupQ && !followupDone && (
        <FollowupQuestion question={followupQ} context={content} onDone={() => setFollowupDone(true)} />
      )}
    </div>
  )
}
