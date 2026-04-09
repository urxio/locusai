import { createClient } from '@/lib/supabase/server'
import { getRecentCheckins } from '@/lib/db/checkins'
import { getUserHabitsWithLogs } from '@/lib/db/habits'
import { getActiveGoals } from '@/lib/db/goals'
import { getWeeklyReflection } from '@/lib/db/weekly-reflections'
import WeeklyReview from '@/components/weekly/WeeklyReview'

export const dynamic = 'force-dynamic'

function getWeekNumber(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

export default async function ReviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today      = new Date()
  const weekNumber = getWeekNumber(today)
  const year       = today.getFullYear()

  const [checkins, habits, goals, savedReflection] = await Promise.all([
    getRecentCheckins(user.id, 7),
    getUserHabitsWithLogs(user.id),
    getActiveGoals(user.id),
    getWeeklyReflection(user.id, weekNumber, year),
  ])

  return (
    <WeeklyReview
      checkins={checkins}
      habits={habits}
      goals={goals}
      initialReflection={savedReflection}
    />
  )
}
