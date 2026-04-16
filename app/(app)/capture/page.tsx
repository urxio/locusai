import { createClient } from '@/lib/supabase/server'
import { getActiveMemoryNotes } from '@/lib/db/memory-notes'
import CaptureView from '@/components/capture/CaptureView'

export const dynamic = 'force-dynamic'

export default async function CapturePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const notes = await getActiveMemoryNotes(user.id)

  return <CaptureView initialNotes={notes} />
}
