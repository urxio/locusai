import { createClient } from '@/lib/supabase/server'
import { getRecentCheckins } from '@/lib/db/checkins'
import { getUserHabitsWithLogs } from '@/lib/db/habits'
import { getActiveGoals } from '@/lib/db/goals'
import { getWeeklyReflection, getPastWeeklyReflections } from '@/lib/db/weekly-reflections'
import { buildPatternsContext } from '@/lib/ai/patterns-context'
import { readUserMemory } from '@/lib/ai/memory'
import { getWheelSnapshots, getTodayWheelSnapshot, computeWheelSuggestions } from '@/lib/db/wheel'
import { getUserLocalDate } from '@/lib/db/users'
import ReviewTabs from '@/components/review/ReviewTabs'
import { getWeekNumber } from '@/lib/utils/date'

export const dynamic = 'force-dynamic'

export default async function ReviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today      = new Date()
  const weekNumber = getWeekNumber(today)
  const year       = today.getFullYear()
  const localDate  = await getUserLocalDate(user.id)

  const [checkins, habits, goals, savedReflection, patternsCtx, memory, pastReflections,
         wheelSnapshot, wheelHistory, wheelSuggested] = await Promise.all([
    getRecentCheckins(user.id, 60),
    getUserHabitsWithLogs(user.id),
    getActiveGoals(user.id),
    getWeeklyReflection(user.id, weekNumber, year),
    buildPatternsContext(user.id),
    readUserMemory(user.id),
    getPastWeeklyReflections(user.id, weekNumber, year, 12),
    getTodayWheelSnapshot(user.id, localDate),
    getWheelSnapshots(user.id),
    computeWheelSuggestions(user.id),
  ])

  return (
    <ReviewTabs
      checkins={checkins}
      habits={habits}
      goals={goals}
      initialReflection={savedReflection}
      pastReflections={pastReflections}
      ctx={patternsCtx}
      cachedNarratives={memory?.pattern_narratives ?? null}
      cachedGeneratedAt={memory?.pattern_generated_at ?? null}
      wheelToday={localDate}
      wheelSnapshot={wheelSnapshot}
      wheelSuggested={wheelSuggested}
      wheelHistory={wheelHistory}
    />
  )
}
