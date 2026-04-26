'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { saveJournalAction } from '@/app/actions/journal'
import { localDateStr } from '@/lib/utils/date'
import type { JournalEntry } from '@/lib/types'
import FollowupQuestion from './FollowupQuestion'
import { TabToggle, type Tab } from '@/components/checkin/CheckinTabs'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  })
}

function formatShortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  })
}

function formatDayName(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short' })
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

// ─── Date sidebar ─────────────────────────────────────────────────────────────

function DateSidebar({
  todayStr, selectedDate, recentJournals, tab, setTab, todayJournalHasContent,
  onSelectDate,
}: {
  todayStr: string
  selectedDate: string
  recentJournals: JournalEntry[]
  tab?: Tab
  setTab?: (t: Tab) => void
  todayJournalHasContent: boolean
  onSelectDate: (date: string) => void
}) {
  const journalDates = new Set(recentJournals.filter(j => j.content.trim()).map(j => j.date))

  // Build two weeks of days: this week + last week
  const thisWeek = getWeekDays(todayStr, 0)
  const lastWeek = getWeekDays(todayStr, -1)

  function DayRow({ dateStr, isToday, isFuture }: { dateStr: string; isToday: boolean; isFuture: boolean }) {
    const isSelected = dateStr === selectedDate
    const hasEntry = journalDates.has(dateStr)
    const clickable = !isFuture

    return (
      <button
        onClick={() => clickable && onSelectDate(dateStr)}
        disabled={!clickable}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
          padding: '7px 12px', borderRadius: '10px', border: 'none',
          cursor: clickable ? 'pointer' : 'default', fontFamily: 'inherit',
          background: isSelected
            ? 'var(--glass-card-bg-strong)'
            : 'transparent',
          transition: 'background 0.13s',
          opacity: isFuture ? 0.3 : 1,
          boxShadow: isSelected ? 'var(--glass-card-shadow-sm)' : 'none',
        }}
        onMouseEnter={e => { if (clickable && !isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--glass-card-bg)' }}
        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        {/* Day name */}
        <span style={{
          fontSize: '11px', fontWeight: 600, width: '22px', textAlign: 'center', flexShrink: 0,
          color: isSelected ? 'var(--text-0)' : isToday ? 'var(--gold)' : 'var(--text-3)',
          letterSpacing: '0.04em',
        }}>
          {formatDayName(dateStr)}
        </span>

        {/* Date */}
        <span style={{
          fontSize: '12.5px', flex: 1, textAlign: 'left',
          color: isSelected ? 'var(--text-0)' : 'var(--text-2)',
          fontWeight: isSelected || isToday ? 600 : 400,
        }}>
          {isToday ? 'Today' : formatShortDate(dateStr)}
        </span>

        {/* Entry dot */}
        {hasEntry && (
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
            background: isSelected ? 'var(--sage)' : 'var(--sage-dim)',
            border: '1px solid var(--sage)',
          }} />
        )}
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '22px 16px 16px', flexShrink: 0,
        borderBottom: '1px solid var(--glass-card-border-subtle)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: tab && setTab ? '14px' : '0',
        }}>
          <span style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'var(--text-3)',
          }}>
            Journal
          </span>
          <a href="/checkin/history" style={{
            fontSize: '10px', color: 'var(--text-3)', textDecoration: 'none',
            fontWeight: 600, letterSpacing: '0.04em',
            opacity: 0.7,
          }}>
            All →
          </a>
        </div>
        {tab && setTab && (
          <TabToggle tab={tab} setTab={setTab} todayJournalHasContent={todayJournalHasContent} />
        )}
      </div>

      {/* Date list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 6px', scrollbarWidth: 'none' }}>
        {/* This week */}
        <div style={{
          fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--text-3)',
          padding: '4px 12px 6px', opacity: 0.6,
        }}>
          This week
        </div>
        {thisWeek.map(day => (
          <DayRow key={day.dateStr} dateStr={day.dateStr} isToday={day.isToday} isFuture={day.isFuture} />
        ))}

        {/* Last week */}
        <div style={{
          fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--text-3)',
          padding: '14px 12px 6px', opacity: 0.6,
        }}>
          Last week
        </div>
        {lastWeek.map(day => (
          <DayRow key={day.dateStr} dateStr={day.dateStr} isToday={false} isFuture={false} />
        ))}
      </div>
    </div>
  )
}

// ─── Locus icon ───────────────────────────────────────────────────────────────

function LocusIcon() {
  return (
    <div style={{
      width: '22px', height: '22px', borderRadius: '7px', flexShrink: 0,
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
  )
}

// ─── Reflection card ──────────────────────────────────────────────────────────

function ReflectionCard({ reflection, onDismiss }: { reflection: string; onDismiss: () => void }) {
  return (
    <div style={{
      background: 'var(--glass-card-bg)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid var(--glass-card-border-subtle)',
      borderRadius: '14px', overflow: 'hidden',
      animation: 'fadeUp 0.3s var(--ease) both',
    }}>
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--glass-card-border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LocusIcon />
          <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
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
  const CARD_H = 'min(680px, calc(100vh - 156px))'

  const [selectedDate, setSelectedDate] = useState(todayStr)
  const isToday = selectedDate === todayStr

  function entryForDate(date: string): string {
    if (date === todayStr) return existing?.content ?? ''
    return recentJournals.find(j => j.date === date)?.content ?? ''
  }

  const [content, setContent] = useState(entryForDate(todayStr))
  const [status, setStatus]   = useState<'idle' | 'saving' | 'saved'>('idle')

  type AiCache = {
    aiFetched: boolean; followupQ: string | null
    reflection: string | null; reflectionEmpty: boolean
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

  const [followupQ,           setFollowupQ]           = useState<string | null>(() => getCache(todayStr).followupQ)
  const [followupDone,        setFollowupDone]        = useState(false)
  const [reflection,          setReflection]          = useState<string | null>(() => getCache(todayStr).reflection)
  const [reflectionLoading,   setReflectionLoading]   = useState(false)
  const [reflectionDismissed, setReflectionDismissed] = useState(false)
  const [reflectionEmpty,     setReflectionEmpty]     = useState(false)

  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
    setTimeout(() => textareaRef.current?.focus(), 50)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate])

  const wordCount = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0

  const saveToDb = useCallback(async (text: string, date: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setStatus('saving')
    try {
      await saveJournalAction(trimmed, date)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2500)
    } catch { setStatus('idle') }
  }, [])

  const triggerAI = useCallback((text: string, date: string) => {
    if (getCache(date).aiFetched) return
    setCache(date, { aiFetched: true })
    const trimmed = text.trim()
    if (!trimmed) return
    const words = trimmed.split(/\s+/).filter(Boolean).length
    if (words < 10) return

    if (words < 20) {
      fetch('/api/followup/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: trimmed, type: 'journal' }) })
        .then(r => r.json()).then(({ question }) => { if (question) { setCache(date, { followupQ: question }); setFollowupQ(question) } }).catch(() => {})
    } else {
      setReflectionLoading(true)
      fetch('/api/journal/reflect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: trimmed }) })
        .then(r => r.json())
        .then(({ reflection: r }) => {
          if (r) { setCache(date, { reflection: r }); setReflection(r) }
          else {
            return fetch('/api/followup/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: trimmed, type: 'journal' }) })
              .then(r2 => r2.json()).then(({ question }) => {
                if (question) { setCache(date, { followupQ: question }); setFollowupQ(question) }
                else { setCache(date, { reflectionEmpty: true }); setReflectionEmpty(true); setTimeout(() => { setCache(date, { reflectionEmpty: false }); setReflectionEmpty(false) }, 4000) }
              })
          }
        })
        .catch(() => {}).finally(() => setReflectionLoading(false))
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

  const journalsForMap: JournalEntry[] = existing
    ? [existing, ...recentJournals.filter(j => j.date !== todayStr)]
    : recentJournals

  return (
    <div className="page-pad" style={{ maxWidth: '1180px' }}>
      <div className="journal-layout">

        {/* ── LEFT: Date sidebar ── */}
        <div className="glass-card-soft" style={{
          height: CARD_H, overflow: 'hidden', position: 'relative',
        }}>
          {/* Overlay */}
          <div aria-hidden style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
            background: 'var(--card-overlay)', opacity: 0.25,
          }} />
          <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>
            <DateSidebar
              todayStr={todayStr}
              selectedDate={selectedDate}
              recentJournals={journalsForMap}
              tab={tab}
              setTab={setTab}
              todayJournalHasContent={todayJournalHasContent}
              onSelectDate={setSelectedDate}
            />
          </div>
        </div>

        {/* ── RIGHT: Writing card ── */}
        <div className="glass-card" style={{
          height: CARD_H, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', position: 'relative',
        }}>
          {/* Overlay + glow */}
          <div aria-hidden style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
            background: 'var(--card-overlay)', opacity: 0.28,
          }} />
          <div aria-hidden style={{
            position: 'absolute', top: '-60px', right: '-40px',
            width: '300px', height: '300px', borderRadius: '50%',
            background: 'radial-gradient(circle, oklch(0.78 0.07 165 / 0.07) 0%, transparent 70%)',
            pointerEvents: 'none', zIndex: 0,
          }} />

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>

            {/* ── Card top bar ── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 28px 16px', flexShrink: 0,
              borderBottom: '1px solid var(--glass-card-border-subtle)',
              gap: '16px',
            }}>
              <div>
                <div style={{
                  fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: 'var(--gold)', fontWeight: 700, marginBottom: '3px', opacity: 0.85,
                }}>
                  {isToday ? 'Today' : formatDisplayDate(selectedDate)}
                </div>
                <div style={{
                  fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 400,
                  color: 'var(--text-0)', lineHeight: 1.2,
                }}>
                  {isToday ? (
                    <>Your <em style={{ fontStyle: 'italic', color: 'var(--text-1)' }}>journal.</em></>
                  ) : (
                    formatDisplayDate(selectedDate)
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                {/* Save status */}
                <div style={{ fontSize: '12px', minWidth: '52px', textAlign: 'right', transition: 'color 0.2s' }}>
                  {status === 'saving' && <span style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>Saving…</span>}
                  {status === 'saved'  && <span style={{ color: 'var(--sage)', fontWeight: 600 }}>✓ Saved</span>}
                </div>

                {/* Back to today */}
                {!isToday && (
                  <button
                    onClick={() => setSelectedDate(todayStr)}
                    style={{
                      fontSize: '11.5px', color: 'var(--text-2)',
                      background: 'var(--glass-card-bg-strong)',
                      border: '1px solid var(--glass-card-border)',
                      borderRadius: '8px', padding: '5px 12px',
                      cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                      backdropFilter: 'blur(12px)',
                    }}
                  >
                    ← Today
                  </button>
                )}
              </div>
            </div>

            {/* ── Writing area ── */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', scrollbarWidth: 'none' }}>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={e => handleChange(e.target.value)}
                onBlur={handleBlur}
                placeholder={isToday
                  ? 'Write freely — a stream of thought, a few observations, or a detailed account of your day...'
                  : `Write a reflection for ${formatDisplayDate(selectedDate)}…`}
                style={{
                  flex: 1, width: '100%', minHeight: '100%',
                  background: 'transparent', border: 'none', outline: 'none',
                  fontFamily: 'var(--font-sans)', fontSize: '15px',
                  color: 'var(--text-0)', resize: 'none', lineHeight: 1.8,
                  padding: '24px 28px', boxSizing: 'border-box',
                  caretColor: 'var(--gold)',
                }}
              />

              {/* AI cards inside the scrollable area */}
              {(reflectionLoading || reflectionEmpty || (reflection && !reflectionDismissed) || (followupQ && !followupDone)) && (
                <div style={{ padding: '0 28px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

                  {reflectionLoading && !reflection && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '12px 16px',
                      background: 'var(--glass-card-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                      border: '1px solid var(--glass-card-border-subtle)',
                      borderRadius: '14px', animation: 'fadeUp 0.25s var(--ease) both',
                    }}>
                      <LocusIcon />
                      <span style={{ fontSize: '13px', color: 'var(--text-3)', fontStyle: 'italic' }}>Locus is reading…</span>
                      <span style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                        {[0, 200, 400].map(delay => (
                          <span key={delay} style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-3)', animation: 'pulse 1.4s ease-in-out infinite', animationDelay: `${delay}ms` }} />
                        ))}
                      </span>
                    </div>
                  )}

                  {reflectionEmpty && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px',
                      background: 'var(--glass-card-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                      border: '1px solid var(--glass-card-border-subtle)', borderRadius: '14px',
                      animation: 'fadeUp 0.25s var(--ease) both',
                    }}>
                      <LocusIcon />
                      <span style={{ fontSize: '13px', color: 'var(--text-2)', fontStyle: 'italic' }}>
                        Nothing unusual to flag from this entry.
                      </span>
                    </div>
                  )}

                  {reflection && !reflectionDismissed && (
                    <ReflectionCard reflection={reflection} onDismiss={() => setReflectionDismissed(true)} />
                  )}

                  {followupQ && !followupDone && (
                    <FollowupQuestion question={followupQ} context={content} onDone={() => setFollowupDone(true)} />
                  )}
                </div>
              )}
            </div>

            {/* ── Bottom bar ── */}
            <div style={{
              flexShrink: 0, padding: '12px 28px',
              borderTop: '1px solid var(--glass-card-border-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: '12px', color: 'var(--text-3)', opacity: 0.7 }}>
                {wordCount > 0 ? `${wordCount} word${wordCount !== 1 ? 's' : ''}` : 'Auto-saves as you write'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {content.trim() && status !== 'saved' && (
                  <button
                    onClick={handleSaveNow}
                    style={{
                      fontSize: '11.5px', padding: '5px 12px',
                      background: 'var(--glass-card-bg-strong)',
                      border: '1px solid var(--glass-card-border)',
                      borderRadius: '8px', color: 'var(--text-2)',
                      cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                      backdropFilter: 'blur(12px)',
                    }}
                  >
                    Save now
                  </button>
                )}
                <span style={{ fontSize: '11px', color: 'var(--text-3)', opacity: 0.5 }}>
                  Auto-saves · Shift+Enter for new line
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
