'use server'

import { createClient } from '@/lib/supabase/server'
import { deleteCalendarTokens, clearCalendarCache } from '@/lib/db/calendar'
import { revalidatePath } from 'next/cache'

export async function disconnectCalendar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Delete tokens first, then clear cached events
  await deleteCalendarTokens(user.id)
  await clearCalendarCache(user.id)

  revalidatePath('/settings')
  revalidatePath('/', 'layout')
}
