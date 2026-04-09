import { createClient } from '@/lib/supabase/server'
import { getTodayCheckin } from '@/lib/db/checkins'
import CheckinFlow from '@/components/checkin/CheckinFlow'

export const dynamic = 'force-dynamic'

export default async function CheckinPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const existing = await getTodayCheckin(user.id)
  return <CheckinFlow existingCheckin={existing} />
}
