import { createClient } from '@/lib/supabase/server'
import { getUserHabitsWithLogs } from '@/lib/db/habits'
import { getActiveGoalsWithSteps } from '@/lib/db/goals'
import { getWeeklyPlan } from '@/lib/db/planner'
import WeeklyPlanner from '@/components/planner/WeeklyPlanner'

export const dynamic = 'force-dynamic'

function getMondayOfCurrentWeek(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

export default async function PlannerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const weekStart = getMondayOfCurrentWeek()
  const today = new Date().toISOString().split('T')[0]

  const [habits, goals, initialPlan] = await Promise.all([
    getUserHabitsWithLogs(user.id),
    getActiveGoalsWithSteps(user.id),
    getWeeklyPlan(user.id, weekStart),
  ])

  return (
    <WeeklyPlanner
      habits={habits}
      goals={goals}
      initialPlan={initialPlan}
      weekStart={weekStart}
      today={today}
    />
  )
}
