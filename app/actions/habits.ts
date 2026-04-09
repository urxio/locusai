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
  frequency: 'daily' | '3x_week' | 'weekdays'
}

export async function createHabitAction(data: HabitFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const target_count = data.frequency === 'daily' ? 7 : data.frequency === '3x_week' ? 3 : 5

  const { error } = await supabase.from('habits').insert({
    user_id: user.id,
    name: data.name.trim(),
    emoji: data.emoji,
    frequency: data.frequency,
    target_count,
  })
  if (error) throw new Error(error.message)

  revalidatePath('/habits')
  revalidatePath('/brief')
}

export async function updateHabitAction(habitId: string, data: HabitFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const target_count = data.frequency === 'daily' ? 7 : data.frequency === '3x_week' ? 3 : 5

  const { error } = await supabase
    .from('habits')
    .update({ name: data.name.trim(), emoji: data.emoji, frequency: data.frequency, target_count })
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
