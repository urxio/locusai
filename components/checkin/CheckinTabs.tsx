'use client'

import { useState } from 'react'
import ConversationalCheckin from './ConversationalCheckin'
import JournalSection from './JournalSection'
import CheckinHistory from './CheckinHistory'
import BriefHistory from '@/components/brief/BriefHistory'
import type { CheckIn, JournalEntry, Brief } from '@/lib/types'
import type { UserMemory } from '@/lib/ai/memory'

type Tab = 'checkin' | 'journal'

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
      {/* ── Sticky tab bar ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'var(--bg-0)',
        padding: '16px 20px 12px',
        borderBottom: '1px solid var(--border)',
        marginBottom: '4px',
      }}>
        <div style={{
          display: 'inline-flex',
          background: 'var(--bg-2)',
          borderRadius: '11px',
          padding: '3px',
          border: '1px solid var(--border)',
          gap: '2px',
        }}>
          {(['checkin', 'journal'] as const).map(t => {
            const active = tab === t
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  background:    active ? 'var(--bg-0)' : 'transparent',
                  border:        active ? '1px solid var(--border-md)' : '1px solid transparent',
                  borderRadius:  '8px',
                  padding:       '7px 22px',
                  fontSize:      '13px',
                  fontWeight:    active ? 700 : 500,
                  color:         active ? 'var(--text-0)' : 'var(--text-3)',
                  cursor:        'pointer',
                  transition:    'all 0.15s ease',
                  letterSpacing: '0.02em',
                  whiteSpace:    'nowrap',
                  fontFamily:    'inherit',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {t === 'checkin' ? <CheckinTabIcon active={active} /> : <JournalTabIcon active={active} />}
                  {t === 'checkin' ? 'Check-in' : 'Journal'}
                  {t === 'journal' && todayJournal?.content && (
                    <span style={{
                      width: '5px', height: '5px', borderRadius: '50%',
                      background: 'var(--sage)', flexShrink: 0,
                    }} />
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Content — both panels stay mounted; CSS hides the inactive one ── */}
      {/* Keeping both mounted preserves JournalSection's in-memory AI cache     */}
      <div style={{ display: tab === 'checkin' ? 'block' : 'none', animation: tab === 'checkin' ? 'fadeUp 0.22s var(--ease) both' : 'none' }}>
        <ConversationalCheckin existingCheckin={existingCheckin} memory={memory} hasBrief={hasBrief} />
        {pastBriefs.length > 0 && (
          <div className="page-pad" style={{ maxWidth: '860px', paddingTop: 0 }}>
            <BriefHistory briefs={pastBriefs} />
          </div>
        )}
      </div>

      <div style={{ display: tab === 'journal' ? 'block' : 'none', animation: tab === 'journal' ? 'fadeUp 0.22s var(--ease) both' : 'none' }}>
        <div className="page-pad" style={{ maxWidth: '860px' }}>
          <JournalSection existing={todayJournal} recentJournals={recentJournals} />

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

function CheckinTabIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"
      style={{ opacity: active ? 1 : 0.6 }}>
      <circle cx="8" cy="8" r="4" />
      <path d="M8 2v1M8 13v1M2 8h1M13 8h1" strokeLinecap="round" />
    </svg>
  )
}

function JournalTabIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"
      style={{ opacity: active ? 1 : 0.6 }}>
      <rect x="3" y="2" width="10" height="12" rx="1.5" />
      <path d="M6 5h4M6 8h4M6 11h2" strokeLinecap="round" />
    </svg>
  )
}
