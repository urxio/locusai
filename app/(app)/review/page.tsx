import { createClient } from '@/lib/supabase/server'
import { getRecentCheckins } from '@/lib/db/checkins'
import { getUserHabitsWithLogs } from '@/lib/db/habits'
import { getActiveGoals } from '@/lib/db/goals'
import { getWeeklyReflection, getPastWeeklyReflections } from '@/lib/db/weekly-reflections'
import { buildPatternsContext } from '@/lib/ai/patterns-context'
import { readUserMemory } from '@/lib/ai/memory'
import ReviewTabs from '@/components/review/ReviewTabs'

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

  const [checkins, habits, goals, savedReflection, patternsCtx, memory, pastReflections] = await Promise.all([
    getRecentCheckins(user.id, 60),
    getUserHabitsWithLogs(user.id),
    getActiveGoals(user.id),
    getWeeklyReflection(user.id, weekNumber, year),
    buildPatternsContext(user.id),
    readUserMemory(user.id),
    getPastWeeklyReflections(user.id, weekNumber, year, 12),
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
    />
  )
}
