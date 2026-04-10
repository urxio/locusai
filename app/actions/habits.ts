'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/* ── LOG / UNLOG (any date) ── */

export async function logHabitAction(habitId: string, date?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const logged_date = date ?? new Date().toISOString().split('T')[0]
  const { error } = await supabase
    .from('habit_logs')
    .upsert(
      { habit_id: habitId, user_id: user.id, logged_date },
      { onConflict: 'habit_id,logged_date' }
    )
  if (error) throw new Error(error.message)

  revalidatePath('/habits')
  revalidatePath('/review')
  revalidatePath('/brief')
}

export async function unlogHabitAction(habitId: string, date?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const logged_date = date ?? new Date().toISOString().split('T')[0]
  const { error } = await supabase
    .from('habit_logs')
    .delete()
    .eq('habit_id', habitId)
    .eq('user_id', user.id)
    .eq('logged_date', logged_date)
  if (error) throw new Error(error.message)

  revalidatePath('/habits')
  revalidatePath('/review')
  revalidatePath('/brief')
}

/* ── CRUD ── */

export type HabitFormData = {
  name: string
  emoji: string
  days_of_week: number[]   // empty [] = every day; [1,3,5] = Mon/Wed/Fri
  ends_at: string | null   // ISO date or null
}

/** Derives a human-readable frequency label and weekly target from days_of_week */
export function deriveFrequencyMeta(days: number[]): { frequency: string; target_count: number } {
  const sorted = [...days].sort((a, b) => a - b)
  if (sorted.length === 0 || sorted.length === 7) return { frequency: 'Daily', target_count: 7 }
  if (JSON.stringify(sorted) === JSON.stringify([1, 2, 3, 4, 5])) return { frequency: 'Weekdays', target_count: 5 }
  if (JSON.stringify(sorted) === JSON.stringify([0, 6])) return { frequency: 'Weekends', target_count: 2 }
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return {
    frequency: sorted.map(d => names[d]).join(' · '),
    target_count: sorted.length,
  }
}

export async function createHabitAction(data: HabitFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { frequency, target_count } = deriveFrequencyMeta(data.days_of_week)
  const days_of_week = data.days_of_week.length > 0 ? data.days_of_week : null

  const { data: created, error } = await supabase.from('habits').insert({
    user_id: user.id,
    name: data.name.trim(),
    emoji: data.emoji,
    frequency,
    days_of_week,
    target_count,
    ends_at: data.ends_at || null,
  }).select().single()
  if (error) throw new Error(error.message)

  revalidatePath('/habits')
  revalidatePath('/brief')

  return created
}

export async function updateHabitAction(habitId: string, data: HabitFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { frequency, target_count } = deriveFrequencyMeta(data.days_of_week)
  const days_of_week = data.days_of_week.length > 0 ? data.days_of_week : null

  const { error } = await supabase
    .from('habits')
    .update({
      name: data.name.trim(),
      emoji: data.emoji,
      frequency,
      days_of_week,
      target_count,
      ends_at: data.ends_at || null,
    })
    .eq('id', habitId)
    .eq('user_id', user.id)
  if (error) throw new Error(error.message)

  revalidatePath('/habits')
  revalidatePath('/brief')
}

export async function deleteHabitAction(habitId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Logs cascade-delete via FK in Supabase, but delete explicitly to be safe
  await supabase.from('habit_logs').delete().eq('habit_id', habitId).eq('user_id', user.id)

  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', habitId)
    .eq('user_id', user.id)
  if (error) throw new Error(error.message)

  revalidatePath('/habits')
  revalidatePath('/review')
  revalidatePath('/brief')
}
