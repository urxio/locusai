import { createClient } from '@/lib/supabase/server'
import { getAllGoals } from '@/lib/db/goals'
import GoalsList from '@/components/goals/GoalsList'

export const dynamic = 'force-dynamic'

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const goals = await getAllGoals(user.id)
  return <GoalsList goals={goals} />
}
