import { createClient } from '@/lib/supabase/server'
import { getRecentCheckins } from '@/lib/db/checkins'
import { getUserHabitsWithLogs } from '@/lib/db/habits'
import WeeklyReview from '@/components/weekly/WeeklyReview'

export default async function ReviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [checkins, habits] = await Promise.all([
    getRecentCheckins(user.id, 7),
    getUserHabitsWithLogs(user.id),
  ])

  return <WeeklyReview checkins={checkins} habits={habits} />
}
