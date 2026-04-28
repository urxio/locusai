import { createClient } from '@/lib/supabase/server'
import { dateInTz } from '@/lib/utils/date'

export async function getUserTimezone(userId: string): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('users')
    .select('timezone')
    .eq('id', userId)
    .single()
  return data?.timezone ?? 'UTC'
}

/**
 * Returns today's date string (YYYY-MM-DD) in the user's stored timezone.
 * Use this on the server instead of new Date().toISOString().split('T')[0].
 */
export async function getUserLocalDate(userId: string): Promise<string> {
  const tz = await getUserTimezone(userId)
  return dateInTz(tz)
}

export async function getCaptureFolders(userId: string): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('users')
    .select('capture_folders')
    .eq('id', userId)
    .single()
  return data?.capture_folders ?? []
}

export async function saveCaptureFolders(userId: string, folders: string[]): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('users')
    .update({ capture_folders: folders })
    .eq('id', userId)
}
