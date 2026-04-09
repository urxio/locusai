import { createClient } from '@/lib/supabase/server'
import { getAllGoalsWithSteps } from '@/lib/db/goals'
import GoalsList from '@/components/goals/GoalsList'

export const dynamic = 'force-dynamic'

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const goals = await getAllGoalsWithSteps(user.id)
  return <GoalsList goals={goals} />
}
