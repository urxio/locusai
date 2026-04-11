'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type GoalFormData = {
  title: string
  category: string
  timeframe: string
  progress_pct: number
  next_action: string
  target_date: string | null
  status: string
}

export async function createGoalAction(data: GoalFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: created, error } = await supabase.from('goals').insert({
    user_id: user.id,
    title: data.title,
    category: data.category,
    timeframe: data.timeframe,
    progress_pct: data.progress_pct,
    next_action: data.next_action,
    target_date: data.target_date || null,
    status: data.status,
  }).select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/goals')
  revalidatePath('/brief')
  return created
}

export async function updateGoalAction(goalId: string, data: Partial<GoalFormData>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('goals')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', goalId)
    .eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/goals')
  revalidatePath('/brief')
}

export async function deleteGoalAction(goalId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', goalId)
    .eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/goals')
  revalidatePath('/brief')
}
