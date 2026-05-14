import { createClient } from '@/lib/supabase/server'
import { getRecentCheckins } from '@/lib/db/checkins'
import { getUserHabitsWithLogs } from '@/lib/db/habits'
import { getActiveGoalsWithSteps } from '@/lib/db/goals'
import { getRecentBriefs } from '@/lib/db/briefs'
import WeeklyReview from '@/components/review/WeeklyReview'

export const dynamic = 'force-dynamic'

export default async function ReviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [checkins, habits, goals, briefs] = await Promise.all([
    getRecentCheckins(user.id, 14),
    getUserHabitsWithLogs(user.id),
    getActiveGoalsWithSteps(user.id),
    getRecentBriefs(user.id, 14),
  ])

  return (
    <WeeklyReview
      checkins={checkins}
      habits={habits}
      goals={goals}
      briefs={briefs}
    />
  )
}
