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

/* ── EXPORTED: recalculate goal.progress_pct from linked habit logs ── */

/**
 * For a goal with tracking_mode = 'habits', recomputes progress_pct as:
 *   total_completed_logs / total_scheduled_days_in_window × 100
 *
 * Window = goal.created_at → goal.target_date (or today if no target_date).
 * Multiple linked habits are summed together (not averaged) so every
 * scheduled occurrence across all habits counts equally.
 */
export async function syncHabitGoalProgress(goalId: string, userId: string): Promise<void> {
  const supabase = await createClient()

  // ── 1. Fetch goal window ────────────────────────────────────────────────
  const { data: goal } = await supabase
    .from('goals')
    .select('created_at, target_date')
    .eq('id', goalId)
    .eq('user_id', userId)
    .single()
  if (!goal) return

  const today       = new Date().toISOString().split('T')[0]
  const windowStart = goal.created_at.split('T')[0]
  const windowEnd   = goal.target_date ?? today  // full denominator window
  const logEnd      = today                       // can't log future dates

  // ── 2. Fetch all habits linked to this goal ─────────────────────────────
  const { data: habits } = await supabase
    .from('habits')
    .select('id, days_of_week, created_at')
    .eq('goal_id', goalId)
    .eq('user_id', userId)
  if (!habits || habits.length === 0) return

  const habitIds = habits.map(h => h.id)

  // ── 3. Fetch all logs for those habits in the window ────────────────────
  const { data: logs } = await supabase
    .from('habit_logs')
    .select('habit_id, logged_date')
    .in('habit_id', habitIds)
    .gte('logged_date', windowStart)
    .lte('logged_date', logEnd)

  const logSet = new Set((logs ?? []).map(l => `${l.habit_id}:${l.logged_date}`))

  // ── 4. For each habit, count scheduled vs completed days ────────────────
  let totalScheduled = 0
  let totalCompleted = 0

  for (const habit of habits) {
    // Habit can only count from when it was created
    const habitStart  = habit.created_at.split('T')[0]
    const start       = habitStart > windowStart ? habitStart : windowStart
    const daysOfWeek  = habit.days_of_week as number[] | null

    // Walk day by day over [start … windowEnd]
    const startDate  = new Date(start + 'T12:00:00Z')
    const endDate    = new Date(windowEnd + 'T12:00:00Z')
    const logEndDate = new Date(logEnd + 'T12:00:00Z')

    const cur = new Date(startDate)
    while (cur <= endDate) {
      const dow = cur.getUTCDay()  // 0 = Sun … 6 = Sat
      const isScheduled = !daysOfWeek || daysOfWeek.length === 0 || daysOfWeek.includes(dow)

      if (isScheduled) {
        totalScheduled++
        const dateStr = cur.toISOString().split('T')[0]
        if (cur <= logEndDate && logSet.has(`${habit.id}:${dateStr}`)) {
          totalCompleted++
        }
      }

      cur.setUTCDate(cur.getUTCDate() + 1)
    }
  }

  if (totalScheduled === 0) return

  const pct = Math.min(100, Math.round((totalCompleted / totalScheduled) * 100))

  await supabase
    .from('goals')
    .update({ progress_pct: pct, updated_at: new Date().toISOString() })
    .eq('id', goalId)
    .eq('user_id', userId)
}
