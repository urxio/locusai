import { createClient } from '@/lib/supabase/server'
import { getUserHabitsWithLogs } from '@/lib/db/habits'
import HabitTracker from '@/components/habits/HabitTracker'

export const dynamic = 'force-dynamic'

export default async function HabitsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const habits = await getUserHabitsWithLogs(user.id)
  const today = new Date().toISOString().split('T')[0]

  return <HabitTracker habits={habits} today={today} />
}
