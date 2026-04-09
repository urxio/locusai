'use client'

import { useState, useCallback } from 'react'
import type { Goal, CheckIn, HabitWithLogs, Brief } from '@/lib/types'
import BriefLoader from './BriefLoader'

type Props = {
  goals: Goal[]
  checkin: CheckIn | null
  avgEnergy: number | null
  habits: HabitWithLogs[]
  brief?: Brief | null
  needsGeneration?: boolean | null
}

const CATEGORY_COLORS: Record<string, { tag: string; border: string }> = {
  work:     { tag: 'rgba(122,158,138,0.12)', border: 'var(--sage)' },
  product:  { tag: 'rgba(122,158,138,0.12)', border: 'var(--sage)' },
  health:   { tag: 'rgba(180,130,100,0.12)', border: '#c89060' },
  personal: { tag: 'rgba(212,168,83,0.1)',   border: 'var(--gold)' },
  learning: { tag: 'rgba(100,130,180,0.12)', border: '#6090c8' },
}

export default function DailyBrief({ goals, checkin, avgEnergy, habits, brief: initialBrief, needsGeneration }: Props) {
  const [brief, setBrief] = useState<Brief | null | undefined>(initialBrief)
  const [generating, setGenerating] = useState(!!needsGeneration && !initialBrief)
  const [genError, setGenError] = useState(false)

  const handleBriefReady = useCallback((b: Brief) => {
    setBrief(b)
    setGenerating(false)
  }, [])

  const handleGenError = useCallback(() => {
    setGenerating(false)
    setGenError(true)
  }, [])

  const energy = checkin?.energy_level ?? avgEnergy ?? 7
  const energyPct = ((energy - 1) / 9) * 100
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const activeGoals = goals.filter(g => g.status === 'active').slice(0, 3)
  const completedHabits = habits.filter(h => h.weekCompletions > 0).length

  const handleRegenerate = async () => {
    setGenerating(true)
    setGenError(false)
    try {
      const res = await fetch('/api/brief/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      })
      if (!res.ok) throw new Error('Generation failed')
      const { brief: newBrief } = await res.json()
      setBrief(newBrief)
    } catch {
      setGenError(true)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div style={{ padding: '36px 40px 60px', maxWidth: '860px', animation: 'fadeUp 0.3s var(--ease) both' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 600, marginBottom: '6px', opacity: 0.85 }}>
          {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '34px', fontWeight: 400, color: 'var(--text-0)', lineHeight: 1.15, letterSpacing: '-0.01em' }}>
          {greeting}, <em style={{ fontStyle: 'italic', color: 'var(--text-1)' }}>you.</em>
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-2)', marginTop: '6px', lineHeight: 1.5 }}>
          {checkin ? "Here's your brief for today." : "Complete a check-in to get your personalized AI brief."}
        </div>
      </div>

      {/* AI Insight / Loader / No-brief card */}
      {generating ? (
        <div style={{ background: 'linear-gradient(135deg, #1e1c17 0%, #221e16 50%, #1c1a14 100%)', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', marginBottom: '20px' }}>
          <BriefLoader onBriefReady={handleBriefReady} onError={handleGenError} />
        </div>
      ) : genError ? (
        <ErrorCard onRetry={handleRegenerate} />
      ) : brief ? (
        <AIInsightCard text={brief.insight_text} onRegenerate={checkin ? handleRegenerate : undefined} />
      ) : (
        <NoBriefCard hasCheckin={!!checkin} />
      )}

      {/* Energy */}
      <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {checkin ? "Today's Energy" : 'Avg Energy (7 days)'}
          </span>
          <div>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 400, color: 'var(--text-0)' }}>{energy.toFixed(1)}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-2)', marginLeft: '6px' }}>
              {energy >= 8 ? '— Excellent' : energy >= 6 ? '— Good' : energy >= 4 ? '— Moderate' : '— Low'}
            </span>
          </div>
        </div>
        <div style={{ height: '4px', background: 'var(--bg-4)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: '4px', background: 'linear-gradient(90deg, #7a9e8a 0%, #d4a853 60%, #e8b86d 100%)', width: `${energyPct}%`, transition: 'width 1.2s cubic-bezier(0.22, 1, 0.36, 1)' }} />
        </div>
      </div>

      {/* Priorities */}
      {brief?.priorities && brief.priorities.length > 0 ? (
        <div style={{ display: 'grid', gap: '10px', marginBottom: '12px' }}>
          {brief.priorities.map((p, i) => (
            <PriorityCard
              key={i}
              num={i + 1}
              title={p.title}
              category={p.category}
              time={p.estimated_time}
              timeOfDay={p.time_of_day}
              reasoning={p.reasoning}
            />
          ))}
        </div>
      ) : !generating && activeGoals.length > 0 ? (
        <div style={{ display: 'grid', gap: '10px', marginBottom: '12px' }}>
          {activeGoals.map((g, i) => (
            <PriorityCard key={g.id} num={i + 1} title={g.next_action || g.title} category={g.category} time="—" />
          ))}
        </div>
      ) : null}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        <StatCard value={`${goals.filter(g => g.status === 'active').length}`} label="Active goals" delta={null} />
        <StatCard value={`${Math.round(goals.filter(g => g.status === 'active').reduce((s, g) => s + g.progress_pct, 0) / (goals.length || 1))}%`} label="Avg progress" delta={null} />
        <StatCard value={`${completedHabits}/${habits.length}`} label="Habits this week" delta={null} />
      </div>
    </div>
  )
}

function AIInsightCard({ text, onRegenerate }: { text: string; onRegenerate?: () => void }) {
  return (
    <div style={{ background: 'linear-gradient(135deg, #1e1c17 0%, #221e16 50%, #1c1a14 100%)', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-xl)', padding: '26px 28px', position: 'relative', overflow: 'hidden', marginBottom: '20px' }}>
      <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(212,168,83,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--gold-dim)', border: '1px solid rgba(212,168,83,0.2)', borderRadius: '20px', padding: '3px 10px 3px 7px', fontSize: '10.5px', color: 'var(--gold)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--gold)', animation: 'pulse 2s ease-in-out infinite' }} />
          Locus AI · Daily Insight
        </div>
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-3)', fontSize: '11px', padding: '3px 9px', cursor: 'pointer', letterSpacing: '0.03em', flexShrink: 0 }}
          >
            Regenerate
          </button>
        )}
      </div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '19px', fontWeight: 300, color: 'var(--text-0)', lineHeight: 1.6, letterSpacing: '0.01em', position: 'relative', zIndex: 1 }}>{text}</div>
      <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-3)', position: 'relative', zIndex: 1 }}>Based on your check-ins and goal data · Updated today</div>
    </div>
  )
}

function NoBriefCard({ hasCheckin }: { hasCheckin: boolean }) {
  return (
    <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-xl)', padding: '26px 28px', marginBottom: '20px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '19px', fontWeight: 300, color: 'var(--text-1)', lineHeight: 1.6 }}>
        {hasCheckin
          ? 'Your AI brief will appear here once generated.'
          : 'Complete your daily check-in to unlock your personalized AI brief.'}
      </div>
      {!hasCheckin && (
        <a href="/checkin" style={{ display: 'inline-block', marginTop: '16px', padding: '9px 20px', background: 'var(--gold)', color: '#131110', borderRadius: '8px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
          Start check-in →
        </a>
      )}
    </div>
  )
}

function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <div style={{ background: 'var(--bg-1)', border: '1px solid rgba(200,80,80,0.2)', borderRadius: 'var(--radius-xl)', padding: '26px 28px', marginBottom: '20px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 300, color: 'var(--text-1)', lineHeight: 1.6, marginBottom: '16px' }}>
        Brief generation encountered an issue.
      </div>
      <button
        onClick={onRetry}
        style={{ background: 'var(--gold)', color: '#131110', border: 'none', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
      >
        Try again
      </button>
    </div>
  )
}

function PriorityCard({
  num, title, category, time, timeOfDay, reasoning
}: {
  num: number; title: string; category: string; time: string; timeOfDay?: string; reasoning?: string
}) {
  const colors = CATEGORY_COLORS[category] ?? { tag: 'var(--bg-3)', border: 'var(--text-3)' }
  const borderColor = num === 1 ? 'var(--gold)' : num === 2 ? 'var(--sage)' : 'var(--text-3)'
  return (
    <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: '14px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: borderColor }} />
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 300, color: borderColor, lineHeight: 1, flexShrink: 0, width: '22px', textAlign: 'right', opacity: 0.7 }}>{num}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-0)', lineHeight: 1.3, marginBottom: '4px' }}>{title}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', background: colors.tag, color: colors.border }}>{category}</span>
          <span style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>{time}</span>
          {timeOfDay && timeOfDay !== 'flexible' && (
            <span style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'capitalize' }}>· {timeOfDay}</span>
          )}
        </div>
        {reasoning && (
          <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '6px', lineHeight: 1.5, fontStyle: 'italic' }}>{reasoning}</div>
        )}
      </div>
    </div>
  )
}

function StatCard({ value, label, delta }: { value: string; label: string; delta: string | null }) {
  return (
    <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px 18px' }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 300, color: 'var(--text-0)', lineHeight: 1, marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 500 }}>{label}</div>
      {delta && <div style={{ fontSize: '11px', color: 'var(--sage)', marginTop: '6px' }}>{delta}</div>}
    </div>
  )
}
