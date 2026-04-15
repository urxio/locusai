import { createClient } from '@/lib/supabase/server'
import { getTodayCheckin } from '@/lib/db/checkins'
import { getTodayJournal } from '@/lib/db/journals'
import CheckinTabs from '@/components/checkin/CheckinTabs'

export const dynamic = 'force-dynamic'

export default async function CheckinPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [existing, todayJournal] = await Promise.all([
    getTodayCheckin(user.id),
    getTodayJournal(user.id),
  ])

  return (
    <CheckinTabs existingCheckin={existing} todayJournal={todayJournal} />
  )
}
