import { createClient } from '@/lib/supabase/server'
import type { Habit, HabitLog, HabitWithLogs } from '@/lib/types'

export async function getUserHabits(userId: string): Promise<Habit[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) { console.error('getUserHabits:', error); return [] }
  return data ?? []
}

export async function getUserHabitsWithLogs(userId: string): Promise<HabitWithLogs[]> {
  const supabase = await createClient()
  const since = new Date()
  since.setDate(since.getDate() - 7)

  const [{ data: habits }, { data: logs }] = await Promise.all([
    supabase.from('habits').select('*').eq('user_id', userId).order('created_at'),
    supabase.from('habit_logs').select('*').eq('user_id', userId).gte('logged_date', since.toISOString().split('T')[0])
  ])

  return (habits ?? []).map(habit => {
    const habitLogs = (logs ?? []).filter(l => l.habit_id === habit.id)
    const streak = computeStreak(habitLogs)
    const weekCompletions = habitLogs.length
    return { ...habit, logs: habitLogs, streak, weekCompletions }
  })
}

export async function logHabit(userId: string, habitId: string, date?: string): Promise<HabitLog | null> {
  const supabase = await createClient()
  const logged_date = date ?? new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('habit_logs')
    .upsert({ habit_id: habitId, user_id: userId, logged_date }, { onConflict: 'habit_id,logged_date' })
    .select()
    .single()
  if (error) { console.error('logHabit:', error); return null }
  return data
}

function computeStreak(logs: HabitLog[]): number {
  if (!logs.length) return 0
  const dates = logs.map(l => l.logged_date).sort().reverse()
  let streak = 0
  const today = new Date().toISOString().split('T')[0]
  let current = today
  for (const date of dates) {
    if (date === current) {
      streak++
      const d = new Date(current)
      d.setDate(d.getDate() - 1)
      current = d.toISOString().split('T')[0]
    } else break
  }
  return streak
}
