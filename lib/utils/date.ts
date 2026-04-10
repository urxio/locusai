/**
 * Date utilities — timezone-safe helpers.
 *
 * Problem: `new Date().toISOString()` is always UTC. Vercel servers run UTC.
 * A user at UTC+2 at 11pm Thursday will get Friday from toISOString().
 *
 * Solution:
 * - Server-side: use `dateInTz(timezone)` with the user's stored timezone
 * - Client-side: use `localDateStr()` which reads from the browser's local clock
 */

/**
 * Server-safe. Returns 'YYYY-MM-DD' in the given IANA timezone.
 * Falls back to UTC if timezone is invalid.
 *
 * @example dateInTz('America/New_York') // '2026-04-09'
 */
export function dateInTz(timezone = 'UTC'): string {
  try {
    // en-CA locale formats as YYYY-MM-DD — exactly what we want
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date())
  } catch {
    // Invalid timezone — fall back to UTC
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(new Date())
  }
}

/**
 * Client-side only. Returns 'YYYY-MM-DD' in the user's browser local time.
 * Do NOT call this in server components / server actions.
 */
export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Returns a date `n` days before `fromDate` (YYYY-MM-DD string), in the given timezone.
 */
export function daysAgoInTz(days: number, timezone = 'UTC'): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(d)
  } catch {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(d)
  }
}
