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

  return <GoalsList goals={goals} habits={habits} existingHabitNames={habits.map(h => h.name)} />
}
