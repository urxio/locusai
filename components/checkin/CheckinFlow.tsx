'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitCheckin } from '@/app/actions/checkin'
import { localDateStr } from '@/lib/utils/date'
import type { CheckIn } from '@/lib/types'

const BLOCKERS = [
  'Unclear priorities', 'Low energy', 'Too many meetings',
  'Waiting on others', 'Personal stress', 'Lack of clarity',
  'Distracted environment', 'No blockers today',
]

export default function CheckinFlow({ existingCheckin }: { existingCheckin: CheckIn | null }) {
  const [step, setStep] = useState<1 | 2 | 3 | 'done'>(existingCheckin ? 'done' : 1)
  const [energy, setEnergy] = useState(existingCheckin?.energy_level ?? 7)
  const [moodNote, setMoodNote] = useState(existingCheckin?.mood_note ?? '')
  const [blockers, setBlockers] = useState<string[]>(existingCheckin?.blockers ?? [])
  const [loading, setLoading] = useState(false)
  const [isRedo, setIsRedo] = useState(false)
  const router = useRouter()

  const handleRedo = () => {
    setIsRedo(true)
    setStep(1)
  }

  async function handleSubmit() {
    setLoading(true)
    await submitCheckin({ energy_level: energy, mood_note: moodNote || null, blockers, localDate: localDateStr() })
    setStep('done')
    setLoading(false)
    router.refresh()
  }

  const energyLabel = energy >= 9 ? 'Exceptional' : energy >= 7 ? 'High' : energy >= 5 ? 'Moderate' : energy >= 3 ? 'Low' : 'Depleted'
  const energyColor = energy >= 7 ? 'var(--sage)' : energy >= 5 ? 'var(--gold)' : '#c08060'

  return (
    <div className="page-pad" style={{ maxWidth: '860px', animation: 'fadeUp 0.3s var(--ease) both' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 600, marginBottom: '6px', opacity: 0.85 }}>
          {isRedo ? 'Updating Check-in' : 'Daily Check-in'}
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '34px', fontWeight: 400, color: 'var(--text-0)', lineHeight: 1.15 }}>
          How are you <em style={{ fontStyle: 'italic', color: 'var(--text-1)' }}>showing up</em> today?
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-2)', marginTop: '6px' }}>Takes about 90 seconds. Helps Locus understand you better over time.</div>
      </div>

      <div style={{ maxWidth: '560px' }}>

        {/* ── STEP 1: ENERGY ── */}
        {step === 1 && (
          <div style={{ animation: 'fadeUp 0.3s var(--ease) both' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 300, color: 'var(--text-0)', marginBottom: '8px', lineHeight: 1.3 }}>
              What&apos;s your energy level right now?
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '28px', lineHeight: 1.5 }}>
              Be honest — this calibrates your daily priorities.
            </div>

            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                <span>Running on empty</span>
                <span>Fully charged</span>
              </div>
              <input
                type="range" min="1" max="10" value={energy}
                onChange={e => setEnergy(Number(e.target.value))}
                style={{ width: '100%', appearance: 'none', height: '4px', borderRadius: '4px', background: `linear-gradient(to right, var(--gold) ${(energy-1)/9*100}%, var(--bg-4) ${(energy-1)/9*100}%)`, outline: 'none', cursor: 'pointer' }}
              />
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '64px', fontWeight: 300, color: 'var(--text-0)', lineHeight: 1, transition: 'color 0.3s' }}>{energy}</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: energyColor, marginTop: '4px', letterSpacing: '0.04em', textTransform: 'uppercase', transition: 'color 0.3s' }}>{energyLabel}</div>
              </div>
            </div>

            <StepNav step={1} total={3} onNext={() => setStep(2)} />
          </div>
        )}

        {/* ── STEP 2: MOOD ── */}
        {step === 2 && (
          <div style={{ animation: 'fadeUp 0.3s var(--ease) both' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 300, color: 'var(--text-0)', marginBottom: '8px', lineHeight: 1.3 }}>
              What&apos;s on your mind today?
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '28px', lineHeight: 1.5 }}>
              A sentence is enough. Locus looks for patterns across entries over time.
            </div>
            <textarea
              value={moodNote}
              onChange={e => setMoodNote(e.target.value)}
              rows={4}
              placeholder="e.g. Feeling focused but slightly anxious about the demo on Friday..."
              style={{ width: '100%', background: 'var(--bg-1)', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-md)', padding: '14px 16px', fontFamily: 'var(--font-sans)', fontSize: '14px', color: 'var(--text-0)', resize: 'none', outline: 'none', lineHeight: 1.6, marginBottom: '24px', boxSizing: 'border-box' }}
            />
            <StepNav step={2} total={3} onBack={() => setStep(1)} onNext={() => setStep(3)} />
          </div>
        )}

        {/* ── STEP 3: BLOCKERS ── */}
        {step === 3 && (
          <div style={{ animation: 'fadeUp 0.3s var(--ease) both' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 300, color: 'var(--text-0)', marginBottom: '8px', lineHeight: 1.3 }}>
              Any blockers today?
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '28px', lineHeight: 1.5 }}>
              Select all that apply. Helps Locus surface the right support.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '28px' }}>
              {BLOCKERS.map(b => (
                <button key={b}
                  onClick={() => setBlockers(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b])}
                  style={{ padding: '8px 14px', background: blockers.includes(b) ? 'var(--gold-dim)' : 'var(--bg-2)', border: `1px solid ${blockers.includes(b) ? 'rgba(212,168,83,0.3)' : 'var(--border-md)'}`, borderRadius: '20px', fontSize: '13px', color: blockers.includes(b) ? 'var(--gold)' : 'var(--text-1)', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                  {b}
                </button>
              ))}
            </div>
            <StepNav step={3} total={3} onBack={() => setStep(2)} onSubmit={handleSubmit} loading={loading} isRedo={isRedo} />
          </div>
        )}

        {/* ── DONE ── */}
        {step === 'done' && (
          <div style={{ animation: 'fadeUp 0.3s var(--ease) both' }}>
            {/* Summary card */}
            <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-xl)', padding: '28px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(122,158,138,0.2), rgba(122,158,138,0.08))', border: '1px solid rgba(122,158,138,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>✓</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 400, color: 'var(--text-0)' }}>
                    {isRedo ? 'Check-in updated.' : 'Check-in complete.'}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '3px' }}>
                    {isRedo ? 'Your brief will regenerate with the new data.' : 'Locus has updated your daily brief.'}
                  </div>
                </div>
              </div>

              {/* Today's summary */}
              <div className="stats-grid-3">
                <SummaryTile label="Energy" value={`${energy}/10`} sub={energyLabel} color={energyColor} />
                <SummaryTile label="Mood note" value={moodNote ? '✓ logged' : '—'} sub={moodNote ? moodNote.slice(0, 24) + (moodNote.length > 24 ? '…' : '') : 'skipped'} />
                <SummaryTile label="Blockers" value={`${blockers.filter(b => b !== 'No blockers today').length}`} sub={blockers.length === 0 || blockers.includes('No blockers today') ? 'none today' : blockers[0]} />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleRedo}
                style={{ flex: 1, background: 'none', border: '1px solid var(--border-md)', color: 'var(--text-2)', borderRadius: '9px', padding: '12px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                ↺ Update check-in
              </button>
              <a
                href="/brief"
                style={{ flex: 2, display: 'block', padding: '12px', background: 'var(--gold)', color: '#131110', borderRadius: '9px', fontSize: '13.5px', fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}
              >
                View Daily Brief →
              </a>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

function SummaryTile({ label, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div style={{ background: 'var(--bg-2)', borderRadius: '10px', padding: '12px 14px' }}>
      <div style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 400, color: color ?? 'var(--text-0)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>
    </div>
  )
}

function StepNav({ step, total, onBack, onNext, onSubmit, loading, isRedo }: {
  step: number; total: number; onBack?: () => void; onNext?: () => void; onSubmit?: () => void; loading?: boolean; isRedo?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
      <div style={{ display: 'flex', gap: '6px', marginRight: 'auto' }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: i < step ? 'var(--text-3)' : i === step - 1 ? 'var(--gold)' : 'var(--bg-4)', transform: i === step - 1 ? 'scale(1.3)' : 'scale(1)', transition: 'all 0.2s' }} />
        ))}
      </div>
      {onBack && <button onClick={onBack} style={{ padding: '10px 22px', borderRadius: '8px', background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--border-md)', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>}
      {onNext && <button onClick={onNext} style={{ padding: '10px 22px', borderRadius: '8px', background: 'var(--gold)', color: '#131110', border: 'none', fontSize: '13.5px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Continue →</button>}
      {onSubmit && (
        <button onClick={onSubmit} disabled={loading} style={{ padding: '10px 22px', borderRadius: '8px', background: 'var(--gold)', color: '#131110', border: 'none', fontSize: '13.5px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Saving…' : isRedo ? 'Update Check-in' : 'Submit Check-in'}
        </button>
      )}
    </div>
  )
}
