'use server'

import { createClient } from '@/lib/supabase/server'
import { saveWeekGrade } from '@/lib/db/weekly-reflections'
import type { WeeklyGrade } from '@/lib/ai/weekly-prompts'

export async function gradeWeek(
  weekNumber: number,
  year: number,
  letter: WeeklyGrade['letter']
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await saveWeekGrade(user.id, weekNumber, year, {
    letter,
    submitted_at: new Date().toISOString(),
  })
}
