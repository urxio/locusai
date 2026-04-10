'use server'

import { createClient } from '@/lib/supabase/server'
import { markBriefStale } from '@/lib/db/briefs'
import { updateMemoryStats } from '@/lib/memory/update-stats'
import { revalidatePath } from 'next/cache'

import { getUserLocalDate } from '@/lib/db/users'

type CheckinInput = {
  energy_level: number
  mood_note: string | null
  blockers: string[]
  localDate?: string  // YYYY-MM-DD from the client's browser
}

export async function submitCheckin(input: CheckinInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Use client-provided date if available; otherwise look up user's stored timezone
  const today = input.localDate ?? await getUserLocalDate(user.id)

  const { error } = await supabase
    .from('check_ins')
    .upsert(
      {
        user_id: user.id,
        energy_level: input.energy_level,
        mood_note: input.mood_note,
        blockers: input.blockers,
        date: today,
        checked_in_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,date' }
    )

  if (error) throw new Error(error.message)

  // Mark today's brief as stale so it regenerates with new check-in data
  await markBriefStale(user.id)

  // Update memory stats in background (non-blocking, non-fatal)
  await updateMemoryStats(user.id)

  revalidatePath('/brief')
  revalidatePath('/checkin')
}
