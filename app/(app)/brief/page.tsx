import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getActiveGoals } from '@/lib/db/goals'
import { getTodayCheckin, getRecentCheckins } from '@/lib/db/checkins'
import { getUserHabitsWithLogs } from '@/lib/db/habits'
import { getTodayBrief, getRecentBriefs } from '@/lib/db/briefs'
import { readUserMemory } from '@/lib/ai/memory'
import DailyBrief from '@/components/brief/DailyBrief'
import BriefSkeleton from '@/components/brief/BriefSkeleton'
import BriefLoader from '@/components/brief/BriefLoader'

export const dynamic = 'force-dynamic'

async function BriefContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [goals, checkin, recentCheckins, habits, brief, memory, pastBriefs] = await Promise.all([
    getActiveGoals(user.id),
    getTodayCheckin(user.id),
    getRecentCheckins(user.id, 7),
    getUserHabitsWithLogs(user.id),
    getTodayBrief(user.id),
    readUserMemory(user.id),
    getRecentBriefs(user.id, 14),
  ])

  const avgEnergy = recentCheckins.length
    ? recentCheckins.reduce((s, c) => s + c.energy_level, 0) / recentCheckins.length
    : null

  // If user has checked in but no brief yet, trigger generation client-side
  const needsGeneration = checkin && !brief

  return (
    <DailyBrief
      goals={goals}
      checkin={checkin}
      avgEnergy={avgEnergy}
      habits={habits}
      brief={brief}
      needsGeneration={needsGeneration}
      memory={memory}
      pastBriefs={pastBriefs}
    />
  )
}

export default function BriefPage() {
  return (
    <Suspense fallback={<BriefSkeleton />}>
      <BriefContent />
    </Suspense>
  )
}
