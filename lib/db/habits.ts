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
  const today = new Date().toISOString().split('T')[0]

  // Fetch 60 days of logs to support longer streaks
  const since = new Date()
  since.setDate(since.getDate() - 60)

  const [{ data: habits }, { data: logs }] = await Promise.all([
    supabase.from('habits').select('*').eq('user_id', userId).order('created_at'),
    supabase.from('habit_logs').select('*').eq('user_id', userId).gte('logged_date', since.toISOString().split('T')[0])
  ])

  const todayDow = new Date(today + 'T12:00:00').getDay()

  return (habits ?? [])
    // Filter out habits whose end date has passed
    .filter(habit => !habit.ends_at || habit.ends_at >= today)
    .map(habit => {
      const habitLogs = (logs ?? []).filter(l => l.habit_id === habit.id)
      const streak = computeStreak(habitLogs, habit.days_of_week ?? null)
      const weekCompletions = habitLogs.filter(l => {
        const d = new Date(today + 'T12:00:00')
        d.setDate(d.getDate() - 7)
        return l.logged_date >= d.toISOString().split('T')[0]
      }).length
      const dow = habit.days_of_week
      const isScheduledToday = !dow || dow.length === 0 || dow.includes(todayDow)
      return { ...habit, logs: habitLogs, streak, weekCompletions, isScheduledToday }
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

/* ── HELPERS ── */

function isScheduledOn(date: string, daysOfWeek: number[] | null): boolean {
  if (!daysOfWeek || daysOfWeek.length === 0) return true
  return daysOfWeek.includes(new Date(date + 'T12:00:00').getDay())
}

function computeStreak(logs: HabitLog[], daysOfWeek: number[] | null): number {
  if (!logs.length) return 0
  const dates = new Set(logs.map(l => l.logged_date))
  const today = new Date().toISOString().split('T')[0]

  // Find the most recent scheduled+logged date within the last 14 days
  let startDate: string | null = null
  let scan = today
  for (let i = 0; i < 14; i++) {
    if (isScheduledOn(scan, daysOfWeek) && dates.has(scan)) {
      startDate = scan; break
    }
    const d = new Date(scan + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    scan = d.toISOString().split('T')[0]
  }
  if (!startDate) return 0

  // Count consecutive scheduled days with logs, going backwards
  // Non-scheduled days are skipped (they don't break the streak)
  let cur = startDate
  let streak = 0
  for (let i = 0; i < 200; i++) {
    if (!isScheduledOn(cur, daysOfWeek)) {
      // Not a scheduled day — skip without penalising
      const d = new Date(cur + 'T12:00:00')
      d.setDate(d.getDate() - 1)
      cur = d.toISOString().split('T')[0]
      continue
    }
    if (dates.has(cur)) {
      streak++
      const d = new Date(cur + 'T12:00:00')
      d.setDate(d.getDate() - 1)
      cur = d.toISOString().split('T')[0]
    } else {
      break // missed a scheduled day — streak ends
    }
  }
  return streak
}
