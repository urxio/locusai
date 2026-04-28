'use server'

import { createClient } from '@/lib/supabase/server'
import { saveCaptureFolders } from '@/lib/db/users'

export async function updateCaptureFolders(folders: string[]): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await saveCaptureFolders(user.id, folders)
}
