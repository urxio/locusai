'use client'

import { useState, useTransition } from 'react'
import { WHEEL_AREAS, type WheelScores, type WheelSnapshot } from '@/lib/types'
import { saveWheelSnapshot } from '@/app/actions/wheel'
import RadarChart from './RadarChart'

// ── Score selector ──────────────────────────────────────────────────────────

function ScoreSelector({
  areaKey,
  label,
  value,
  suggested,
  onChange,
}: {
  areaKey: string
  label: string
  value: number
  suggested?: number
  onChange: (v: number) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: '140px', flexShrink: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-0)' }}>{label}</div>
        {suggested !== undefined && (
          <div style={{ fontSize: '10px', color: 'var(--sage)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg viewBox="0 0 10 10" width="8" height="8" fill="var(--sage)"><circle cx="5" cy="5" r="4"/></svg>
            data suggests {suggested.toFixed(1)}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
          const isSelected = value === n
          const isSuggested = suggested !== undefined && Math.round(suggested) === n && !isSelected
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                border: isSelected
                  ? '1.5px solid var(--gold)'
                  : isSuggested
                    ? '1.5px dashed var(--sage)'
                    : '1px solid var(--border-md)',
                background: isSelected
                  ? 'var(--gold)'
                  : isSuggested
                    ? 'rgba(122,158,138,0.1)'
                    : 'transparent',
                color: isSelected
                  ? 'var(--bg-0)'
                  : n <= value
                    ? 'var(--text-0)'
                    : 'var(--text-3)',
                fontSize: '11px',
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.12s',
                flexShrink: 0,
              }}
            >
              {n}
            </button>
          )
        })}
      </div>

      <div style={{
        width: '28px', textAlign: 'right', fontSize: '18px',
        fontFamily: 'var(--font-serif)', fontWeight: 500,
        color: value > 0 ? 'var(--text-0)' : 'var(--text-3)',
      }}>
        {value > 0 ? value : '–'}
      </div>
    </div>
  )
}

// ── History strip ───────────────────────────────────────────────────────────

function HistoryStrip({ snapshots }: { snapshots: WheelSnapshot[] }) {
  if (snapshots.length === 0) return null

  return (
    <div style={{ marginTop: '32px' }}>
      <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 600, marginBottom: '12px' }}>
        Past snapshots
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {snapshots.slice(0, 6).map(snap => {
          const avg = (Object.values(snap.scores).reduce((s, v) => s + v, 0) / Object.values(snap.scores).length).toFixed(1)
          const date = new Date(snap.snapshot_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          return (
            <div key={snap.id} style={{ background: 'var(--bg-2)', borderRadius: '10px', padding: '12px 14px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>{date}</span>
                <span style={{ fontSize: '13px', fontFamily: 'var(--font-serif)', color: 'var(--gold)' }}>{avg} avg</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {WHEEL_AREAS.map(a => (
                  <div key={a.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '6px',
                      background: `color-mix(in srgb, var(--gold) ${((snap.scores[a.key] ?? 0) / 10) * 80}%, var(--bg-3))`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: 700, color: 'var(--text-0)',
                    }}>
                      {snap.scores[a.key] ?? '–'}
                    </div>
                    <div style={{ fontSize: '8px', color: 'var(--text-3)', maxWidth: '32px', textAlign: 'center', lineHeight: 1.2 }}>
                      {a.label.split(' ')[0]}
                    </div>
                  </div>
                ))}
              </div>
              {snap.insight && (
                <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.5, fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                  "{snap.insight.slice(0, 160)}{snap.insight.length > 160 ? '…' : ''}"
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export default function WheelOfLife({
  today,
  existingSnapshot,
  suggested,
  history,
}: {
  today: string
  existingSnapshot: WheelSnapshot | null
  suggested: Partial<WheelScores>
  history: WheelSnapshot[]
}) {
  const defaultScores = existingSnapshot?.scores ?? {}
  const [scores, setScores] = useState<WheelScores>(
    Object.fromEntries(WHEEL_AREAS.map(a => [a.key, defaultScores[a.key] ?? 0]))
  )
  const [insight, setInsight] = useState<string | null>(existingSnapshot?.insight ?? null)
  const [insightLoading, setInsightLoading] = useState(false)
  const [saved, setSaved] = useState(!!existingSnapshot)
  const [isPending, startTransition] = useTransition()

  const allScored = WHEEL_AREAS.every(a => scores[a.key] > 0)
  const avg = allScored
    ? (Object.values(scores).reduce((s, v) => s + v, 0) / Object.values(scores).length).toFixed(1)
    : null

  function setScore(key: string, value: number) {
    setSaved(false)
    setScores(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    startTransition(async () => {
      await saveWheelSnapshot(today, scores, insight)
      setSaved(true)
      // Fetch AI insight after saving
      if (allScored) {
        setInsightLoading(true)
        try {
          const res = await fetch('/api/wheel/insight', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scores, suggested }),
          })
          const { insight: text } = await res.json()
          setInsight(text)
          // Persist insight
          await saveWheelSnapshot(today, scores, text)
        } catch (e) {
          console.error('Insight generation failed', e)
        } finally {
          setInsightLoading(false)
        }
      }
    })
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '24px 20px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--gold) 0%, #a07830 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <WheelIcon />
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 400, color: 'var(--text-0)', margin: 0 }}>
            Wheel of Life
          </h1>
          {avg && (
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-serif)', fontSize: '22px', color: 'var(--gold)' }}>
              {avg}
            </span>
          )}
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: 0, lineHeight: 1.5 }}>
          Rate each area honestly — 1 is neglected, 10 is thriving.
          {Object.keys(suggested).length > 0 && (
            <span style={{ color: 'var(--sage)' }}> Dashed outlines show what your data suggests.</span>
          )}
        </p>
      </div>

      {/* Two-column layout on wider screens */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '28px' }}>

        {/* Scoring list */}
        <div style={{ background: 'var(--bg-1)', borderRadius: '16px', padding: '4px 16px 16px', border: '1px solid var(--border)' }}>
          {WHEEL_AREAS.map(a => (
            <ScoreSelector
              key={a.key}
              areaKey={a.key}
              label={a.label}
              value={scores[a.key] ?? 0}
              suggested={suggested[a.key]}
              onChange={v => setScore(a.key, v)}
            />
          ))}
          <div style={{ marginTop: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={handleSave}
              disabled={!allScored || isPending}
              style={{
                padding: '10px 22px',
                borderRadius: '10px',
                background: allScored ? 'var(--gold)' : 'var(--bg-3)',
                color: allScored ? 'var(--bg-0)' : 'var(--text-3)',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: allScored ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s',
              }}
            >
              {isPending ? 'Saving…' : saved ? 'Saved ✓' : 'Save snapshot'}
            </button>
            {!allScored && (
              <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                Rate all 7 areas to save
              </span>
            )}
          </div>
        </div>

        {/* Radar chart */}
        <div style={{ background: 'var(--bg-1)', borderRadius: '16px', padding: '24px 16px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <RadarChart scores={scores} suggested={suggested} />
          {Object.keys(suggested).length > 0 && (
            <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--text-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '14px', height: '2px', background: 'var(--gold)', borderRadius: '1px' }} />
                You
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '14px', height: '0px', border: '1px dashed var(--sage)', borderRadius: '1px' }} />
                Data signal
              </div>
            </div>
          )}
        </div>

        {/* AI Insight */}
        {(insight || insightLoading) && (
          <div style={{
            background: 'var(--ai-card-bg, linear-gradient(135deg, color-mix(in srgb, var(--gold) 8%, var(--bg-1)), color-mix(in srgb, var(--sage) 6%, var(--bg-1))))',
            border: '1px solid color-mix(in srgb, var(--gold) 25%, var(--border))',
            borderRadius: '14px',
            padding: '18px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <svg viewBox="0 0 16 16" width="14" height="14" fill="var(--gold)">
                <circle cx="8" cy="8" r="3"/><circle cx="8" cy="2" r="1.2"/><circle cx="8" cy="14" r="1.2"/>
                <circle cx="2" cy="8" r="1.2"/><circle cx="14" cy="8" r="1.2"/>
              </svg>
              <span style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 600 }}>
                Locus Reflection
              </span>
            </div>
            {insightLoading ? (
              <div style={{ display: 'flex', gap: '6px', padding: '4px 0' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: 'var(--gold)', opacity: 0.6,
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.65, color: 'var(--text-1)', fontStyle: 'italic' }}>
                {insight}
              </p>
            )}
          </div>
        )}
      </div>

      {/* History */}
      <HistoryStrip snapshots={history.filter(s => s.snapshot_date !== today)} />
    </div>
  )
}

function WheelIcon() {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="#131110" strokeWidth="1.3">
      <circle cx="8" cy="8" r="6"/>
      <circle cx="8" cy="8" r="2.5"/>
      <path d="M8 2v3.5M8 10.5V14M2 8h3.5M10.5 8H14" strokeLinecap="round"/>
    </svg>
  )
}
