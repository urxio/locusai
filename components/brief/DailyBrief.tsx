'use client'

import { useState, useCallback, useRef } from 'react'
import type { Goal, CheckIn, HabitWithLogs, Brief } from '@/lib/types'
import type { UserMemory } from '@/lib/ai/memory'
import BriefLoader from './BriefLoader'
import MemoryCard from './MemoryCard'
import BriefHistory from './BriefHistory'
import ClarifyingQuestions, { type QAPair } from './ClarifyingQuestions'

type Props = {
  goals: Goal[]
  checkin: CheckIn | null
  avgEnergy: number | null
  habits: HabitWithLogs[]
  brief?: Brief | null
  needsGeneration?: boolean | null
  memory?: UserMemory | null
  pastBriefs?: Brief[]
}

const CATEGORY_COLORS: Record<string, { tag: string; border: string }> = {
  work:     { tag: 'rgba(122,158,138,0.12)', border: 'var(--sage)' },
  product:  { tag: 'rgba(122,158,138,0.12)', border: 'var(--sage)' },
  health:   { tag: 'rgba(180,130,100,0.12)', border: '#c89060' },
  personal: { tag: 'rgba(212,168,83,0.1)',   border: 'var(--gold)' },
  learning: { tag: 'rgba(100,130,180,0.12)', border: '#6090c8' },
}

export default function DailyBrief({ goals, checkin, avgEnergy, habits, brief: initialBrief, needsGeneration, memory, pastBriefs = [] }: Props) {
  const [brief, setBrief] = useState<Brief | null | undefined>(initialBrief)
  const [generating, setGenerating] = useState(!!needsGeneration && !initialBrief)
  const [forceRegen, setForceRegen] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [liveQuestions, setLiveQuestions] = useState<string[] | null>(null)
  // Tracks whether the user has answered Q&A this session — prevents persisted questions from re-appearing
  const [questionsAnswered, setQuestionsAnswered] = useState(false)
  // Whether a silent post-Q&A regen is in progress (no loading spinner shown)
  const [silentUpdating, setSilentUpdating] = useState(false)
  // Short AI note appended below the brief after Q&A
  const [clarificationNote, setClarificationNote] = useState<string | null>(null)
  const [noteLoading, setNoteLoading] = useState(false)
  // After the user answers Q&A, suppress any new questions from the subsequent regeneration
  const suppressNextQuestions = useRef(false)

  // Clarifying questions — prefer live questions from the current generation,
  // fall back to persisted questions in memory (shown on re-navigation).
  // Suppressed once user has answered this session.
  const todayStr = new Date().toISOString().split('T')[0]
  const pendingClarifications = memory?.pending_clarifications
  const persistedQuestions =
    !questionsAnswered &&
    pendingClarifications?.brief_date === todayStr &&
    pendingClarifications.questions.length > 0
      ? pendingClarifications.questions
      : null
  const clarifyingQuestions = liveQuestions ?? persistedQuestions

  const handleBriefReady = useCallback((b: Brief, questions: string[]) => {
    setBrief(b)
    setGenerating(false)
    setForceRegen(false)
    if (questions.length > 0 && !suppressNextQuestions.current) {
      setLiveQuestions(questions)
    }
    // Reset AFTER checking so suppression covers the full round-trip
    suppressNextQuestions.current = false
  }, [])

  const handleGenError = useCallback((detail: string) => {
    setGenerating(false)
    setForceRegen(false)
    setGenError(detail)
  }, [])

  const energy = checkin?.energy_level ?? avgEnergy ?? 7
  const energyPct = ((energy - 1) / 9) * 100
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const activeGoals = goals.filter(g => g.status === 'active').slice(0, 3)
  const completedHabits = habits.filter(h => h.weekCompletions > 0).length

  // Full-spinner regeneration (manual "Regenerate" button) — BriefLoader handles the fetch
  const handleRegenerate = () => {
    setGenerating(true)
    setForceRegen(true)
    setGenError(null)
  }

  // After Q&A: generate a short clarification note to show below the brief
  const generateClarificationNote = async (answers: QAPair[], currentBrief: Brief) => {
    if (!answers.length) return
    setNoteLoading(true)
    try {
      const res = await fetch('/api/brief/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, briefInsight: currentBrief.insight_text }),
      })
      const json = await res.json().catch(() => ({}))
      if (json.note) setClarificationNote(json.note)
    } catch {
      // silent fail — answers are saved regardless
    } finally {
      setNoteLoading(false)
    }
  }

  return (
    <div className="page-pad" style={{ maxWidth: '860px', animation: 'fadeUp 0.3s var(--ease) both' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 600, marginBottom: '6px', opacity: 0.85 }}>
          {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '34px', fontWeight: 400, color: 'var(--text-0)', lineHeight: 1.15, letterSpacing: '-0.01em' }}>
          {greeting}, <em style={{ fontStyle: 'italic', color: 'var(--text-1)' }}>you.</em>
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-2)', marginTop: '6px', lineHeight: 1.5 }}>
          {checkin ? "Here's your brief for today." : "Check in to unlock your personalized AI brief."}
        </div>
      </div>

      {/* AI Insight / Loader / No-brief card */}
      {generating ? (
        <div style={{ background: 'var(--ai-card-bg)', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', marginBottom: '20px' }}>
          <BriefLoader force={forceRegen} onBriefReady={handleBriefReady} onError={handleGenError} />
        </div>
      ) : genError ? (
        <ErrorCard message={genError} onRetry={handleRegenerate} />
      ) : brief ? (
        <AIInsightCard text={brief.insight_text} onRegenerate={checkin ? handleRegenerate : undefined} updating={silentUpdating} />
      ) : !checkin ? (
        <PreBriefState goals={goals} habits={habits} pastBriefs={pastBriefs} avgEnergy={avgEnergy} />
      ) : (
        <NoBriefCard hasCheckin={true} />
      )}

      {/* Clarification note — short AI addendum shown after Q&A, below the brief */}
      {(clarificationNote || noteLoading) && !generating && (
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginTop: '-8px', marginBottom: '16px', animation: 'fadeUp 0.25s var(--ease) both' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--gold)', opacity: noteLoading ? 0 : 1, animation: noteLoading ? 'pulse 1s ease-in-out infinite' : 'none' }} />
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
              {noteLoading ? 'Locus is reflecting on your answers…' : 'Locus · Clarification'}
            </span>
          </div>
          {noteLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ height: '12px', borderRadius: '6px', background: 'var(--bg-3)', width: '90%', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <div style={{ height: '12px', borderRadius: '6px', background: 'var(--bg-3)', width: '70%', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: '0.1s' }} />
            </div>
          ) : (
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '15px', fontWeight: 300, color: 'var(--text-1)', lineHeight: 1.6, margin: 0 }}>
              {clarificationNote}
            </p>
          )}
        </div>
      )}

      {/* Clarifying questions — shown when AI needs more context */}
      {clarifyingQuestions && !generating && (
        <ClarifyingQuestions
          questions={clarifyingQuestions}
          briefDate={todayStr}
          onComplete={(answers) => {
            suppressNextQuestions.current = true
            setLiveQuestions(null)
            setQuestionsAnswered(true)
            // Generate a short note + optionally patch insight/priorities
            if (brief && answers.length > 0) {
              generateClarificationNote(answers, brief)
            }
          }}
        />
      )}

      {/* Memory card — what Locus has learned about this user */}
      {memory && memory.checkin_count >= 5 && (
        <MemoryCard memory={memory} />
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
      <div className="stats-grid-3">
        <StatCard value={`${goals.filter(g => g.status === 'active').length}`} label="Active goals" delta={null} />
        <StatCard value={`${Math.round(goals.filter(g => g.status === 'active').reduce((s, g) => s + g.progress_pct, 0) / (goals.length || 1))}%`} label="Avg progress" delta={null} />
        <StatCard value={`${completedHabits}/${habits.length}`} label="Habits this week" delta={null} />
      </div>

      {/* Weekly Review link */}
      <a
        href="/review"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '16px',
          padding: '13px 16px',
          background: 'var(--bg-1)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          textDecoration: 'none',
          color: 'var(--text-1)',
          fontSize: '13px',
          fontWeight: 500,
          transition: 'border-color 0.15s',
        }}
      >
        <span>Weekly review</span>
        <span style={{ color: 'var(--gold)', fontSize: '13px' }}>This week →</span>
      </a>

      {/* Brief history */}
      <BriefHistory briefs={pastBriefs} />
    </div>
  )
}

function AIInsightCard({ text, onRegenerate, updating }: { text: string; onRegenerate?: () => void; updating?: boolean }) {
  return (
    <div style={{ background: 'var(--ai-card-bg)', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-xl)', padding: '26px 28px', position: 'relative', overflow: 'hidden', marginBottom: '20px' }}>
      <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(212,168,83,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--gold-dim)', border: '1px solid rgba(212,168,83,0.2)', borderRadius: '20px', padding: '3px 10px 3px 7px', fontSize: '10.5px', color: 'var(--gold)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--gold)', animation: 'pulse 2s ease-in-out infinite' }} />
          Locus AI · Daily Insight
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {updating && (
            <span style={{ fontSize: '11px', color: 'var(--text-3)', fontStyle: 'italic' }}>Refining brief…</span>
          )}
          {onRegenerate && !updating && (
            <button
              onClick={onRegenerate}
              className="icon-btn"
              style={{ background: 'none', border: '1px solid var(--border-md)', borderRadius: '6px', color: 'var(--text-2)', fontSize: '11px', padding: '3px 9px', cursor: 'pointer', letterSpacing: '0.03em', flexShrink: 0 }}
            >
              Regenerate
            </button>
          )}
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '19px', fontWeight: 300, color: 'var(--ai-card-text)', lineHeight: 1.6, letterSpacing: '0.01em', position: 'relative', zIndex: 1 }}>{text}</div>
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

function PreBriefState({ goals, habits, pastBriefs, avgEnergy }: {
  goals: Goal[]
  habits: HabitWithLogs[]
  pastBriefs: Brief[]
  avgEnergy: number | null
}) {
  const yesterday = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString().split('T')[0]
  })()
  const yesterdayBrief = pastBriefs[0]?.brief_date === yesterday ? pastBriefs[0] : null

  const todayHabits = habits.filter(h => h.isScheduledToday)
  const habitGroups: Record<string, HabitWithLogs[]> = {
    morning:   todayHabits.filter(h => h.time_of_day === 'morning'),
    afternoon: todayHabits.filter(h => h.time_of_day === 'afternoon'),
    evening:   todayHabits.filter(h => h.time_of_day === 'evening'),
    anytime:   todayHabits.filter(h => h.time_of_day === null),
  }
  const habitGroupOrder = ['morning', 'afternoon', 'evening', 'anytime'] as const
  const habitGroupLabels: Record<string, string> = {
    morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', anytime: 'Anytime',
  }

  const activeGoals = goals.filter(g => g.status === 'active').slice(0, 3)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>

      {/* ── Check-in prompt card ── */}
      <div style={{ background: 'var(--ai-card-bg)', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-xl)', padding: '26px 28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '220px', height: '220px', background: 'radial-gradient(circle, rgba(122,158,138,0.08) 0%, rgba(212,168,83,0.06) 50%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--gold-dim)', border: '1px solid rgba(212,168,83,0.2)', borderRadius: '20px', padding: '3px 10px 3px 7px', fontSize: '10.5px', color: 'var(--gold)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '16px' }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--gold)' }} />
          Locus AI · Daily Brief
        </div>

        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '21px', fontWeight: 300, color: 'var(--text-0)', lineHeight: 1.45, letterSpacing: '0.01em', marginBottom: '8px', position: 'relative', zIndex: 1 }}>
          Your AI brief is ready when you are.
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: '20px', position: 'relative', zIndex: 1 }}>
          {`It'll weave together your ${activeGoals.length > 0 ? `${activeGoals.length} active goal${activeGoals.length !== 1 ? 's' : ''}` : 'goals'}, today's habits${avgEnergy !== null ? ', and your recent energy trends' : ''} into a focused daily plan.`}
        </div>

        {yesterdayBrief && (
          <div style={{ borderTop: '1px solid var(--border)', marginBottom: '20px', paddingTop: '14px', position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '6px' }}>
              Yesterday
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '13.5px', fontWeight: 300, color: 'var(--text-3)', lineHeight: 1.55, fontStyle: 'italic' }}>
              {yesterdayBrief.insight_text.length > 120
                ? yesterdayBrief.insight_text.slice(0, 117).trimEnd() + '…'
                : yesterdayBrief.insight_text}
            </div>
          </div>
        )}

        <a href="/checkin" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--gold)', color: '#131110', borderRadius: 'var(--radius-md)', padding: '10px 22px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', position: 'relative', zIndex: 1 }}>
          Start check-in →
        </a>
      </div>

      {/* ── Today's habits ── */}
      {todayHabits.length > 0 && (
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', animation: 'fadeUp 0.3s var(--ease) both', animationDelay: '0.05s' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '14px' }}>
            On deck today
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {habitGroupOrder.map(key => {
              const group = habitGroups[key]
              if (!group || group.length === 0) return null
              return (
                <div key={key}>
                  <div style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '6px' }}>
                    {habitGroupLabels[key]}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {group.map(habit => (
                      <div key={habit.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '5px 10px', fontSize: '12.5px', color: 'var(--text-1)', fontWeight: 500, lineHeight: 1 }}>
                        <span style={{ fontSize: '14px', lineHeight: 1 }}>{habit.emoji}</span>
                        {habit.name}
                        {habit.streak > 1 && (
                          <span style={{ fontSize: '10px', color: 'var(--gold)', fontWeight: 600, marginLeft: '2px', opacity: 0.85 }}>
                            {habit.streak}d
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Goal progress snapshot ── */}
      {activeGoals.length > 0 && (
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', animation: 'fadeUp 0.3s var(--ease) both', animationDelay: '0.1s' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '14px' }}>
            Goal progress
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activeGoals.map(goal => {
              const colors = CATEGORY_COLORS[goal.category] ?? { tag: 'rgba(160,160,160,0.1)', border: 'var(--text-3)' }
              return (
                <div key={goal.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: colors.border, flexShrink: 0, opacity: 0.85 }} />
                  <div style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: 'var(--text-1)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                    {goal.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <div style={{ width: '72px', height: '3px', background: 'var(--bg-4)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: '3px', background: colors.border, width: `${Math.min(100, Math.max(0, goal.progress_pct))}%`, opacity: 0.75, transition: 'width 0.8s cubic-bezier(0.22, 1, 0.36, 1)' }} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', minWidth: '28px', textAlign: 'right' }}>
                      {goal.progress_pct}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ background: 'var(--bg-1)', border: '1px solid rgba(200,80,80,0.2)', borderRadius: 'var(--radius-xl)', padding: '26px 28px', marginBottom: '20px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 300, color: 'var(--text-1)', lineHeight: 1.6, marginBottom: '10px' }}>
        Brief generation encountered an issue.
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-3)', fontFamily: 'monospace', background: 'var(--bg-3)', borderRadius: '6px', padding: '8px 12px', marginBottom: '16px', wordBreak: 'break-all' }}>
        {message}
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
