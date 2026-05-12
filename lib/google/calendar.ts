/**
 * Google Calendar core utility.
 *
 * Responsibilities:
 *  - Silently refresh expired access tokens (inline, demand-driven)
 *  - Fetch events from all user calendars for the next 7 days
 *  - Cache events in DB; return cached data when fresh (< 30 min)
 *
 * This module never throws — all functions return empty arrays on any error
 * so calendar failures never break AI brief generation.
 */

import {
  getCalendarTokens,
  saveCalendarTokens,
  deleteCalendarTokens,
  getCachedCalendarEvents,
  storeCachedCalendarEvents,
  type CalendarTokens,
} from '@/lib/db/calendar'
import type { CalendarEvent } from '@/lib/types'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

function getGoogleCredentials() {
  const clientId     = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    console.error('[calendar] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET env var is not set')
    return null
  }
  return { clientId, clientSecret }
}

// ── Token refresh ─────────────────────────────────────────────────────────────

/**
 * Returns a valid access token for the given user, refreshing it if needed.
 * Returns null if the user has no calendar connected or the refresh fails.
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const tokens = await getCalendarTokens(userId)
  if (!tokens) return null

  // Buffer: refresh 5 minutes before actual expiry
  const expiresAt = new Date(tokens.expires_at).getTime()
  if (expiresAt > Date.now() + 5 * 60 * 1000) {
    return tokens.access_token
  }

  // Token expired (or about to) — refresh it
  try {
    const creds = getGoogleCredentials()
    if (!creds) return null

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     creds.clientId,
        client_secret: creds.clientSecret,
        refresh_token: tokens.refresh_token,
        grant_type:    'refresh_token',
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      // invalid_grant means the user revoked access — clean up
      if (body.error === 'invalid_grant') {
        await deleteCalendarTokens(userId)
      }
      console.error('[calendar] token refresh failed:', body)
      return null
    }

    const data = await res.json()
    const newTokens: CalendarTokens = {
      access_token:  data.access_token,
      refresh_token: data.refresh_token ?? tokens.refresh_token, // Google may rotate it
      expires_at:    new Date(Date.now() + data.expires_in * 1000).toISOString(),
    }
    await saveCalendarTokens(userId, newTokens)
    return newTokens.access_token
  } catch (err) {
    console.error('[calendar] token refresh error:', err)
    return null
  }
}

// ── Event fetching ────────────────────────────────────────────────────────────

type GCalEvent = {
  id: string
  summary?: string
  start: { dateTime?: string; date?: string }
  end:   { dateTime?: string; date?: string }
  location?: string
  description?: string
}

type GCalList = { items: Array<{ id: string; summary?: string }> }
type GCalEvents = { items: GCalEvent[] }

async function apiFetch<T>(url: string, accessToken: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    return res.json() as Promise<T>
  } catch {
    return null
  }
}

/** Fetch events from Google Calendar API for all calendars, next 7 days. */
async function fetchFromGoogle(accessToken: string): Promise<CalendarEvent[]> {
  const calList = await apiFetch<GCalList>(
    `${CALENDAR_API}/users/me/calendarList?minAccessRole=reader`,
    accessToken,
  )
  if (!calList?.items?.length) return []

  const now     = new Date()
  const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const timeMin = now.toISOString()
  const timeMax = in7days.toISOString()

  const eventFetches = calList.items.map(cal =>
    apiFetch<GCalEvents>(
      `${CALENDAR_API}/calendars/${encodeURIComponent(cal.id)}/events` +
      `?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=50`,
      accessToken,
    ).then(data => ({ cal, data }))
  )

  const results = await Promise.all(eventFetches)

  const events: CalendarEvent[] = []
  for (const { cal, data } of results) {
    if (!data?.items) continue
    for (const ev of data.items) {
      const isAllDay = !ev.start.dateTime
      events.push({
        id:           ev.id,
        title:        ev.summary ?? '(No title)',
        start:        ev.start.dateTime ?? ev.start.date ?? '',
        end:          ev.end.dateTime   ?? ev.end.date   ?? '',
        isAllDay,
        calendarName: cal.summary ?? 'Calendar',
        location:     ev.location ?? null,
        description:  ev.description
          ? ev.description.replace(/<[^>]+>/g, '').slice(0, 200)
          : null,
      })
    }
  }

  // Sort all events by start time across all calendars
  return events.sort((a, b) => a.start.localeCompare(b.start))
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the user's upcoming calendar events (next 7 days).
 * Reads from cache when fresh; falls back to Google API when stale.
 * Always returns [] for users who haven't connected their calendar.
 */
export async function getCalendarEventsForAI(userId: string): Promise<CalendarEvent[]> {
  try {
    // 1. Try cache first
    const cached = await getCachedCalendarEvents(userId)
    if (cached) return cached

    // 2. Cache miss — need a valid token
    const accessToken = await getValidAccessToken(userId)
    if (!accessToken) return []

    // 3. Fetch from Google
    const events = await fetchFromGoogle(accessToken)

    // 4. Persist to cache (fire-and-forget — don't block the caller)
    storeCachedCalendarEvents(userId, events).catch(err =>
      console.error('[calendar] cache store error:', err)
    )

    return events
  } catch (err) {
    console.error('[calendar] getCalendarEventsForAI error:', err)
    return []
  }
}
