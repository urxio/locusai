import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getActiveGoals } from '@/lib/db/goals'
import { getTodayCheckin, getRecentCheckins } from '@/lib/db/checkins'
import { getUserHabitsWithLogs } from '@/lib/db/habits'
import { getTodayBrief } from '@/lib/db/briefs'
import { readUserMemory } from '@/lib/ai/memory'
import { getUserLocalDate } from '@/lib/db/users'
import DailyBrief from '@/components/brief/DailyBrief'
import BriefSkeleton from '@/components/brief/BriefSkeleton'
import type { MissedHabit } from '@/components/brief/HabitAuditStrip'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Home — Locus' }

export const dynamic = 'force-dynamic'

async function BriefContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [goals, checkin, recentCheckins, habits, brief, memory, todayDate, profile] = await Promise.all([
    getActiveGoals(user.id),
    getTodayCheckin(user.id),
    getRecentCheckins(user.id, 7),
    getUserHabitsWithLogs(user.id),
    getTodayBrief(user.id),
    readUserMemory(user.id),
    getUserLocalDate(user.id),
    // cover_url only — safest query that always works
    supabase.from('users').select('cover_url').eq('id', user.id).single(),
  ])

  const avgEnergy = recentCheckins.length
    ? recentCheckins.reduce((s, c) => s + c.energy_level, 0) / recentCheckins.length
    : null

  // Compute yesterday's missed habits (scheduled but not logged)
  const yesterday = (() => {
    const d = new Date(todayDate)
    d.setDate(d.getDate() - 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()
  const yesterdayDow = new Date(yesterday + 'T12:00:00').getDay() // 0=Sun…6=Sat

  const missedYesterday: MissedHabit[] = habits
    .filter(h => {
      // Was it scheduled yesterday?
      const scheduled = !h.days_of_week || h.days_of_week.length === 0
        ? true
        : h.days_of_week.includes(yesterdayDow)
      if (!scheduled) return false
      // Was it NOT logged yesterday?
      return !h.logs.some(l => l.logged_date === yesterday)
    })
    .map(h => ({ id: h.id, name: h.name, emoji: h.emoji, motivation: h.motivation }))

  // Try to fetch full_name separately — handles missing column gracefully
  let dbFullName: string | null = null
  try {
    const { data: nameRow } = await supabase
      .from('users').select('full_name').eq('id', user.id).single()
    dbFullName = (nameRow as { full_name?: string } | null)?.full_name ?? null
  } catch { /* column may not exist yet — non-fatal */ }

  const userName: string | null =
    dbFullName ||
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
      todayDate={todayDate}
      coverUrl={profile.data?.cover_url ?? null}
      userName={userName}
      missedYesterday={missedYesterday}
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
