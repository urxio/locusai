'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function logHabitAction(habitId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const today = new Date().toISOString().split('T')[0]
  const { error } = await supabase
    .from('habit_logs')
    .upsert(
      { habit_id: habitId, user_id: user.id, logged_date: today },
      { onConflict: 'habit_id,logged_date' }
    )
  if (error) throw new Error(error.message)

  revalidatePath('/habits')
  revalidatePath('/review')
  revalidatePath('/brief')
}

export async function unlogHabitAction(habitId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const today = new Date().toISOString().split('T')[0]
  const { error } = await supabase
    .from('habit_logs')
    .delete()
    .eq('habit_id', habitId)
    .eq('user_id', user.id)
    .eq('logged_date', today)
  if (error) throw new Error(error.message)

  revalidatePath('/habits')
  revalidatePath('/review')
  revalidatePath('/brief')
}
