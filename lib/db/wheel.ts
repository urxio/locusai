import { createClient } from '@/lib/supabase/server'
import type { WheelSnapshot, WheelScores } from '@/lib/types'
import { WHEEL_AREAS } from '@/lib/types'
import { getActiveGoalsWithSteps } from '@/lib/db/goals'
import { getUserHabitsWithLogs } from '@/lib/db/habits'
import { getRecentCheckins } from '@/lib/db/checkins'

export async function getWheelSnapshots(userId: string): Promise<WheelSnapshot[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('wheel_of_life')
    .select('*')
    .eq('user_id', userId)
    .order('snapshot_date', { ascending: false })
    .limit(12)
  if (error) { console.error('getWheelSnapshots:', error); return [] }
  return data ?? []
}

export async function getTodayWheelSnapshot(userId: string, date: string): Promise<WheelSnapshot | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('wheel_of_life')
    .select('*')
    .eq('user_id', userId)
    .eq('snapshot_date', date)
    .single()
  if (error && error.code !== 'PGRST116') { console.error('getTodayWheelSnapshot:', error) }
  return data ?? null
}

// Derive data-backed score suggestions from existing Locus data
export async function computeWheelSuggestions(userId: string): Promise<Partial<WheelScores>> {
  const [goals, habits, checkins] = await Promise.all([
    getActiveGoalsWithSteps(userId),
    getUserHabitsWithLogs(userId),
    getRecentCheckins(userId, 14),
  ])

  const suggested: Partial<WheelScores> = {}

  function goalScore(category: string): number | null {
    const matching = goals.filter(g => g.category === category)
    if (!matching.length) return null
    const avg = matching.reduce((s, g) => s + g.progress_pct, 0) / matching.length
    return Math.max(1, Math.min(10, avg / 10))
  }

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
      const gs = goalScore('health'); if (gs) signals.push(gs)
      const hs = habitScore('health'); if (hs) signals.push(hs)
    } else if (area.goalCategory) {
      const gs = goalScore(area.goalCategory); if (gs) signals.push(gs)
      const hs = habitScore(area.goalCategory); if (hs) signals.push(hs)
    }
    if (area.key === 'wellbeing' && avgEnergy) signals.push(avgEnergy)
    if (signals.length > 0) {
      suggested[area.key] = Math.round((signals.reduce((s, v) => s + v, 0) / signals.length) * 10) / 10
    }
  }

  return suggested
}
