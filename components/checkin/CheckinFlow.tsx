'use client'

import { useState } from 'react'
import { submitCheckin } from '@/app/actions/checkin'
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

  async function handleSubmit() {
    setLoading(true)
    await submitCheckin({ energy_level: energy, mood_note: moodNote || null, blockers })
    setStep('done')
    setLoading(false)
  }

  return (
    <div style={{ padding: '36px 40px 60px', maxWidth: '860px', animation: 'fadeUp 0.3s var(--ease) both' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 600, marginBottom: '6px', opacity: 0.85 }}>Daily Check-in</div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '34px', fontWeight: 400, color: 'var(--text-0)', lineHeight: 1.15 }}>
          How are you <em style={{ fontStyle: 'italic', color: 'var(--text-1)' }}>showing up</em> today?
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-2)', marginTop: '6px' }}>Takes about 90 seconds. Helps Locus understand you better over time.</div>
      </div>

      <div style={{ maxWidth: '560px' }}>
        {step === 1 && (
          <div style={{ animation: 'fadeUp 0.3s var(--ease) both' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 300, color: 'var(--text-0)', marginBottom: '8px', lineHeight: 1.3 }}>What&apos;s your energy level right now?</div>
            <div style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '28px', lineHeight: 1.5 }}>Be honest — this calibrates your daily priorities.</div>

            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                <span>Running on empty</span>
                <span>Fully charged</span>
              </div>
              <input type="range" min="1" max="10" value={energy} onChange={e => setEnergy(Number(e.target.value))}
                style={{ width: '100%', appearance: 'none', height: '4px', borderRadius: '4px', background: `linear-gradient(to right, var(--gold) ${(energy-1)/9*100}%, var(--bg-4) ${(energy-1)/9*100}%)`, outline: 'none', cursor: 'pointer' }}
              />
              <div style={{ textAlign: 'center', fontFamily: 'var(--font-serif)', fontSize: '52px', fontWeight: 300, color: 'var(--text-0)', marginTop: '10px', transition: 'color 0.3s' }}>{energy}</div>
            </div>

            <StepNav step={1} total={3} onNext={() => setStep(2)} />
          </div>
        )}

        {step === 2 && (
          <div style={{ animation: 'fadeUp 0.3s var(--ease) both' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 300, color: 'var(--text-0)', marginBottom: '8px', lineHeight: 1.3 }}>What&apos;s on your mind today?</div>
            <div style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '28px', lineHeight: 1.5 }}>A sentence is enough. Locus looks for patterns across entries over time.</div>
            <textarea
              value={moodNote}
              onChange={e => setMoodNote(e.target.value)}
              rows={4}
              placeholder="e.g. Feeling focused but slightly anxious about the demo on Friday..."
              style={{ width: '100%', background: 'var(--bg-1)', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-md)', padding: '14px 16px', fontFamily: 'var(--font-sans)', fontSize: '14px', color: 'var(--text-0)', resize: 'none', outline: 'none', lineHeight: 1.6, marginBottom: '24px' }}
            />
            <StepNav step={2} total={3} onBack={() => setStep(1)} onNext={() => setStep(3)} />
          </div>
        )}

        {step === 3 && (
          <div style={{ animation: 'fadeUp 0.3s var(--ease) both' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 300, color: 'var(--text-0)', marginBottom: '8px', lineHeight: 1.3 }}>Any blockers today?</div>
            <div style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '28px', lineHeight: 1.5 }}>Select all that apply. Helps Locus surface the right support.</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '28px' }}>
              {BLOCKERS.map(b => (
                <button key={b} onClick={() => setBlockers(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b])}
                  style={{ padding: '8px 14px', background: blockers.includes(b) ? 'var(--gold-dim)' : 'var(--bg-2)', border: `1px solid ${blockers.includes(b) ? 'rgba(212,168,83,0.3)' : 'var(--border-md)'}`, borderRadius: '20px', fontSize: '13px', color: blockers.includes(b) ? 'var(--gold)' : 'var(--text-1)', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                  {b}
                </button>
              ))}
            </div>
            <StepNav step={3} total={3} onBack={() => setStep(2)} onSubmit={handleSubmit} loading={loading} />
          </div>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '40px 0', animation: 'fadeUp 0.3s var(--ease) both' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(122,158,138,0.2), rgba(122,158,138,0.08))', border: '1px solid rgba(122,158,138,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '28px' }}>✓</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 400, color: 'var(--text-0)', marginBottom: '8px' }}>Check-in complete.</div>
            <div style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.5, marginBottom: '28px' }}>
              {existingCheckin ? "You've already checked in today." : 'Locus has updated your daily brief.'}
            </div>
            <a href="/brief" style={{ display: 'inline-block', padding: '10px 22px', background: 'var(--gold)', color: '#131110', borderRadius: '8px', fontSize: '13.5px', fontWeight: 700, textDecoration: 'none' }}>
              View Daily Brief →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

function StepNav({ step, total, onBack, onNext, onSubmit, loading }: {
  step: number; total: number; onBack?: () => void; onNext?: () => void; onSubmit?: () => void; loading?: boolean
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
      {onSubmit && <button onClick={onSubmit} disabled={loading} style={{ padding: '10px 22px', borderRadius: '8px', background: 'var(--gold)', color: '#131110', border: 'none', fontSize: '13.5px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{loading ? 'Saving...' : 'Submit Check-in'}</button>}
    </div>
  )
}
