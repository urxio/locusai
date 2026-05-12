/**
 * Shared calendar context utilities for AI prompt injection.
 *
 * All three AI features (brief, pulse, weekly) import from here so the
 * prompt format is defined once and maintained in a single place.
 */

import type { CalendarEvent } from '@/lib/types'

/** Format a start datetime for display in the AI prompt. */
function formatEventTime(event: CalendarEvent): string {
  if (event.isAllDay) {
    // e.g. "Mon May 12 (all day)"
    const d = new Date(event.start + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' (all day)'
  }
  const d = new Date(event.start)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/**
 * Formats upcoming calendar events as a labeled text block for AI prompts.
 * Returns null when there are no events — callers should skip the block entirely
 * so the AI never sees an empty calendar section.
 */
export function formatCalendarForPrompt(events: CalendarEvent[]): string | null {
  if (!events.length) return null

  const lines: string[] = []
  lines.push('UPCOMING CALENDAR EVENTS (next 7 days)')

  for (const ev of events.slice(0, 15)) {
    const time     = formatEventTime(ev)
    const location = ev.location ? ` @ ${ev.location}` : ''
    lines.push(`  • ${time}: ${ev.title}${location}`)
  }

  if (events.length > 15) {
    lines.push(`  …and ${events.length - 15} more`)
  }

  return lines.join('\n')
}

/**
 * Compact single-line summary for the pulse (home greeting) prompt.
 * Shows only today's events to keep the pulse context tight.
 */
export function formatCalendarForPulse(events: CalendarEvent[], todayDate: string): string | null {
  const todayEvents = events.filter(ev => ev.start.startsWith(todayDate))
  if (!todayEvents.length) return null

  const titles = todayEvents.slice(0, 3).map(ev => {
    if (ev.isAllDay) return `${ev.title} (all day)`
    const t = new Date(ev.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    return `${ev.title} at ${t}`
  })

  const suffix = todayEvents.length > 3 ? ` (+${todayEvents.length - 3} more)` : ''
  return `Today's calendar: ${titles.join(', ')}${suffix}`
}
