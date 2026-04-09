import { createClient } from '@/lib/supabase/server'
import type { WeeklyReflection } from '@/lib/ai/weekly-prompts'

export async function getWeeklyReflection(
  userId: string,
  weekNumber: number,
  year: number
): Promise<WeeklyReflection | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('weekly_reflections')
    .select('reflection')
    .eq('user_id', userId)
    .eq('week_number', weekNumber)
    .eq('year', year)
    .single()
  if (error) return null
  return data?.reflection as WeeklyReflection ?? null
}

export async function upsertWeeklyReflection(
  userId: string,
  weekNumber: number,
  year: number,
  reflection: WeeklyReflection
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('weekly_reflections')
    .upsert(
      { user_id: userId, week_number: weekNumber, year, reflection, generated_at: new Date().toISOString() },
      { onConflict: 'user_id,week_number,year' }
    )
}
