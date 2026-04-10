import { createClient } from '@/lib/supabase/server'
import type { JournalEntry } from '@/lib/types'
import { getUserLocalDate } from '@/lib/db/users'

export async function getTodayJournal(userId: string, localDate?: string): Promise<JournalEntry | null> {
  const supabase = await createClient()
  const today = localDate ?? await getUserLocalDate(userId)
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single()
  if (error) return null
  return data as JournalEntry
}

export async function getRecentJournals(userId: string, days: number = 7): Promise<JournalEntry[]> {
  const supabase = await createClient()
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('date', since.toISOString().split('T')[0])
    .gt('content', '')
    .order('date', { ascending: false })
  if (error) { console.error('getRecentJournals:', error); return [] }
  return (data ?? []) as JournalEntry[]
}

export async function upsertJournal(
  userId: string,
  date: string,
  content: string
): Promise<JournalEntry | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('journal_entries')
    .upsert(
      { user_id: userId, date, content, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single()
  if (error) { console.error('upsertJournal:', error); return null }
  return data as JournalEntry
}
