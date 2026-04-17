import { createClient } from '@/lib/supabase/server'
import { getTodayCheckin } from '@/lib/db/checkins'
import { getTodayJournal, getRecentJournals } from '@/lib/db/journals'
import { getTodayBrief } from '@/lib/db/briefs'
import { readUserMemory } from '@/lib/ai/memory'
import CheckinTabs from '@/components/checkin/CheckinTabs'

export const dynamic = 'force-dynamic'

export default async function CheckinPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [existing, todayJournal, recentJournals, memory, todayBrief] = await Promise.all([
    getTodayCheckin(user.id),
    getTodayJournal(user.id),
    getRecentJournals(user.id, 14),
    readUserMemory(user.id),
    getTodayBrief(user.id),
  ])

  return (
    <CheckinTabs
      existingCheckin={existing}
      todayJournal={todayJournal}
      recentJournals={recentJournals}
      memory={memory}
      hasBrief={!!todayBrief}
    />
  )
}
