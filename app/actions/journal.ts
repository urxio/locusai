'use server'

import { createClient } from '@/lib/supabase/server'
import { upsertJournal } from '@/lib/db/journals'
import { revalidatePath } from 'next/cache'
import type { JournalEntry } from '@/lib/types'

export async function saveJournalAction(content: string): Promise<JournalEntry | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const trimmed = content.trim()
  if (!trimmed) return null

  const today = new Date().toISOString().split('T')[0]
  const entry = await upsertJournal(user.id, today, trimmed)

  revalidatePath('/checkin')
  revalidatePath('/checkin/history')
  revalidatePath('/brief')

  return entry
}
