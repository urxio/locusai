import { createClient } from '@/lib/supabase/server'
import { getUserHabitsWithLogs } from '@/lib/db/habits'
import { getUserLocalDate } from '@/lib/db/users'
import { getActiveGoals } from '@/lib/db/goals'
import HabitTracker from '@/components/habits/HabitTracker'

export const dynamic = 'force-dynamic'

export default async function HabitsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [habits, today, activeGoals] = await Promise.all([
    getUserHabitsWithLogs(user.id),
    getUserLocalDate(user.id),
    getActiveGoals(user.id),
  ])

  return <HabitTracker habits={habits} today={today} activeGoals={activeGoals} />
}
