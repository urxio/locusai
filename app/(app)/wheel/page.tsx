import { createClient } from '@/lib/supabase/server'
import { getUserLocalDate } from '@/lib/db/users'
import { getActiveGoalsWithSteps } from '@/lib/db/goals'
import { getUserHabitsWithLogs } from '@/lib/db/habits'
import { getRecentCheckins } from '@/lib/db/checkins'
import { getWheelSnapshots, getTodayWheelSnapshot } from '@/lib/db/wheel'
import { WHEEL_AREAS, type WheelScores } from '@/lib/types'
import WheelOfLife from '@/components/wheel/WheelOfLife'

export const dynamic = 'force-dynamic'

// Derive data-backed score suggestions from existing Locus data
async function computeSuggestedScores(userId: string): Promise<Partial<WheelScores>> {
  const [goals, habits, checkins] = await Promise.all([
    getActiveGoalsWithSteps(userId),
    getUserHabitsWithLogs(userId),
    getRecentCheckins(userId, 14),
  ])

  const suggested: Partial<WheelScores> = {}

  // Helper: avg progress for goals matching a category, scaled to 1-10
  function goalScore(category: string): number | null {
    const matching = goals.filter(g => g.category === category)
    if (!matching.length) return null
    const avg = matching.reduce((s, g) => s + g.progress_pct, 0) / matching.length
    return Math.max(1, Math.min(10, avg / 10))
  }

  // Helper: habit completion rate (0-10) for habits linked to a goal category
  function habitScore(goalCategory: string): number | null {
    const matching = habits.filter(h => h.linkedGoal?.category === goalCategory)
    if (!matching.length) return null
    const total = matching.reduce((s, h) => s + h.target_count, 0)
    if (total === 0) return null
    const done = matching.reduce((s, h) => s + h.weekCompletions, 0)
    return Math.max(1, Math.min(10, (done / total) * 10))
  }

  const avgEnergy = checkins.length
    ? checkins.reduce((s, c) => s + c.energy_level, 0) / checkins.length
    : null

  for (const area of WHEEL_AREAS) {
    const signals: number[] = []

    if (area.key === 'health') {
      if (avgEnergy) signals.push(avgEnergy)
      const gs = goalScore('health')
      if (gs) signals.push(gs)
      const hs = habitScore('health')
      if (hs) signals.push(hs)
    } else if (area.goalCategory) {
      const gs = goalScore(area.goalCategory)
      if (gs) signals.push(gs)
      const hs = habitScore(area.goalCategory)
      if (hs) signals.push(hs)
    }

    // wellbeing can also use energy as a signal
    if (area.key === 'wellbeing' && avgEnergy) signals.push(avgEnergy)

    if (signals.length > 0) {
      const avg = signals.reduce((s, v) => s + v, 0) / signals.length
      suggested[area.key] = Math.round(avg * 10) / 10
    }
  }

  return suggested
}

export default async function WheelPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = await getUserLocalDate(user.id)

  const [existingSnapshot, history, suggested] = await Promise.all([
    getTodayWheelSnapshot(user.id, today),
    getWheelSnapshots(user.id),
    computeSuggestedScores(user.id),
  ])

  return (
    <WheelOfLife
      today={today}
      existingSnapshot={existingSnapshot}
      suggested={suggested}
      history={history}
    />
  )
}
