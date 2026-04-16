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

// Returns notes that should surface in today's brief:
// - reminders due within 3 days
// - ideas/resources whose tags overlap with provided topics
export async function getContextualNotes(
  userId: string,
  todayDate: string,
  topicKeywords: string[]
): Promise<MemoryNote[]> {
  const supabase = await createClient()

  const threeDaysOut = new Date(todayDate + 'T12:00:00')
  threeDaysOut.setDate(threeDaysOut.getDate() + 3)
  const until = threeDaysOut.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('memory_notes')
    .select('*')
    .eq('user_id', userId)
    .eq('resolved', false)
    .order('created_at', { ascending: false })

  if (error) { console.error('getContextualNotes:', error); return [] }
  const notes: MemoryNote[] = data ?? []

  return notes.filter(note => {
    // Date-triggered: reminders due within 3 days
    if (note.type === 'reminder' && note.trigger_date) {
      return note.trigger_date >= todayDate && note.trigger_date <= until
    }
    // Topic-triggered: any tag overlaps with today's keywords
    if (topicKeywords.length > 0 && note.ai_tags.length > 0) {
      const lower = topicKeywords.map(k => k.toLowerCase())
      return note.ai_tags.some(tag => lower.some(k => k.includes(tag) || tag.includes(k)))
    }
    return false
  })
}
