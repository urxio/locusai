import { createClient } from '@/lib/supabase/server'
import type { CalendarEvent } from '@/lib/types'

const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

// ── Token helpers ─────────────────────────────────────────────────────────────

export type CalendarTokens = {
  access_token: string
  refresh_token: string
  expires_at: string
}

export async function getCalendarTokens(userId: string): Promise<CalendarTokens | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('google_calendar_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single()
  return data ?? null
}

export async function saveCalendarTokens(
  userId: string,
  tokens: CalendarTokens,
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('google_calendar_tokens')
    .upsert(
      { user_id: userId, ...tokens, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
}

export async function deleteCalendarTokens(userId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('google_calendar_tokens')
    .delete()
    .eq('user_id', userId)
}

export async function isCalendarConnected(userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('google_calendar_tokens')
    .select('user_id')
    .eq('user_id', userId)
    .single()
  return !!data
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

export async function getCachedCalendarEvents(userId: string): Promise<CalendarEvent[] | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('calendar_events_cache')
    .select('events, fetched_at')
    .eq('user_id', userId)
    .single()

  if (!data) return null

  const age = Date.now() - new Date(data.fetched_at).getTime()
  if (age > CACHE_TTL_MS) return null   // stale — caller should refetch

  return data.events as CalendarEvent[]
}

export async function storeCachedCalendarEvents(
  userId: string,
  events: CalendarEvent[],
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('calendar_events_cache')
    .upsert(
      { user_id: userId, events, fetched_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
}

export async function clearCalendarCache(userId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('calendar_events_cache')
    .delete()
    .eq('user_id', userId)
}
