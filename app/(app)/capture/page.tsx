import { createClient } from '@/lib/supabase/server'
import { getActiveMemoryNotes } from '@/lib/db/memory-notes'
import { getCaptureFolders } from '@/lib/db/users'
import CaptureView from '@/components/capture/CaptureView'

export const dynamic = 'force-dynamic'

export default async function CapturePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [notes, { data: profile }, folders] = await Promise.all([
    getActiveMemoryNotes(user.id),
    supabase.from('users').select('name, avatar_url').eq('id', user.id).single(),
    getCaptureFolders(user.id),
  ])

  return (
    <CaptureView
      initialNotes={notes}
      userName={profile?.name ?? user.email?.split('@')[0] ?? 'You'}
      avatarUrl={profile?.avatar_url ?? null}
      initialFolders={folders}
    />
  )
}
