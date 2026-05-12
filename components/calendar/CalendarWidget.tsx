'use client'

import { useState, useEffect } from 'react'
import type { CalendarEvent } from '@/lib/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatEventTime(event: CalendarEvent): string {
  if (event.isAllDay) return 'All day'
  const d = new Date(event.start)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function getDayLabel(dateStr: string, isAllDay: boolean): string {
  const d = new Date(isAllDay ? dateStr + 'T12:00:00' : dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

// Group events by their date string (YYYY-MM-DD)
function groupByDay(events: CalendarEvent[]): Array<{ label: string; events: CalendarEvent[] }> {
  const groups = new Map<string, CalendarEvent[]>()

  for (const ev of events) {
    const dateKey = ev.start.slice(0, 10)
    if (!groups.has(dateKey)) groups.set(dateKey, [])
    groups.get(dateKey)!.push(ev)
  }

  return Array.from(groups.entries()).map(([dateKey, evs]) => ({
    label: getDayLabel(dateKey, evs[0].isAllDay),
    events: evs,
  }))
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.6 }}>
      <rect x="1" y="2.5" width="14" height="12" rx="2" />
      <path d="M1 6h14M5 1v3M11 1v3" />
    </svg>
  )
}

function EventRow({ event }: { event: CalendarEvent }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      padding: '6px 0',
    }}>
      {/* Time pill */}
      <span style={{
        fontSize: '11px', color: 'var(--text-3)', fontWeight: 500,
        minWidth: '52px', paddingTop: '1px', flexShrink: 0,
      }}>
        {formatEventTime(event)}
      </span>

      {/* Title + location */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: '13px', color: 'var(--text-1)', fontWeight: 500,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {event.title}
        </div>
        {event.location && (
          <div style={{
            fontSize: '11px', color: 'var(--text-3)', marginTop: '1px',
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
    <div>
      {/* Day header */}
      <div style={{
        fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.07em',
        textTransform: 'uppercase',
        color: isToday ? 'var(--gold)' : 'var(--text-3)',
        marginBottom: '2px',
      }}>
        {label}
      </div>

      {/* Events */}
      <div style={{ borderLeft: `2px solid ${isToday ? 'var(--gold)' : 'var(--border)'}`, paddingLeft: '10px', marginBottom: '12px' }}>
        {events.map(ev => <EventRow key={ev.id} event={ev} />)}
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px 18px' }}>
      {[40, 70, 55].map((w, i) => (
        <div key={i} style={{
          height: '14px', width: `${w}%`, borderRadius: '6px',
          background: 'var(--bg-3)', opacity: 0.6,
          animation: 'pulse-shimmer 1.5s ease-in-out infinite',
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

  // Loading
  if (events === null && !error) return (
    <div style={{
      background: 'var(--bg-1)', border: '1px solid var(--border)',
      borderRadius: '14px', overflow: 'hidden',
    }}>
      <Skeleton />
    </div>
  )

  // Error or no events — render nothing (widget disappears gracefully)
  if (error || !events?.length) return null

  const grouped = groupByDay(events)
  const visibleGroups = grouped.slice(0, 4) // show max 4 days
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
        padding: '13px 18px 10px',
        borderBottom: '1px solid var(--border)',
      }}>
        <CalIcon />
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
          Next 7 days
        </span>
      </div>

      {/* Event list */}
      <div style={{ padding: '12px 18px' }}>
        {visibleGroups.map(group => (
          <DayGroup key={group.label} label={group.label} events={group.events} />
        ))}

        {totalHidden > 0 && (
          <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>
            +{totalHidden} more event{totalHidden !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
}
