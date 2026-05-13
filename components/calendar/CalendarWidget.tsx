'use client'

import { useState, useEffect } from 'react'
import type { CalendarEvent } from '@/lib/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatEventTime(event: CalendarEvent): string {
  if (event.isAllDay) return 'All day'
  const d = new Date(event.start)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const todayStr = new Date().toLocaleDateString('en-CA')
  const tomorrowDate = new Date(); tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrowStr = tomorrowDate.toLocaleDateString('en-CA')
  if (dateStr === todayStr) return 'Today'
  if (dateStr === tomorrowStr) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function groupByDay(events: CalendarEvent[]): Array<{ label: string; events: CalendarEvent[] }> {
  const groups = new Map<string, CalendarEvent[]>()
  for (const ev of events) {
    const dateKey = ev.start.slice(0, 10)
    if (!groups.has(dateKey)) groups.set(dateKey, [])
    groups.get(dateKey)!.push(ev)
  }
  return Array.from(groups.entries()).map(([, evs]) => ({
    label: getDayLabel(evs[0].start.slice(0, 10)),
    events: evs,
  }))
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CalIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="1" y="2.5" width="14" height="12" rx="2" />
      <path d="M1 6h14M5 1v3M11 1v3" />
    </svg>
  )
}

function EventRow({ event, isLast }: { event: CalendarEvent; isLast: boolean }) {
  const [hov, setHov] = useState(false)
  const isGoogle = event.source === 'google'
  const dotColor = isGoogle ? 'rgba(96,155,210,0.85)' : 'rgba(212,168,83,0.85)'

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '10px',
        padding: '5px 7px', margin: '0 -7px',
        borderRadius: '6px',
        background: hov ? 'rgba(255,255,255,0.04)' : 'transparent',
        transition: 'background 0.12s',
        borderBottom: !isLast ? '1px solid rgba(255,255,255,0.04)' : undefined,
        cursor: 'default',
      }}
    >
      <span style={{
        fontSize: '10.5px', color: 'var(--text-3)', fontWeight: 500,
        minWidth: '56px', paddingTop: '2px', flexShrink: 0,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {formatEventTime(event)}
      </span>

      <span style={{
        width: '5px', height: '5px', borderRadius: '50%',
        background: dotColor, flexShrink: 0, marginTop: '6px',
      }} />

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: '13px', color: 'var(--text-1)', fontWeight: 500,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {event.title}
        </div>
        {event.location && (
          <div style={{
            fontSize: '10.5px', color: 'var(--text-3)', marginTop: '1px', opacity: 0.8,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {event.location}
          </div>
        )}
      </div>
    </div>
  )
}

function DayGroup({ label, events }: { label: string; events: CalendarEvent[] }) {
  const isToday = label === 'Today'
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
        <span style={{
          fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: isToday ? 'var(--gold)' : 'rgba(255,255,255,0.3)',
          background: isToday ? 'rgba(212,168,83,0.1)' : 'transparent',
          borderRadius: '3px', padding: isToday ? '1px 5px' : '1px 0',
          flexShrink: 0,
        }}>
          {label}
        </span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
      </div>
      <div>
        {events.map((ev, i) => (
          <EventRow key={ev.id} event={ev} isLast={i === events.length - 1} />
        ))}
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {[50, 75, 55, 40].map((w, i) => (
        <div key={i} style={{
          height: '13px', width: `${w}%`, borderRadius: '6px',
          background: 'rgba(255,255,255,0.06)',
          animation: 'pulse-shimmer 1.5s ease-in-out infinite',
          animationDelay: `${i * 0.1}s`,
        }} />
      ))}
    </div>
  )
}

// ── Main widget ───────────────────────────────────────────────────────────────

export default function CalendarWidget() {
  const [events, setEvents] = useState<CalendarEvent[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/calendar/events')
      .then(r => r.json())
      .then(data => setEvents(data.events ?? []))
      .catch(() => setError(true))
  }, [])

  if (events === null && !error) return (
    <div style={{
      background: 'var(--bg-1)', border: '1px solid var(--border)',
      borderRadius: '14px', overflow: 'hidden',
    }}>
      <Skeleton />
    </div>
  )

  if (error || !events?.length) return null

  const grouped = groupByDay(events)
  const visibleGroups = grouped.slice(0, 4)
  const totalHidden = events.length - visibleGroups.reduce((s, g) => s + g.events.length, 0)

  return (
    <div style={{
      background: 'var(--bg-1)', border: '1px solid var(--border)',
      borderRadius: '14px', overflow: 'hidden',
      animation: 'fadeUp 0.3s var(--ease) both',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '7px',
        padding: '11px 16px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        color: 'var(--text-3)',
      }}>
        <CalIcon />
        <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Next 7 days
        </span>
        <div style={{ flex: 1 }} />
        <span style={{
          fontSize: '10px', background: 'rgba(255,255,255,0.07)',
          borderRadius: '10px', padding: '1px 7px', fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {events.length}
        </span>
      </div>

      {/* Event list */}
      <div style={{ padding: '12px 16px 10px' }}>
        {visibleGroups.map(group => (
          <DayGroup key={group.label} label={group.label} events={group.events} />
        ))}

        {totalHidden > 0 && (
          <div style={{
            fontSize: '11px', color: 'var(--text-3)',
            paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            +{totalHidden} more event{totalHidden !== 1 ? 's' : ''}
            <span style={{ opacity: 0.45, fontSize: '13px', lineHeight: 1 }}>›</span>
          </div>
        )}
      </div>
    </div>
  )
}
