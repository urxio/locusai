import { createClient } from '@/lib/supabase/server'

/**
 * Fetch all habit time overrides for a user within a date range.
 * Returns a plain object keyed by `${habitId}_${date}` → time string or null.
 */
export async function getHabitTimeOverrides(
  userId: string,
  startDate: string,  // YYYY-MM-DD
  endDate: string,    // YYYY-MM-DD
): Promise<Record<string, string | null>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('habit_time_overrides')
    .select('habit_id, date, time_of_day')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
  if (error) { console.error('getHabitTimeOverrides:', error); return {} }
  const map: Record<string, string | null> = {}
  for (const row of data ?? []) {
    // date from DB comes back as 'YYYY-MM-DD'
    map[`${row.habit_id}_${row.date}`] = row.time_of_day
  }
  return map
}
