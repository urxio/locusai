'use client'

import { useState } from 'react'
import ConversationalCheckin from './ConversationalCheckin'
import JournalSection from './JournalSection'
import BriefHistory from '@/components/brief/BriefHistory'
import type { CheckIn, JournalEntry, Brief } from '@/lib/types'
import type { UserMemory } from '@/lib/ai/memory'

export type Tab = 'checkin' | 'journal'

type Props = {
  existingCheckin: CheckIn | null
  todayJournal:    JournalEntry | null
  recentJournals:  JournalEntry[]
  memory?:         UserMemory | null
  hasBrief?:       boolean
  pastBriefs?:     Brief[]
}

export default function CheckinTabs({ existingCheckin, todayJournal, recentJournals, memory, hasBrief = false, pastBriefs = [] }: Props) {
  const [tab, setTab] = useState<Tab>('checkin')

  return (
    <div>
      {/* ── Content — both panels stay mounted; CSS hides the inactive one ── */}
      {/* Keeping both mounted preserves JournalSection's in-memory AI cache     */}
      <div style={{ display: tab === 'checkin' ? 'block' : 'none', animation: tab === 'checkin' ? 'fadeUp 0.22s var(--ease) both' : 'none' }}>
        <ConversationalCheckin
          existingCheckin={existingCheckin}
          memory={memory}
          hasBrief={hasBrief}
          tab={tab}
          setTab={setTab}
          todayJournalHasContent={!!todayJournal?.content}
        />
        {pastBriefs.length > 0 && (
          <div className="page-pad" style={{ maxWidth: '860px', paddingTop: 0 }}>
            <BriefHistory briefs={pastBriefs} />
          </div>
        )}
      </div>

      <div style={{ display: tab === 'journal' ? 'block' : 'none', animation: tab === 'journal' ? 'fadeUp 0.22s var(--ease) both' : 'none' }}>
        <div className="page-pad" style={{ maxWidth: '860px' }}>
          <JournalSection
            existing={todayJournal}
            recentJournals={recentJournals}
            tab={tab}
            setTab={setTab}
            todayJournalHasContent={!!todayJournal?.content}
          />

          {/* History link */}
          <div style={{
            maxWidth: '560px',
            marginTop: '36px',
            paddingTop: '24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.4 }}>
              Past entries, mood notes, and journal reflections
            </div>
            <a
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
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Shared tab toggle — used in each panel's header ── */
export function TabToggle({
  tab,
  setTab,
  todayJournalHasContent,
}: {
  tab: Tab
  setTab: (t: Tab) => void
  todayJournalHasContent: boolean
}) {
  return (
    <div style={{
      display: 'flex',
      background: 'var(--bg-2)',
      border: '1px solid var(--border)',
      borderRadius: '9px',
      padding: '3px',
      gap: '2px',
      flexShrink: 0,
    }}>
      {(['checkin', 'journal'] as const).map(t => {
        const active = tab === t
        return (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '6px 14px', borderRadius: '7px', border: 'none',
              cursor: 'pointer', fontSize: '12px', fontWeight: 600,
              transition: 'all 0.15s',
              background: active ? 'var(--bg-0)' : 'transparent',
              color: active ? 'var(--text-0)' : 'var(--text-3)',
              boxShadow: active ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: '5px',
              whiteSpace: 'nowrap',
            }}
          >
            {t === 'checkin' ? 'Check-in' : 'Journal'}
            {t === 'journal' && todayJournalHasContent && (
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--sage)', flexShrink: 0 }} />
            )}
          </button>
        )
      })}
    </div>
  )
}
