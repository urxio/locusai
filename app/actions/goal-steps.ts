'use server'

import { createClient } from '@/lib/supabase/server'
import { generateGoalSteps } from '@/lib/ai/goal-steps'
import { revalidatePath } from 'next/cache'
import type { GoalStep } from '@/lib/types'

/* ── AI GENERATION ──────────────────────────────────── */

/** Generate AI steps for a newly created goal and save them to DB. */
export async function generateAndSaveStepsAction(goalId: string): Promise<GoalStep[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: goal } = await supabase
    .from('goals')
    .select('title, category, timeframe, target_date, next_action, progress_pct')
    .eq('id', goalId)
    .eq('user_id', user.id)
    .single()
  if (!goal) throw new Error('Goal not found')

  const rawSteps = await generateGoalSteps(goal)
  if (rawSteps.length === 0) return []

  const toInsert = rawSteps.map((s, i) => ({
    goal_id: goalId,
    user_id: user.id,
    title: s.title.trim(),
    due_date: s.due_date ?? null,
    completed: false,
    position: i,
  }))

  const { data: saved, error } = await supabase
    .from('goal_steps')
    .insert(toInsert)
    .select()
  if (error) throw new Error(error.message)

  revalidatePath('/goals')
  revalidatePath('/brief')
  return (saved ?? []) as GoalStep[]
}

/* ── TOGGLE (check/uncheck a step) ─────────────────── */

/** Toggle a step and sync the parent goal's progress_pct. */
export async function toggleStepAction(stepId: string, completed: boolean): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: step, error } = await supabase
    .from('goal_steps')
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq('id', stepId)
    .eq('user_id', user.id)
    .select('goal_id')
    .single()
  if (error) throw new Error(error.message)

  await syncGoalProgress(step.goal_id, user.id)
  revalidatePath('/goals')
  revalidatePath('/brief')
}

/* ── CREATE ─────────────────────────────────────────── */

export async function createStepAction(
  goalId: string,
  title: string,
  due_date: string | null
): Promise<GoalStep> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get current max position
  const { data: last } = await supabase
    .from('goal_steps')
    .select('position')
    .eq('goal_id', goalId)
    .order('position', { ascending: false })
    .limit(1)
    .single()
  const position = (last?.position ?? -1) + 1

  const { data, error } = await supabase
    .from('goal_steps')
    .insert({ goal_id: goalId, user_id: user.id, title: title.trim(), due_date, completed: false, position })
    .select()
    .single()
  if (error) throw new Error(error.message)

  await syncGoalProgress(goalId, user.id)
  revalidatePath('/goals')
  return data as GoalStep
}

/* ── UPDATE ─────────────────────────────────────────── */

export async function updateStepAction(
  stepId: string,
  updates: { title?: string; due_date?: string | null }
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('goal_steps')
    .update(updates)
    .eq('id', stepId)
    .eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/goals')
}

/* ── DELETE ─────────────────────────────────────────── */

export async function deleteStepAction(stepId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: step } = await supabase
    .from('goal_steps')
    .delete()
    .eq('id', stepId)
    .eq('user_id', user.id)
    .select('goal_id')
    .single()

  if (step?.goal_id) await syncGoalProgress(step.goal_id, user.id)
  revalidatePath('/goals')
  revalidatePath('/brief')
}

/* ── INTERNAL: recalculate goal.progress_pct from steps ── */

async function syncGoalProgress(goalId: string, userId: string): Promise<void> {
  const supabase = await createClient()
  const { data: steps } = await supabase
    .from('goal_steps')
    .select('completed')
    .eq('goal_id', goalId)

  if (!steps || steps.length === 0) return

  const done = steps.filter(s => s.completed).length
  const pct  = Math.round((done / steps.length) * 100)

  await supabase
    .from('goals')
    .update({ progress_pct: pct, updated_at: new Date().toISOString() })
    .eq('id', goalId)
    .eq('user_id', userId)
}
