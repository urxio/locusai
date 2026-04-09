import { getActiveGoals } from '@/lib/db/goals'
import { getTodayCheckin, getRecentCheckins } from '@/lib/db/checkins'
import { getUserHabitsWithLogs } from '@/lib/db/habits'
import { readUserMemory, type UserMemory } from '@/lib/ai/memory'
import { getTodayJournal, getRecentJournals } from '@/lib/db/journals'
import type { Goal, CheckIn, HabitWithLogs, JournalEntry } from '@/lib/types'

export type BriefContext = {
  date: string
  goals: Goal[]
  todayCheckin: CheckIn | null
  recentCheckins: CheckIn[]
  habits: HabitWithLogs[]
  avgEnergy: number | null
  weekHabitRate: number // 0-100
  memory: UserMemory | null
  todayJournal: JournalEntry | null
  recentJournals: JournalEntry[]
}

export async function buildBriefContext(userId: string, date: string): Promise<BriefContext> {
  const [goals, todayCheckin, recentCheckins, habits, memory, todayJournal, recentJournals] = await Promise.all([
    getActiveGoals(userId),
    getTodayCheckin(userId),
    getRecentCheckins(userId, 7),
    getUserHabitsWithLogs(userId),
    readUserMemory(userId),
    getTodayJournal(userId),
    getRecentJournals(userId, 7),
  ])

  const avgEnergy = recentCheckins.length
    ? Math.round((recentCheckins.reduce((s, c) => s + c.energy_level, 0) / recentCheckins.length) * 10) / 10
    : null

  const totalPossibleCompletions = habits.reduce((sum, h) => sum + h.target_count, 0)
  const totalActualCompletions = habits.reduce((sum, h) => sum + h.weekCompletions, 0)
  const weekHabitRate = totalPossibleCompletions > 0
    ? Math.round((totalActualCompletions / totalPossibleCompletions) * 100)
    : 0

  return {
    date,
    goals,
    todayCheckin,
    recentCheckins,
    habits,
    avgEnergy,
    weekHabitRate,
    memory,
    todayJournal,
    recentJournals,
  }
}
