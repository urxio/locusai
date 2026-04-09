import { createClient } from '@/lib/supabase/server'
import type { Goal, GoalStep, GoalWithSteps } from '@/lib/types'

export async function getActiveGoals(userId: string): Promise<Goal[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
  if (error) { console.error('getActiveGoals:', error); return [] }
  return data ?? []
}

export async function getAllGoals(userId: string): Promise<Goal[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) { console.error('getAllGoals:', error); return [] }
  return data ?? []
}

export async function getAllGoalsWithSteps(userId: string): Promise<GoalWithSteps[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('goals')
    .select('*, goal_steps(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) { console.error('getAllGoalsWithSteps:', error); return [] }
  return (data ?? []).map(g => ({
    ...g,
    steps: ((g.goal_steps ?? []) as GoalStep[]).sort((a, b) => a.position - b.position),
  }))
}

export async function createGoal(userId: string, goal: Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Goal | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('goals')
    .insert({ ...goal, user_id: userId })
    .select()
    .single()
  if (error) { console.error('createGoal:', error); return null }
  return data
}

export async function updateGoalProgress(goalId: string, progress_pct: number, next_action?: string): Promise<void> {
  const supabase = await createClient()
  const update: Partial<Goal> = { progress_pct }
  if (next_action !== undefined) update.next_action = next_action
  const { error } = await supabase.from('goals').update(update).eq('id', goalId)
  if (error) console.error('updateGoalProgress:', error)
}

export async function updateGoal(goalId: string, updates: Partial<Goal>): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('goals').update(updates).eq('id', goalId)
  if (error) console.error('updateGoal:', error)
}
