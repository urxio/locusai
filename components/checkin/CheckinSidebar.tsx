'use client'

import type { Brief } from '@/lib/types'
import { CATEGORY_COLORS } from '@/components/brief/PriorityCard'

type Props = {
  brief: Brief | null
}

export default function CheckinSidebar({ brief }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Section label */}
      <div style={{
        fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--text-3)',
        paddingBottom: '2px',
      }}>
        Today&apos;s Context
      </div>

      {/* AI Insight card */}
      <div style={{
        background: 'var(--glass-card-bg)',
        backdropFilter: 'blur(32px) saturate(180%)',
        WebkitBackdropFilter: 'blur(32px) saturate(180%)',
        border: '1px solid var(--glass-card-border)',
        boxShadow: 'var(--glass-card-shadow-sm)',
        borderRadius: 'var(--radius-xl)',
        padding: '18px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Ambient glow */}
        <div style={{
          position: 'absolute', top: '-30px', right: '-30px',
          width: '140px', height: '140px',
          background: 'radial-gradient(circle, rgba(212,168,83,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
          <div style={{
            width: '5px', height: '5px', borderRadius: '50%', background: brief ? 'var(--gold)' : 'var(--text-3)',
            animation: brief ? 'pulse 2s ease-in-out infinite' : 'none',
          }} />
          <span style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: brief ? 'var(--gold)' : 'var(--text-3)',
          }}>
            Locus AI · Daily Insight
          </span>
        </div>

        {brief ? (
          <p style={{
            fontFamily: 'var(--font-serif)', fontSize: '14px', fontWeight: 300,
            lineHeight: 1.7, color: 'var(--text-1)', margin: 0, position: 'relative', zIndex: 1,
          }}>
            {brief.insight_text.length > 220
              ? brief.insight_text.slice(0, 220) + '…'
              : brief.insight_text}
          </p>
        ) : (
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0, lineHeight: 1.6 }}>
            Your daily insight generates after your first check-in of the day.
          </p>
        )}
      </div>

      {/* Priorities card */}
      <div style={{
        background: 'var(--glass-card-bg)',
        backdropFilter: 'blur(32px) saturate(180%)',
        WebkitBackdropFilter: 'blur(32px) saturate(180%)',
        border: '1px solid var(--glass-card-border)',
        boxShadow: 'var(--glass-card-shadow-sm)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 20px 12px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--text-3)',
          }}>
            Today&apos;s Priorities
          </div>
          {brief && (
            <a href="/brief" style={{
              fontSize: '10px', color: 'var(--gold)', fontWeight: 600,
              textDecoration: 'none', letterSpacing: '0.04em',
            }}>
              Full brief →
            </a>
          )}
        </div>

        {brief?.priorities && brief.priorities.length > 0 ? (
          <div>
            {brief.priorities.slice(0, 3).map((p, i) => {
              const colors = CATEGORY_COLORS[p.category] ?? { tag: 'var(--bg-3)', border: 'var(--text-3)' }
              const isLast = i === Math.min(brief.priorities!.length, 3) - 1
              return (
                <div key={i} style={{
                  padding: '13px 20px',
                  borderBottom: isLast ? 'none' : '1px solid var(--border)',
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                }}>
                  <div style={{
                    fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 300,
                    color: 'var(--text-3)', opacity: 0.45, flexShrink: 0, width: '20px',
                    lineHeight: 1.1, paddingTop: '1px', textAlign: 'right',
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '13px', fontWeight: 600, color: 'var(--text-0)',
                      lineHeight: 1.35, marginBottom: '5px',
                    }}>
                      {p.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '9px', padding: '2px 7px', borderRadius: '4px',
                        fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                        background: colors.tag, color: colors.border,
                      }}>
                        {p.category}
                      </span>
                      {p.estimated_time && p.estimated_time !== '—' && (
                        <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                          {p.estimated_time}
                        </span>
                      )}
                      {p.time_of_day && p.time_of_day !== 'flexible' && (
                        <span style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'capitalize' }}>
                          · {p.time_of_day}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {brief.priorities.length > 3 && (
              <a href="/brief" style={{
                display: 'block', padding: '11px 20px',
                fontSize: '11px', color: 'var(--text-3)', textDecoration: 'none',
                borderTop: '1px solid var(--border)', fontWeight: 600,
                letterSpacing: '0.03em',
              }}>
                +{brief.priorities.length - 3} more on the brief →
              </a>
            )}
          </div>
        ) : (
          <div style={{ padding: '16px 20px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0, lineHeight: 1.6 }}>
              Priorities appear after your brief generates. Complete a check-in to get started.
            </p>
          </div>
        )}
      </div>

    </div>
  )
}
