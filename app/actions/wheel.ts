'use server'

import { createClient } from '@/lib/supabase/server'
import type { WheelScores } from '@/lib/types'
import { revalidatePath } from 'next/cache'

export async function saveWheelSnapshot(
  date: string,
  scores: WheelScores,
  insight: string | null = null
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('wheel_of_life')
    .upsert(
      { user_id: user.id, snapshot_date: date, scores, insight, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,snapshot_date' }
    )

  if (error) throw new Error(error.message)
  revalidatePath('/wheel')
}
