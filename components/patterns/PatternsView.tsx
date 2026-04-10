'use client'

import { useState, useCallback } from 'react'
import type { PatternsContext } from '@/lib/ai/patterns-context'

/* ── TYPES ── */
type Props = {
  ctx:                PatternsContext
  cachedNarratives:   string[] | null
  cachedGeneratedAt:  string | null
}

/* ── HELPERS ── */
function relativeDate(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

const DAYS_ORDER = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

/* ══════════════════════════════════════════════════════════ */
export default function PatternsView({ ctx, cachedNarratives, cachedGeneratedAt }: Props) {
  const [narratives, setNarratives] = useState<string[] | null>(cachedNarratives)
  const [generatedAt, setGeneratedAt] = useState<string | null>(cachedGeneratedAt)
  const [generating, setGenerating]   = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const hasEnoughData = ctx.checkinCount >= 10

  const generate = useCallback(async (force = false) => {
    setGenerating(true)
    setError(null)
    try {
      const res  = await fetch('/api/patterns/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ force }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (json.error === 'insufficient_data') {
          setError(json.message)
        } else {
          throw new Error(json.detail ?? json.error ?? `HTTP ${res.status}`)
        }
        return
      }
      setNarratives(json.narratives)
      if (!json.cached) setGeneratedAt(new Date().toISOString())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setGenerating(false)
    }
  }, [])

  const now = new Date()

  return (
    <div className="page-pad" style={{ maxWidth: '860px', animation: 'fadeUp 0.3s var(--ease) both' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 600, marginBottom: '6px', opacity: 0.85 }}>
          {ctx.checkinCount} check-ins · {ctx.journalCount} journal entries · last 90 days
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '34px', fontWeight: 400, color: 'var(--text-0)', lineHeight: 1.15 }}>
          Patterns & <em style={{ fontStyle: 'italic', color: 'var(--text-1)' }}>insights.</em>
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-2)', marginTop: '6px' }}>
          What the data reveals that you wouldn't notice day-to-day.
        </div>
      </div>

      {/* ── AI OBSERVATIONS ── */}
      <div style={{ background: 'var(--ai-card-bg)', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-xl)', padding: '26px 28px', marginBottom: '20px', position: 'relative', overflow: 'hidden' }}>
        {/* Background glow */}
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '220px', height: '220px', background: 'radial-gradient(circle, rgba(122,158,138,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Label row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(122,158,138,0.12)', border: '1px solid rgba(122,158,138,0.22)', borderRadius: '20px', padding: '3px 10px 3px 7px', fontSize: '10.5px', color: 'var(--sage)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--sage)', animation: 'pulse 2s ease-in-out infinite' }} />
            Locus Sees This
          </div>
          {narratives && generatedAt && (
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
              Updated {relativeDate(generatedAt)}
            </span>
          )}
        </div>

        {/* Observations or CTA */}
        {generating ? (
          <GeneratingState />
        ) : narratives && narratives.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', position: 'relative', zIndex: 1 }}>
            {narratives.map((n, i) => (
              <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', color: 'var(--sage)', opacity: 0.5, lineHeight: 1.2, flexShrink: 0, paddingTop: '2px' }}>
                  {i + 1}
                </span>
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 300, color: 'var(--ai-card-text)', lineHeight: 1.65, letterSpacing: '0.01em', margin: 0 }}>
                  {n}
                </p>
              </div>
            ))}
            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>
                Based on correlations in your real data · refreshes weekly
              </span>
              <button
                onClick={() => generate(true)}
                className="icon-btn"
                style={{ background: 'none', border: '1px solid var(--border-md)', borderRadius: '6px', color: 'var(--text-2)', fontSize: '11px', padding: '3px 10px', cursor: 'pointer', letterSpacing: '0.03em' }}
              >
                Regenerate
              </button>
            </div>
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={() => generate(false)} />
        ) : (
          <NoNarrativesState
            hasEnoughData={hasEnoughData}
            checkinCount={ctx.checkinCount}
            onGenerate={() => generate(false)}
          />
        )}
      </div>

      {/* ── DATA PANELS ── */}
      {hasEnoughData && (
        <>
          {/* Row 1: Energy by day + Habit correlations */}
          <div className="two-col" style={{ marginBottom: '12px' }}>
            <EnergyByDayCard ctx={ctx} />
            <HabitEnergyCard ctx={ctx} />
          </div>

          {/* Row 2: Habit chains + Journal sentiment */}
          <div className="two-col" style={{ marginBottom: '12px' }}>
            <HabitChainsCard ctx={ctx} />
            <SentimentCard ctx={ctx} />
          </div>
        </>
      )}

      {/* Insufficient data state */}
      {!hasEnoughData && (
        <InsufficientDataCard checkinCount={ctx.checkinCount} />
      )}
    </div>
  )
}

/* ══ LOADING STATE ══════════════════════════════════════════ */
function GeneratingState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {[0.85, 0.65, 0.75].map((w, i) => (
        <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          <div style={{ width: '18px', height: '20px', borderRadius: '4px', background: 'var(--bg-3)', flexShrink: 0, animation: `pulse 1.5s ease-in-out ${i * 0.15}s infinite` }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ height: '16px', borderRadius: '4px', background: 'var(--bg-3)', width: `${w * 100}%`, animation: `pulse 1.5s ease-in-out ${i * 0.15}s infinite` }} />
            <div style={{ height: '16px', borderRadius: '4px', background: 'var(--bg-3)', width: `${(w - 0.2) * 100}%`, animation: `pulse 1.5s ease-in-out ${i * 0.15 + 0.1}s infinite` }} />
          </div>
        </div>
      ))}
      <div style={{ fontSize: '12px', color: 'var(--sage)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--sage)', animation: 'pulse 1s ease-in-out infinite' }} />
        Locus is reading your patterns…
      </div>
    </div>
  )
}

/* ══ ERROR STATE ════════════════════════════════════════════ */
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '8px' }}>Something went wrong generating patterns.</div>
      <div style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'monospace', background: 'var(--bg-3)', borderRadius: '6px', padding: '6px 10px', marginBottom: '12px', wordBreak: 'break-all' }}>{message}</div>
      <button onClick={onRetry} style={{ background: 'var(--sage)', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>Try again</button>
    </div>
  )
}

/* ══ NO NARRATIVES (CTA) ════════════════════════════════════ */
function NoNarrativesState({ hasEnoughData, checkinCount, onGenerate }: { hasEnoughData: boolean; checkinCount: number; onGenerate: () => void }) {
  if (!hasEnoughData) {
    return (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '17px', fontWeight: 300, color: 'var(--ai-card-text)', lineHeight: 1.6, marginBottom: '8px' }}>
          Patterns emerge with time — keep checking in.
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
          {checkinCount}/10 check-ins needed to unlock pattern analysis.
        </div>
      </div>
    )
  }
  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '17px', fontWeight: 300, color: 'var(--ai-card-text)', lineHeight: 1.6, marginBottom: '16px' }}>
        You have enough data. Let Locus find what you've been missing.
      </div>
      <button
        onClick={onGenerate}
        style={{ background: 'var(--sage)', color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 24px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.02em' }}
      >
        ◉ Find my patterns
      </button>
    </div>
  )
}

/* ══ DATA PANEL: Energy by day ══════════════════════════════ */
function EnergyByDayCard({ ctx }: { ctx: PatternsContext }) {
  const hasDayData = Object.keys(ctx.energyByDay).length >= 3

  return (
    <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
      <SectionLabel>Energy by day of week</SectionLabel>
      {hasDayData ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
          {DAYS_ORDER.filter(d => ctx.energyByDay[d] != null).map(day => {
            const val   = ctx.energyByDay[day]
            const pct   = ((val - 1) / 9) * 100
            const isBest  = day === ctx.bestDay
            const isWorst = day === ctx.worstDay
            return (
              <div key={day} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: isBest ? 'var(--sage)' : isWorst ? '#e06060' : 'var(--text-2)', width: '28px', flexShrink: 0 }}>{day}</span>
                <div style={{ flex: 1, height: '6px', background: 'var(--bg-3)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: '4px', width: `${pct}%`, background: isBest ? 'var(--sage)' : isWorst ? '#e06060' : 'linear-gradient(90deg, var(--gold), #e8b86d)', transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)' }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: isBest ? 'var(--sage)' : isWorst ? '#e06060' : 'var(--text-1)', width: '28px', textAlign: 'right', flexShrink: 0 }}>{val}</span>
              </div>
            )
          })}
          {ctx.bestDay && ctx.worstDay && (
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '6px', lineHeight: 1.5 }}>
              {ctx.bestDay}s avg {ctx.energyByDay[ctx.bestDay]}/10 · {ctx.worstDay}s avg {ctx.energyByDay[ctx.worstDay]}/10
            </div>
          )}
        </div>
      ) : (
        <EmptyState>Not enough data yet — keep checking in daily.</EmptyState>
      )}
    </div>
  )
}

/* ══ DATA PANEL: Habit × Energy ════════════════════════════ */
function HabitEnergyCard({ ctx }: { ctx: PatternsContext }) {
  const corrs = ctx.habitEnergyCorrs.slice(0, 5)
  return (
    <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
      <SectionLabel>Habits × energy correlation</SectionLabel>
      {corrs.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' }}>
          {corrs.map(h => {
            const isPos = h.diffPct > 0
            const badgeBg    = isPos ? 'rgba(122,158,138,0.14)' : 'rgba(224,96,96,0.12)'
            const badgeColor = isPos ? 'var(--sage)' : '#e06060'
            return (
              <div key={h.habitId} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>{h.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-0)', lineHeight: 1, marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                    {h.avgWith}/10 logged · {h.avgWithout}/10 not · {h.daysWith} days
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '5px', background: badgeBg, color: badgeColor, flexShrink: 0, letterSpacing: '0.03em' }}>
                  {isPos ? '+' : ''}{h.diffPct}%
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState>Correlation needs 5+ check-in days per habit — keep logging.</EmptyState>
      )}
    </div>
  )
}

/* ══ DATA PANEL: Habit chains ══════════════════════════════ */
function HabitChainsCard({ ctx }: { ctx: PatternsContext }) {
  const chains = ctx.habitChains
  return (
    <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
      <SectionLabel>Best habit combinations</SectionLabel>
      {chains.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
          {chains.map((c, i) => (
            <div key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ fontSize: '15px' }}>{c.emojiA}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>+</span>
                <span style={{ fontSize: '15px' }}>{c.emojiB}</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)', flex: 1 }}>
                  {c.nameA} + {c.nameB}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, height: '4px', background: 'var(--bg-3)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: '4px', background: 'var(--sage)', width: `${((c.avgEnergy - 1) / 9) * 100}%`, transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)' }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--sage)', flexShrink: 0 }}>
                  {c.avgEnergy}/10
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-3)', flexShrink: 0 }}>
                  vs {c.baseline}/10 avg
                </span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>{c.days} co-occurrence days</div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState>Log more habits together to discover which combinations boost your energy.</EmptyState>
      )}
    </div>
  )
}

/* ══ DATA PANEL: Journal sentiment ═════════════════════════ */
function SentimentCard({ ctx }: { ctx: PatternsContext }) {
  const { sentimentPeriods, sentimentTrend, topPositiveWords, topNegativeWords } = ctx
  const hasSentiment = sentimentPeriods.length >= 2

  const trendColor = sentimentTrend === 'improving'  ? 'var(--sage)'
    : sentimentTrend === 'declining' ? '#e06060'
    : 'var(--text-2)'
  const trendLabel = sentimentTrend === 'improving'  ? '↑ Improving'
    : sentimentTrend === 'declining' ? '↓ Declining'
    : sentimentTrend === 'stable'    ? '→ Stable'
    : null

  // Normalise bar chart: max abs score sets 100%
  const maxAbs = hasSentiment ? Math.max(...sentimentPeriods.map(p => Math.abs(p.score)), 1) : 1

  return (
    <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
      <SectionLabel>Journal mood drift</SectionLabel>
      {hasSentiment ? (
        <div style={{ marginTop: '14px' }}>
          {/* Bar chart of sentiment by period */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
            {sentimentPeriods.map((p, i) => {
              const isPos = p.score >= 0
              const barW  = (Math.abs(p.score) / maxAbs) * 100
              return (
                <div key={i}>
                  <div style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '3px' }}>{p.label} · {p.entries} entries</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '6px', background: 'var(--bg-3)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: '4px', width: `${barW}%`, background: isPos ? 'var(--sage)' : '#e06060', transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)' }} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: isPos ? 'var(--sage)' : '#e06060', flexShrink: 0, width: '30px', textAlign: 'right' }}>
                      {isPos ? '+' : ''}{p.score}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {trendLabel && (
            <div style={{ fontSize: '12px', fontWeight: 700, color: trendColor, marginBottom: '10px' }}>
              {trendLabel}
            </div>
          )}

          {/* Word chips */}
          {topPositiveWords.length > 0 && (
            <div style={{ marginBottom: '6px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Frequent positive</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {topPositiveWords.slice(0, 4).map(w => (
                  <span key={w} style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', background: 'rgba(122,158,138,0.12)', color: 'var(--sage)', fontWeight: 600 }}>{w}</span>
                ))}
              </div>
            </div>
          )}
          {topNegativeWords.length > 0 && (
            <div>
              <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>Frequent negative</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {topNegativeWords.slice(0, 4).map(w => (
                  <span key={w} style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', background: 'rgba(224,96,96,0.1)', color: '#e06060', fontWeight: 600 }}>{w}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <EmptyState>Write journal entries regularly to track your mood drift over time.</EmptyState>
      )}
    </div>
  )
}

/* ══ INSUFFICIENT DATA ══════════════════════════════════════ */
function InsufficientDataCard({ checkinCount }: { checkinCount: number }) {
  const pct = Math.min(100, (checkinCount / 10) * 100)
  return (
    <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-xl)', padding: '40px', textAlign: 'center' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔭</div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: 300, color: 'var(--text-1)', marginBottom: '8px' }}>
        Patterns need data to emerge.
      </div>
      <div style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '24px', lineHeight: 1.5 }}>
        Check in daily for a couple of weeks — the correlations will start to reveal themselves.
      </div>
      <div style={{ maxWidth: '260px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600 }}>Progress to pattern analysis</span>
          <span style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 700 }}>{checkinCount}/10</span>
        </div>
        <div style={{ height: '6px', background: 'var(--bg-3)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: '4px', background: 'linear-gradient(90deg, var(--gold), #e8b86d)', width: `${pct}%`, transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)' }} />
        </div>
      </div>
    </div>
  )
}

/* ══ SHARED UI ATOMS ════════════════════════════════════════ */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
      {children}
    </div>
  )
}
function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '14px', lineHeight: 1.6, fontStyle: 'italic' }}>
      {children}
    </div>
  )
}
