'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserLocalDate } from '@/lib/db/users'
import type { UserMemory, SelfProfile } from '@/lib/ai/memory'

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

export type ProfileInput = {
  occupation: string
  relationship_status: SelfProfile['relationship_status']
  has_kids: boolean | null
  work_arrangement: SelfProfile['work_arrangement']
  personality: string[]
  life_context: string
}

export async function completeOnboarding(
  goals: GoalInput[],
  habits: HabitInput[],
  profile: ProfileInput,
  firstCheckin: { energy_level: number; mood_note: string | null },
  timezone?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const today = await getUserLocalDate(user.id)

  // 1. Save goals
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

  // 2. Save habits
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

  // 3. Save self profile to user_memory JSONB
  const hasProfile = profile.occupation || profile.relationship_status || profile.personality.length > 0 || profile.life_context
  if (hasProfile) {
    const { data: existing } = await supabase
      .from('user_memory')
      .select('data')
      .eq('user_id', user.id)
      .single()
    const current = (existing?.data ?? {}) as UserMemory
    const selfProfile: SelfProfile = {
      ...profile,
      saved_at: new Date().toISOString(),
    }
    await supabase
      .from('user_memory')
      .upsert({ user_id: user.id, data: { ...current, self_profile: selfProfile } }, { onConflict: 'user_id' })
  }

  // 4. Save first check-in
  await supabase.from('check_ins').upsert(
    {
      user_id: user.id,
      energy_level: firstCheckin.energy_level,
      mood_note: firstCheckin.mood_note,
      blockers: [],
      date: today,
      checked_in_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,date' }
  )

  // 5. Mark onboarded
  await supabase
    .from('users')
    .update({
      onboarded_at: new Date().toISOString(),
      ...(timezone ? { timezone } : {}),
    })
    .eq('id', user.id)

  revalidatePath('/brief')
  revalidatePath('/checkin')
  revalidatePath('/goals')
}
