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
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5 }}>
      <rect x="1" y="2.5" width="14" height="12" rx="2" />
      <path d="M1 6h14M5 1v3M11 1v3" />
    </svg>
  )
}

function EventRow({ event }: { event: CalendarEvent }) {
  const [hov, setHov] = useState(false)
  const isGoogle = event.source === 'google'
  const dotColor = isGoogle ? 'rgba(96,155,210,0.8)' : 'rgba(212,168,83,0.8)'

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={event.title + (event.location ? ` · ${event.location}` : '')}
      style={{
        display: 'flex', alignItems: 'center', gap: '7px',
        padding: '3px 6px', margin: '0 -6px',
        borderRadius: '5px',
        background: hov ? 'rgba(255,255,255,0.05)' : 'transparent',
        transition: 'background 0.12s',
        cursor: 'default',
      }}
    >
      <span style={{
        fontSize: '10px', color: 'rgba(255,255,255,0.32)', fontWeight: 500,
        minWidth: '50px', flexShrink: 0,
        fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em',
      }}>
        {formatEventTime(event)}
      </span>

      <span style={{
        width: '4px', height: '4px', borderRadius: '50%',
        background: dotColor, flexShrink: 0,
      }} />

      <span style={{
        fontSize: '12px', color: 'rgba(255,255,255,0.82)', fontWeight: 500,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
        letterSpacing: '0.005em',
      }}>
        {event.title}
      </span>
    </div>
  )
}

function DayGroup({ label, events, isLast }: { label: string; events: CalendarEvent[]; isLast: boolean }) {
  const isToday = label === 'Today'
  return (
    <div style={{ marginBottom: isLast ? 0 : '8px' }}>
      {/* Day label row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        marginBottom: '2px', paddingLeft: '6px',
      }}>
        <span style={{
          fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: isToday ? 'rgba(212,168,83,0.9)' : 'rgba(255,255,255,0.25)',
        }}>
          {label}
        </span>
        {isToday && (
          <span style={{
            width: '4px', height: '4px', borderRadius: '50%',
            background: 'rgba(212,168,83,0.7)', flexShrink: 0,
          }} />
        )}
      </div>

      {/* Events */}
      {events.map(ev => <EventRow key={ev.id} event={ev} />)}
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
      {[45, 68, 52].map((w, i) => (
        <div key={i} style={{
          height: '11px', width: `${w}%`, borderRadius: '4px',
          background: 'rgba(255,255,255,0.06)',
          animation: 'pulse-shimmer 1.5s ease-in-out infinite',
          animationDelay: `${i * 0.12}s`,
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
      borderRadius: '12px', overflow: 'hidden',
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
      borderRadius: '12px', overflow: 'hidden',
      animation: 'fadeUp 0.3s var(--ease) both',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '8px 14px 7px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        color: 'rgba(255,255,255,0.35)',
      }}>
        <CalIcon />
        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Next 7 days
        </span>
        <div style={{ flex: 1 }} />
        <span style={{
          fontSize: '9.5px', background: 'rgba(255,255,255,0.07)',
          borderRadius: '8px', padding: '1px 6px', fontWeight: 600,
          color: 'rgba(255,255,255,0.4)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {events.length}
        </span>
      </div>

      {/* Event list */}
      <div style={{ padding: '8px 14px' }}>
        {visibleGroups.map((group, i) => (
          <DayGroup
            key={group.label}
            label={group.label}
            events={group.events}
            isLast={i === visibleGroups.length - 1 && totalHidden === 0}
          />
        ))}

        {totalHidden > 0 && (
          <div style={{
            fontSize: '10px', color: 'rgba(255,255,255,0.25)',
            paddingTop: '5px', marginTop: '3px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', gap: '3px',
          }}>
            +{totalHidden} more
            <span style={{ opacity: 0.5 }}>›</span>
          </div>
        )}
      </div>
    </div>
  )
}
