import { createClient } from '@/lib/supabase/server'
import { getRecentCheckins } from '@/lib/db/checkins'
import { getUserHabitsWithLogs } from '@/lib/db/habits'
import { getActiveGoals } from '@/lib/db/goals'
import WeeklyReview from '@/components/weekly/WeeklyReview'

export const dynamic = 'force-dynamic'

export default async function ReviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [checkins, habits, goals] = await Promise.all([
    getRecentCheckins(user.id, 7),
    getUserHabitsWithLogs(user.id),
    getActiveGoals(user.id),
  ])

  return <WeeklyReview checkins={checkins} habits={habits} goals={goals} />
}
