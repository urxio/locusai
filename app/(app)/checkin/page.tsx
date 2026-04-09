import { createClient } from '@/lib/supabase/server'
import { getTodayCheckin } from '@/lib/db/checkins'
import { getTodayJournal } from '@/lib/db/journals'
import CheckinFlow from '@/components/checkin/CheckinFlow'
import JournalSection from '@/components/checkin/JournalSection'
import Link from 'next/link'

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
    <>
      <CheckinFlow existingCheckin={existing} />

      {/* Journal section — always visible, below the check-in flow */}
      <div className="page-pad" style={{ maxWidth: '860px', paddingTop: 0 }}>
        <JournalSection existing={todayJournal} />

        {/* History link */}
        <div style={{
          marginTop: '36px',
          paddingTop: '24px',
          borderTop: '1px solid var(--border-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.4 }}>
            Past entries, mood notes, and journal reflections
          </div>
          <Link
            href="/checkin/history"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontSize: '13px', color: 'var(--text-2)', textDecoration: 'none',
              fontWeight: 600, padding: '8px 14px',
              border: '1px solid var(--border-md)',
              borderRadius: '8px',
              background: 'var(--bg-2)',
              flexShrink: 0,
            }}
          >
            View history →
          </Link>
        </div>
      </div>
    </>
  )
}
