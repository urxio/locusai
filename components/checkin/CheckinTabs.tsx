'use client'

import { useState } from 'react'
import ConversationalCheckin from './ConversationalCheckin'
import JournalSection from './JournalSection'
import BriefHistory from '@/components/brief/BriefHistory'
import PostCheckinBrief from '@/components/brief/PostCheckinBrief'
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
  const [briefReady, setBriefReady] = useState(hasBrief || !!existingCheckin)

  return (
    <div>
      <div style={{ display: tab === 'checkin' ? 'block' : 'none', animation: tab === 'checkin' ? 'fadeUp 0.22s var(--ease) both' : 'none' }}>
        <CheckinLayout
          existingCheckin={existingCheckin}
          memory={memory}
          hasBrief={hasBrief}
          tab={tab}
          setTab={setTab}
          todayJournalHasContent={!!todayJournal?.content}
          briefReady={briefReady}
          onCheckinSaved={() => setBriefReady(true)}
          pastBriefs={pastBriefs}
        />
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
          <div style={{
            maxWidth: '560px', marginTop: '36px', paddingTop: '24px',
            borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.4 }}>
              Past entries, mood notes, and journal reflections
            </div>
            <a href="/checkin/history" style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontSize: '13px', color: 'var(--text-2)', textDecoration: 'none',
              fontWeight: 600, padding: '8px 14px',
              border: '1px solid var(--border-md)', borderRadius: '8px',
              background: 'var(--bg-2)', flexShrink: 0,
            }}>
              View history →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Two-column check-in layout ─────────────────────────────────────────── */
function CheckinLayout({
  existingCheckin, memory, hasBrief, tab, setTab,
  todayJournalHasContent, briefReady, onCheckinSaved, pastBriefs,
}: {
  existingCheckin: CheckIn | null
  memory?: UserMemory | null
  hasBrief: boolean
  tab: Tab
  setTab: (t: Tab) => void
  todayJournalHasContent: boolean
  briefReady: boolean
  onCheckinSaved: () => void
  pastBriefs: Brief[]
}) {
  const CARD_H = 'min(680px, calc(100vh - 156px))'

  return (
    <div className="page-pad" style={{ maxWidth: '1180px' }}>
      <div className="checkin-two-col">

        {/* ── LEFT: Chat card ── */}
        <div style={{
          height: CARD_H,
          display: 'flex', flexDirection: 'column',
          background: 'var(--glass-card-bg)',
          backdropFilter: 'blur(40px) saturate(200%)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%)',
          border: '1px solid var(--glass-card-border)',
          borderRadius: '24px',
          boxShadow: 'var(--glass-card-shadow)',
          overflow: 'hidden',
        }}>
          <ConversationalCheckin
            existingCheckin={existingCheckin}
            memory={memory}
            hasBrief={hasBrief}
            tab={tab}
            setTab={setTab}
            todayJournalHasContent={todayJournalHasContent}
            onCheckinSaved={onCheckinSaved}
          />
        </div>

        {/* ── RIGHT: Brief card (independently scrollable) ── */}
        <div style={{
          height: CARD_H,
          display: 'flex', flexDirection: 'column',
          background: 'var(--glass-card-bg)',
          backdropFilter: 'blur(40px) saturate(200%)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%)',
          border: '1px solid var(--glass-card-border)',
          borderRadius: '24px',
          boxShadow: 'var(--glass-card-shadow)',
          overflow: 'hidden',
        }}>
          {/* Card header */}
          <div style={{
            padding: '22px 24px 16px',
            borderBottom: '1px solid var(--glass-card-border)',
            flexShrink: 0,
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--text-3)',
            }}>
              <div style={{
                width: '5px', height: '5px', borderRadius: '50%',
                background: briefReady ? 'var(--gold)' : 'var(--text-3)',
                animation: briefReady ? 'pulse 2s ease-in-out infinite' : 'none',
              }} />
              Daily Brief
            </div>
          </div>

          {/* Scrollable body */}
          <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
            {briefReady ? (
              <PostCheckinBrief memory={memory} sidebar />
            ) : (
              <BriefPlaceholder />
            )}
          </div>
        </div>

      </div>

      {/* Past briefs below */}
      {pastBriefs.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <BriefHistory briefs={pastBriefs} />
        </div>
      )}
    </div>
  )
}

/* ── Placeholder shown before check-in is complete ──────────────────────── */
function BriefPlaceholder() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '100%', minHeight: '380px',
      padding: '40px 28px', textAlign: 'center',
      gap: '0',
    }}>
      {/* Icon */}
      <div style={{
        width: '44px', height: '44px', borderRadius: '14px', marginBottom: '18px',
        background: 'linear-gradient(135deg, rgba(212,168,83,0.18) 0%, rgba(212,168,83,0.06) 100%)',
        border: '1px solid rgba(212,168,83,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="3" fill="var(--gold)" opacity="0.8"/>
          <circle cx="10" cy="3" r="1.5" fill="var(--gold)" opacity="0.4"/>
          <circle cx="10" cy="17" r="1.5" fill="var(--gold)" opacity="0.4"/>
          <circle cx="3" cy="10" r="1.5" fill="var(--gold)" opacity="0.4"/>
          <circle cx="17" cy="10" r="1.5" fill="var(--gold)" opacity="0.4"/>
        </svg>
      </div>

      <div style={{
        fontFamily: 'var(--font-serif)', fontSize: '17px', fontWeight: 400,
        color: 'var(--text-1)', lineHeight: 1.4, marginBottom: '10px',
      }}>
        Your brief awaits
      </div>
      <div style={{
        fontSize: '12.5px', color: 'var(--text-3)', lineHeight: 1.6,
        maxWidth: '220px',
      }}>
        Complete your check-in to unlock today's AI insight and priorities.
      </div>

      {/* Decorative skeleton lines */}
      <div style={{ marginTop: '36px', width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', opacity: 0.35 }}>
        {[90, 75, 82, 60].map((w, i) => (
          <div key={i} style={{
            height: '9px', borderRadius: '6px',
            background: 'var(--glass-card-border)',
            width: `${w}%`, margin: '0 auto',
            animation: `pulse 2s ease-in-out ${i * 0.15}s infinite`,
          }} />
        ))}
        <div style={{ marginTop: '16px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: '56px', flex: 1, borderRadius: '10px',
              background: 'var(--glass-card-border)',
              animation: `pulse 2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Shared tab toggle ───────────────────────────────────────────────────── */
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
