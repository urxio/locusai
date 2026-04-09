import { createClient } from '@/lib/supabase/server'
import type { CheckIn } from '@/lib/types'

export async function getTodayCheckin(userId: string): Promise<CheckIn | null> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('check_ins')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single()
  if (error) return null
  return data
}

export async function getRecentCheckins(userId: string, days: number): Promise<CheckIn[]> {
  const supabase = await createClient()
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await supabase
    .from('check_ins')
    .select('*')
    .eq('user_id', userId)
    .gte('date', since.toISOString().split('T')[0])
    .order('date', { ascending: false })
  if (error) { console.error('getRecentCheckins:', error); return [] }
  return data ?? []
}

export async function createCheckin(
  userId: string,
  energy_level: number,
  mood_note: string | null,
  blockers: string[]
): Promise<CheckIn | null> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('check_ins')
    .upsert(
      { user_id: userId, energy_level, mood_note, blockers, date: today, checked_in_at: new Date().toISOString() },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single()
  if (error) { console.error('createCheckin:', error); return null }
  return data
}
