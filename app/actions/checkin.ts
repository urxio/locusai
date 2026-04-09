'use server'

import { createClient } from '@/lib/supabase/server'
import { markBriefStale } from '@/lib/db/briefs'
import { revalidatePath } from 'next/cache'

type CheckinInput = {
  energy_level: number
  mood_note: string | null
  blockers: string[]
}

export async function submitCheckin(input: CheckinInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const today = new Date().toISOString().split('T')[0]

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

  revalidatePath('/brief')
  revalidatePath('/checkin')
}
