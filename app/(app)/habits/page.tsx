import { createClient } from '@/lib/supabase/server'
import { getUserHabitsWithLogs } from '@/lib/db/habits'
import { getUserLocalDate } from '@/lib/db/users'
import HabitTracker from '@/components/habits/HabitTracker'

export const dynamic = 'force-dynamic'

export default async function HabitsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [habits, today] = await Promise.all([
    getUserHabitsWithLogs(user.id),
    getUserLocalDate(user.id),
  ])

  return <HabitTracker habits={habits} today={today} />
}
