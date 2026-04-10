import { createClient } from '@/lib/supabase/server'
import type { WeeklyReflection, WeeklyGrade } from '@/lib/ai/weekly-prompts'

export type StoredWeeklyReflection = {
  week_number: number
  year: number
  generated_at: string
  reflection: WeeklyReflection
}

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

export async function getPastWeeklyReflections(
  userId: string,
  currentWeekNumber: number,
  currentYear: number,
  limit = 12
): Promise<StoredWeeklyReflection[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('weekly_reflections')
    .select('week_number, year, generated_at, reflection')
    .eq('user_id', userId)
    .order('year',        { ascending: false })
    .order('week_number', { ascending: false })
    .limit(limit + 1)
  if (error) { console.error('getPastWeeklyReflections:', error); return [] }
  return (data ?? [])
    .filter(r => !(r.week_number === currentWeekNumber && r.year === currentYear))
    .slice(0, limit) as StoredWeeklyReflection[]
}

export async function saveWeekGrade(
  userId: string,
  weekNumber: number,
  year: number,
  grade: WeeklyGrade
): Promise<void> {
  const supabase = await createClient()
  // Read current reflection, merge grade, write back
  const { data } = await supabase
    .from('weekly_reflections')
    .select('reflection')
    .eq('user_id', userId)
    .eq('week_number', weekNumber)
    .eq('year', year)
    .single()

  const current = (data?.reflection ?? {}) as WeeklyReflection
  await supabase
    .from('weekly_reflections')
    .upsert(
      {
        user_id: userId,
        week_number: weekNumber,
        year,
        reflection: { ...current, grade },
      },
      { onConflict: 'user_id,week_number,year' }
    )
}

export async function upsertWeeklyReflection(
  userId: string,
  weekNumber: number,
  year: number,
  reflection: WeeklyReflection
): Promise<void> {
  const supabase = await createClient()
  // Preserve existing grade if present
  const { data: existing } = await supabase
    .from('weekly_reflections')
    .select('reflection')
    .eq('user_id', userId)
    .eq('week_number', weekNumber)
    .eq('year', year)
    .single()

  const existingGrade = (existing?.reflection as WeeklyReflection)?.grade
  await supabase
    .from('weekly_reflections')
    .upsert(
      {
        user_id: userId,
        week_number: weekNumber,
        year,
        reflection: existingGrade ? { ...reflection, grade: existingGrade } : reflection,
        generated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,week_number,year' }
    )
}
