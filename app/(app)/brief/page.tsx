import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getActiveGoals } from '@/lib/db/goals'
import { getTodayCheckin, getRecentCheckins } from '@/lib/db/checkins'
import { getUserHabitsWithLogs } from '@/lib/db/habits'
import { getTodayBrief, getRecentBriefs } from '@/lib/db/briefs'
import { readUserMemory } from '@/lib/ai/memory'
import DailyBrief from '@/components/brief/DailyBrief'
import BriefSkeleton from '@/components/brief/BriefSkeleton'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Home — Locus' }

export const dynamic = 'force-dynamic'

async function BriefContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [goals, checkin, recentCheckins, habits, brief, memory, pastBriefs, profile] = await Promise.all([
    getActiveGoals(user.id),
    getTodayCheckin(user.id),
    getRecentCheckins(user.id, 7),
    getUserHabitsWithLogs(user.id),
    getTodayBrief(user.id),
    readUserMemory(user.id),
    getRecentBriefs(user.id, 14),
    supabase.from('users').select('cover_url, full_name').eq('id', user.id).single(),
  ])

  const avgEnergy = recentCheckins.length
    ? recentCheckins.reduce((s, c) => s + c.energy_level, 0) / recentCheckins.length
    : null

  // Derive display name: users table → auth metadata → email prefix
  const userName: string | null =
    profile.data?.full_name ||
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    user.email?.split('@')[0] ||
    null

  return (
    <DailyBrief
      goals={goals}
      checkin={checkin}
      avgEnergy={avgEnergy}
      habits={habits}
      brief={brief}
      memory={memory}
      pastBriefs={pastBriefs}
      coverUrl={profile.data?.cover_url ?? null}
      userName={userName}
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
