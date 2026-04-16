'use client'

import { useState, useCallback, useRef } from 'react'
import type { Goal, CheckIn, HabitWithLogs, Brief } from '@/lib/types'
import type { UserMemory } from '@/lib/ai/memory'
import BriefLoader from './BriefLoader'
import BriefHistory from './BriefHistory'
import ClarifyingQuestions, { type QAPair } from './ClarifyingQuestions'
import WeeklyCalendarStrip from './WeeklyCalendarStrip'
import GreetingWidget from './GreetingWidget'
import AIInsightCard from './AIInsightCard'
import PriorityCard from './PriorityCard'
import { CATEGORY_COLORS } from './PriorityCard'

type Props = {
  goals: Goal[]
  checkin: CheckIn | null
  avgEnergy: number | null
  habits: HabitWithLogs[]
  brief?: Brief | null
  needsGeneration?: boolean | null
  memory?: UserMemory | null
  pastBriefs?: Brief[]
  coverUrl?: string | null
}


const DEFAULT_COVER = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1400&q=80'

export default function DailyBrief({ goals, checkin, avgEnergy, habits, brief: initialBrief, needsGeneration, memory, pastBriefs = [], coverUrl }: Props) {
  const cover = coverUrl || DEFAULT_COVER
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
    <div style={{ maxWidth: '860px', margin: '0 auto', animation: 'fadeUp 0.3s var(--ease) both' }}>

      {/* Cover hero — energy ring + date embedded in overlay */}
      {(() => {
        const sw = 3.5
        const r = 22
        const circ = 2 * Math.PI * r
        const dashOffset = circ - (energyPct / 100) * circ
        return (
          <div style={{
            position: 'relative',
            height: '180px',
            background: `url(${cover}) center/cover no-repeat`,
            borderRadius: '0 0 20px 20px',
            marginBottom: '0',
            overflow: 'hidden',
          }}>
            {/* Gradient overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(19,17,16,0.92) 0%, rgba(19,17,16,0.25) 60%, transparent 100%)',
            }} />
            {/* Bottom row: ring + date/day — menu icon */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '18px 24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {/* Energy ring */}
                <div style={{ position: 'relative', width: '52px', height: '52px', flexShrink: 0 }}>
                  <svg width="52" height="52" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
                    <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={sw} />
                    <circle cx="26" cy="26" r={r} fill="none" stroke="var(--sage)" strokeWidth={sw}
                      strokeDasharray={circ} strokeDashoffset={dashOffset} strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1) 0.15s' }}
                    />
                  </svg>
                  <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                    {Math.round(energyPct)}
                  </span>
                </div>
                {/* Day number + full day name */}
                <div>
                  <div style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(212,168,83,0.85)', fontWeight: 600, marginBottom: '3px' }}>
                    {now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: '30px', fontWeight: 800, color: '#f2ebe0', lineHeight: 1, letterSpacing: '-0.02em' }}>{now.getDate()}</span>
                    <span style={{ fontSize: '20px', fontWeight: 500, color: 'rgba(242,235,224,0.65)', lineHeight: 1 }}>{now.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                  </div>
                </div>
              </div>
              {/* Menu icon */}
              <div style={{ color: 'rgba(242,235,224,0.5)', cursor: 'pointer', paddingBottom: '4px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="9" x2="20" y2="9" />
                  <line x1="4" y1="15" x2="20" y2="15" />
                </svg>
              </div>
            </div>
          </div>
        )
      })()}

      <div className="page-pad" style={{ paddingTop: '20px' }}>
      <WeeklyCalendarStrip />
      <GreetingWidget checkin={checkin} habits={habits} goals={goals} brief={brief} />

      {/* AI Insight / Loader / fallback */}
      {generating ? (
        <div style={{ background: 'var(--ai-card-bg)', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', marginBottom: '20px' }}>
          <BriefLoader force={forceRegen} onBriefReady={handleBriefReady} onError={handleGenError} />
        </div>
      ) : genError ? (
        <ErrorCard message={genError} onRetry={handleRegenerate} />
      ) : brief ? (
        <AIInsightCard text={brief.insight_text} onRegenerate={checkin ? handleRegenerate : undefined} updating={silentUpdating} />
      ) : (
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '26px 28px', marginBottom: '20px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 300, color: 'var(--text-1)', lineHeight: 1.6 }}>
            Complete your daily check-in to get your personalized brief.
          </div>
          <a href="/checkin" style={{ display: 'inline-block', marginTop: '16px', padding: '9px 22px', background: 'var(--gold)', color: '#131110', borderRadius: '8px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
            Start check-in →
          </a>
        </div>
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


      {/* Priorities */}
      {brief?.priorities && brief.priorities.length > 0 ? (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '10px' }}>
            Today&apos;s priorities
          </div>
          <div style={{
            background: 'var(--bg-1)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '0 24px',
            overflow: 'hidden',
          }}>
            {brief.priorities.map((p, i) => (
              <PriorityCard
                key={i}
                num={i + 1}
                title={p.title}
                category={p.category}
                time={p.estimated_time}
                timeOfDay={p.time_of_day}
                reasoning={p.reasoning}
                last={i === brief.priorities!.length - 1}
              />
            ))}
          </div>
        </div>
      ) : null}


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
      </div>{/* end page-pad */}
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
