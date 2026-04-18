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
    .select('title, category, timeframe, target_date, progress_pct')
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
export async function syncHabitGoalProgress(
  goalId: string,
  userId: string,
  // Accept an existing authenticated client to avoid session-propagation
  // issues when called from within another server action.
  // Falls back to creating a new client when called standalone.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  existingClient?: any,
): Promise<void> {
  const supabase = existingClient ?? (await createClient())

  // ── 1. Fetch goal window ────────────────────────────────────────────────
  const { data: goal, error: goalErr } = await supabase
    .from('goals')
    .select('created_at, target_date')
    .eq('id', goalId)
    .eq('user_id', userId)
    .single()
  if (goalErr || !goal) {
    console.error('[syncHabitGoalProgress] goal fetch failed:', goalErr)
    return
  }

  const today     = new Date().toISOString().split('T')[0]
  const windowEnd = goal.target_date ?? today  // full denominator window
  const logEnd    = today                       // can't log future dates

  // ── 2. Fetch all habits linked to this goal ─────────────────────────────
  const { data: habits, error: habitsErr } = await supabase
    .from('habits')
    .select('id, days_of_week, created_at, goal_target_count')
    .eq('goal_id', goalId)
    .eq('user_id', userId)
  if (habitsErr) {
    console.error('[syncHabitGoalProgress] habits fetch failed:', habitsErr)
    return
  }
  if (!habits || habits.length === 0) return

  type HabitRow = { id: string; days_of_week: number[] | null; created_at: string; goal_target_count: number | null }

  // Use the earliest habit creation date as the log query floor so that
  // pre-existing habits (created before the goal) have their historical
  // logs counted. Each habit's own created_at acts as its individual start.
  const earliestHabitDate = (habits as HabitRow[]).reduce((min, h) => {
    const d = h.created_at.split('T')[0]
    return d < min ? d : min
  }, today)

  const habitIds = (habits as HabitRow[]).map(h => h.id)

  // ── 3. Fetch all logs for those habits from earliest habit start ─────────
  const { data: logs, error: logsErr } = await supabase
    .from('habit_logs')
    .select('habit_id, logged_date')
    .in('habit_id', habitIds)
    .gte('logged_date', earliestHabitDate)
    .lte('logged_date', logEnd)
  if (logsErr) console.error('[syncHabitGoalProgress] logs fetch failed:', logsErr)

  // Count completions per habit
  const completionsByHabit = new Map<string, number>()
  for (const l of (logs ?? []) as { habit_id: string; logged_date: string }[]) {
    completionsByHabit.set(l.habit_id, (completionsByHabit.get(l.habit_id) ?? 0) + 1)
  }

  // ── 4. Compute per-habit progress, then average for overall goal pct ────
  //   • If habit has goal_target_count: pct = completions / target × 100
  //   • Otherwise: pct = completions / scheduled_days (from habit start) × 100
  //   Overall goal progress = mean of all habit pcts.
  const habitPcts: number[] = []

  for (const habit of habits as HabitRow[]) {
    // Each habit's window starts from when the habit itself was created,
    // so pre-existing habits contribute their full history.
    const start      = habit.created_at.split('T')[0]
    const daysOfWeek = habit.days_of_week
    const completed  = completionsByHabit.get(habit.id) ?? 0

    let habitPct: number
    if (habit.goal_target_count && habit.goal_target_count > 0) {
      // Count-target mode
      habitPct = Math.min(100, Math.round((completed / habit.goal_target_count) * 100))
    } else {
      // Schedule mode: walk the window and count scheduled days
      const startDate  = new Date(start + 'T12:00:00Z')
      const endDate    = new Date(windowEnd + 'T12:00:00Z')
      let scheduled    = 0
      const cur = new Date(startDate)
      while (cur <= endDate) {
        const dow = cur.getUTCDay()
        if (!daysOfWeek || daysOfWeek.length === 0 || daysOfWeek.includes(dow)) scheduled++
        cur.setUTCDate(cur.getUTCDate() + 1)
      }
      habitPct = scheduled > 0
        ? Math.min(100, Math.round((completed / scheduled) * 100))
        : 0
    }
    habitPcts.push(habitPct)
  }

  if (habitPcts.length === 0) return

  // ── 5. Average all per-habit pcts ───────────────────────────────────────
  const totalCompleted = habitPcts.reduce((s, p) => s + p, 0)
  const totalScheduled = habitPcts.length  // denominator for the average
  let pct: number = Math.round(totalCompleted / totalScheduled)

  const { error: updateErr } = await supabase
    .from('goals')
    .update({ progress_pct: pct, updated_at: new Date().toISOString() })
    .eq('id', goalId)
    .eq('user_id', userId)
  if (updateErr) {
    console.error('[syncHabitGoalProgress] goal update failed:', updateErr)
  } else {
    console.log(`[syncHabitGoalProgress] goal ${goalId.slice(0,8)} → ${pct}% across ${habitPcts.length} habit(s): [${habitPcts.join(', ')}]`)
  }
}
