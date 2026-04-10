import { createClient } from '@/lib/supabase/server'
import type { WeeklyPlanBlock } from '@/lib/types'

export async function getWeeklyPlan(userId: string, weekStart: string): Promise<WeeklyPlanBlock[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('weekly_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .order('position', { ascending: true })
  if (error) { console.error('getWeeklyPlan:', error); return [] }
  return data ?? []
}

export async function getPlanForDate(userId: string, date: string): Promise<WeeklyPlanBlock[]> {
  const d = new Date(date + 'T12:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  const weekStart = d.toISOString().split('T')[0]
  const dow = new Date(date + 'T12:00:00').getDay()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('weekly_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .eq('day_of_week', dow)
    .eq('accepted', true)
    .order('time_slot', { ascending: true })
  if (error) { console.error('getPlanForDate:', error); return [] }
  return data ?? []
}
