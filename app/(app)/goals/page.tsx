import { createClient } from '@/lib/supabase/server'
import { getAllGoalsWithSteps } from '@/lib/db/goals'
import { getUserHabits } from '@/lib/db/habits'
import GoalsList from '@/components/goals/GoalsList'

export const dynamic = 'force-dynamic'

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [goals, habits] = await Promise.all([
    getAllGoalsWithSteps(user.id),
    getUserHabits(user.id),
  ])

  // Build completion counts for habits linked to habit-tracked goals
  // so the goal card can render per-habit progress mini-bars.
  const habitTrackedGoalIds = new Set(
    goals.filter(g => g.tracking_mode === 'habits').map(g => g.id)
  )
  const linkedHabitIds = habits
    .filter(h => h.goal_id && habitTrackedGoalIds.has(h.goal_id))
    .map(h => h.id)

  let habitCompletions: Record<string, number> = {}
  if (linkedHabitIds.length > 0) {
    const { data: logs } = await supabase
      .from('habit_logs')
      .select('habit_id')
      .in('habit_id', linkedHabitIds)
    for (const log of (logs ?? [])) {
      habitCompletions[log.habit_id] = (habitCompletions[log.habit_id] ?? 0) + 1
    }
  }

  return (
    <GoalsList
      goals={goals}
      habits={habits}
      existingHabitNames={habits.map(h => h.name)}
      habitCompletions={habitCompletions}
    />
  )
}
