import { getActiveGoalsWithSteps } from '@/lib/db/goals'
import { getTodayCheckin, getRecentCheckins } from '@/lib/db/checkins'
import { getUserHabitsWithLogs } from '@/lib/db/habits'
import { readUserMemory, type UserMemory } from '@/lib/ai/memory'
import { getTodayJournal, getRecentJournals } from '@/lib/db/journals'
import { getPlanForDate } from '@/lib/db/planner'
import type { CheckIn, HabitWithLogs, GoalWithSteps, JournalEntry, WeeklyPlanBlock } from '@/lib/types'

export type NeglectedHabit = {
  name: string
  emoji: string
  frequency: string
}

export type BriefContext = {
  date: string
  goalsWithSteps: GoalWithSteps[]
  todayCheckin: CheckIn | null
  recentCheckins: CheckIn[]
  habits: HabitWithLogs[]
  neglectedHabits: NeglectedHabit[]  // habits with 0 completions this week
  avgEnergy: number | null
  weekHabitRate: number // 0-100
  memory: UserMemory | null
  todayJournal: JournalEntry | null
  recentJournals: JournalEntry[]
  isFirstBrief: boolean
  todayPlan: WeeklyPlanBlock[]
}

export async function buildBriefContext(userId: string, date: string): Promise<BriefContext> {
  const [goalsWithSteps, todayCheckin, recentCheckins, habits, memory, todayJournal, recentJournals, todayPlan] = await Promise.all([
    getActiveGoalsWithSteps(userId),
    getTodayCheckin(userId),
    getRecentCheckins(userId, 7),
    getUserHabitsWithLogs(userId),
    readUserMemory(userId),
    getTodayJournal(userId),
    getRecentJournals(userId, 7),
    getPlanForDate(userId, date),
  ])

  const avgEnergy = recentCheckins.length
    ? Math.round((recentCheckins.reduce((s, c) => s + c.energy_level, 0) / recentCheckins.length) * 10) / 10
    : null

  const totalPossibleCompletions = habits.reduce((sum, h) => sum + h.target_count, 0)
  const totalActualCompletions = habits.reduce((sum, h) => sum + h.weekCompletions, 0)
  const weekHabitRate = totalPossibleCompletions > 0
    ? Math.round((totalActualCompletions / totalPossibleCompletions) * 100)
    : 0

  // Habits with zero completions this week — consistently ignored
  const neglectedHabits: NeglectedHabit[] = habits
    .filter(h => h.weekCompletions === 0)
    .map(h => ({ name: h.name, emoji: h.emoji, frequency: h.frequency }))

  // First brief: user has at most 1 check-in (the one from onboarding)
  const isFirstBrief = recentCheckins.length <= 1

  return {
    date,
    goalsWithSteps,
    todayCheckin,
    recentCheckins,
    habits,
    neglectedHabits,
    avgEnergy,
    weekHabitRate,
    memory,
    todayJournal,
    recentJournals,
    isFirstBrief,
    todayPlan,
  }
}
