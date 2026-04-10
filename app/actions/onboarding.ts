'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type GoalInput = {
  title: string
  category: string
  timeframe: string
  next_action: string
}

export type HabitInput = {
  name: string
  emoji: string
  frequency: string
}

export async function completeOnboarding(goals: GoalInput[], habits: HabitInput[], timezone?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  if (goals.length > 0) {
    const { error } = await supabase.from('goals').insert(
      goals.map(g => ({
        user_id: user.id,
        title: g.title,
        category: g.category,
        timeframe: g.timeframe,
        next_action: g.next_action,
        progress_pct: 0,
        status: 'active',
        target_date: null,
      }))
    )
    if (error) throw new Error('Failed to save goals: ' + error.message)
  }

  if (habits.length > 0) {
    const { error } = await supabase.from('habits').insert(
      habits.map(h => ({
        user_id: user.id,
        name: h.name,
        emoji: h.emoji,
        frequency: h.frequency,
        target_count: h.frequency === 'daily' ? 7 : h.frequency === '3x_week' ? 3 : 5,
      }))
    )
    if (error) throw new Error('Failed to save habits: ' + error.message)
  }

  await supabase
    .from('users')
    .update({
      onboarded_at: new Date().toISOString(),
      ...(timezone ? { timezone } : {}),
    })
    .eq('id', user.id)

  revalidatePath('/brief')
  revalidatePath('/goals')
}
