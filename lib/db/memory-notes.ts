import { createClient } from '@/lib/supabase/server'
import type { MemoryNote } from '@/lib/types'

export async function getActiveMemoryNotes(userId: string): Promise<MemoryNote[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('memory_notes')
    .select('*')
    .eq('user_id', userId)
    .eq('resolved', false)
    .order('created_at', { ascending: false })
  if (error) { console.error('getActiveMemoryNotes:', error); return [] }
  return data ?? []
}

const STOP_WORDS = new Set([
  'the','and','for','with','to','a','an','in','on','at','is','it','of','or',
  'do','my','me','i','we','he','she','they','have','has','be','are','was','will',
  'not','but','so','if','this','that','from','by','up','as','get','go','its',
])

// Returns notes that should surface in today's brief, in priority order.
export async function getContextualNotes(
  userId: string,
  todayDate: string,
  topicKeywords: string[]
): Promise<MemoryNote[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('memory_notes')
    .select('*')
    .eq('user_id', userId)
    .eq('resolved', false)
    .order('created_at', { ascending: false })

  if (error) { console.error('getContextualNotes:', error); return [] }
  const notes: MemoryNote[] = data ?? []
  if (notes.length === 0) return []

  // Date windows
  const sevenDaysOut = new Date(todayDate + 'T12:00:00')
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7)
  const until7 = sevenDaysOut.toISOString().split('T')[0]

  const recentCutoff = new Date(todayDate + 'T12:00:00')
  recentCutoff.setDate(recentCutoff.getDate() - 5)
  const recentSince = recentCutoff.toISOString().split('T')[0]

  // Clean topic keywords: remove stop words and short tokens
  const cleanKeywords = topicKeywords
    .flatMap(k => k.toLowerCase().split(/\s+/))
    .filter(k => k.length >= 4 && !STOP_WORDS.has(k))

  const seen = new Set<string>()
  const result: MemoryNote[] = []

  function add(note: MemoryNote) {
    if (!seen.has(note.id)) { seen.add(note.id); result.push(note) }
  }

  // ── Priority 1: Reminders with an upcoming date (within 7 days) ──
  notes
    .filter(n => n.type === 'reminder' && n.trigger_date && n.trigger_date >= todayDate && n.trigger_date <= until7)
    .sort((a, b) => a.trigger_date!.localeCompare(b.trigger_date!))
    .forEach(add)

  // ── Priority 2: Reminders with no date (action-flagged, always surface) ──
  notes
    .filter(n => n.type === 'reminder' && !n.trigger_date)
    .forEach(add)

  // ── Priority 3: Ideas/resources captured in the last 5 days (fresh captures) ──
  notes
    .filter(n => n.type !== 'reminder' && n.created_at.slice(0, 10) >= recentSince)
    .forEach(add)

  // ── Priority 4: Ideas/resources whose tags overlap today's context ──
  if (cleanKeywords.length > 0) {
    notes
      .filter(n => n.type !== 'reminder' && n.ai_tags.length > 0)
      .filter(n => n.ai_tags.some(tag =>
        cleanKeywords.some(k => k.includes(tag) || tag.includes(k))
      ))
      .forEach(add)
  }

  // ── Priority 5: Fallback — surface oldest unresolved notes so nothing stays buried ──
  if (result.length < 3) {
    notes
      .slice(-5) // oldest first (order is desc, so last = oldest)
      .forEach(add)
  }

  // Cap at 6 so the brief isn't overwhelmed
  return result.slice(0, 6)
}
