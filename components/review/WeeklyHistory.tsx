'use client'

import { useState, useTransition } from 'react'
import { gradeWeek } from '@/app/actions/grade-week'
import type { StoredWeeklyReflection } from '@/lib/db/weekly-reflections'
import type { WeeklyGrade } from '@/lib/ai/weekly-prompts'

/* ── Grade config ── */
const GRADES: WeeklyGrade['letter'][] = ['A+', 'A', 'B+', 'B', 'C', 'D', 'F']

const GRADE_COLOR: Record<WeeklyGrade['letter'], { bg: string; text: string; border: string }> = {
  'A+': { bg: 'rgba(212,168,83,0.15)',  text: 'var(--gold)',  border: 'rgba(212,168,83,0.5)' },
  'A':  { bg: 'rgba(122,158,138,0.15)', text: 'var(--sage)',  border: 'rgba(122,158,138,0.4)' },
  'B+': { bg: 'rgba(100,170,140,0.12)', text: '#5aaa86',      border: 'rgba(100,170,140,0.4)' },
  'B':  { bg: 'rgba(100,140,200,0.12)', text: '#6090c8',      border: 'rgba(100,140,200,0.35)' },
  'C':  { bg: 'rgba(200,160,80,0.12)',  text: '#b89040',      border: 'rgba(200,160,80,0.35)' },
  'D':  { bg: 'rgba(200,120,60,0.12)',  text: '#c07040',      border: 'rgba(200,120,60,0.35)' },
  'F':  { bg: 'rgba(200,80,60,0.12)',   text: '#c05040',      border: 'rgba(200,80,60,0.3)' },
}

function GradeBadge({ letter, size = 'md' }: { letter: WeeklyGrade['letter']; size?: 'sm' | 'md' | 'lg' }) {
  const c = GRADE_COLOR[letter]
  const fontSize = size === 'lg' ? '20px' : size === 'md' ? '13px' : '11px'
  const padding  = size === 'lg' ? '6px 16px' : size === 'md' ? '3px 10px' : '2px 7px'
  return (
    <span style={{
      fontSize, fontWeight: 800, letterSpacing: '0.04em',
      color: c.text, background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: '8px', padding, display: 'inline-block', lineHeight: 1.4,
      fontFamily: 'var(--font-serif)',
    }}>
      {letter}
    </span>
  )
}

/* ── Grade Picker ── */
function GradePicker({
  weekNumber, year, initial, onSaved,
}: {
  weekNumber: number
  year: number
  initial?: WeeklyGrade['letter']
  onSaved: (letter: WeeklyGrade['letter']) => void
}) {
  const [selected, setSelected] = useState<WeeklyGrade['letter'] | null>(initial ?? null)
  const [isPending, startTransition] = useTransition()

  const pick = (letter: WeeklyGrade['letter']) => {
    setSelected(letter)
    startTransition(async () => {
      await gradeWeek(weekNumber, year, letter)
      onSaved(letter)
    })
  }

  return (
    <div style={{ marginTop: '14px' }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
        {selected ? 'Your grade' : 'Grade this week'}
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {GRADES.map(g => {
          const c = GRADE_COLOR[g]
          const isActive = selected === g
          return (
            <button
              key={g}
              onClick={() => pick(g)}
              disabled={isPending}
              style={{
                fontSize: '12px', fontWeight: 800, fontFamily: 'var(--font-serif)',
                letterSpacing: '0.04em',
                padding: '5px 12px', borderRadius: '7px', cursor: 'pointer',
                border: `1px solid ${isActive ? c.border : 'var(--border)'}`,
                background: isActive ? c.bg : 'var(--bg-2)',
                color: isActive ? c.text : 'var(--text-3)',
                transition: 'all 0.15s',
                opacity: isPending ? 0.6 : 1,
                transform: isActive ? 'scale(1.08)' : 'scale(1)',
              }}
            >
              {g}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Week date range from ISO week number ── */
function weekRangeLabel(weekNum: number, year: number): string {
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dow  = jan4.getUTCDay() || 7
  const mon  = new Date(jan4)
  mon.setUTCDate(jan4.getUTCDate() - dow + 1 + (weekNum - 1) * 7)
  const sun = new Date(mon)
  sun.setUTCDate(mon.getUTCDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const sameYear = mon.getUTCFullYear() === year && sun.getUTCFullYear() === year
  return `${mon.toLocaleDateString('en-US', opts)} – ${sun.toLocaleDateString('en-US', opts)}${sameYear ? '' : `, ${year}`}`
}

/* ── Single history card ── */
function HistoryCard({ row }: { row: StoredWeeklyReflection }) {
  const [expanded, setExpanded] = useState(false)
  const [grade, setGrade] = useState<WeeklyGrade['letter'] | null>(row.reflection.grade?.letter ?? null)
  const { reflection, week_number, year } = row
  const dateRange = weekRangeLabel(week_number, year)

  return (
    <div style={{
      background: 'var(--bg-1)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
          padding: '14px 18px', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Week {week_number}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>·</span>
            <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>{dateRange}</span>
            {grade && <GradeBadge letter={grade} size="sm" />}
          </div>
          {/* First paragraph preview */}
          <div style={{
            fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.45,
            fontFamily: 'var(--font-serif)', fontWeight: 300,
            display: '-webkit-box', WebkitLineClamp: expanded ? undefined : 2,
            WebkitBoxOrient: 'vertical', overflow: expanded ? 'visible' : 'hidden',
          }}>
            {reflection.paragraphs?.[0] ?? ''}
          </div>
        </div>
        <span style={{
          fontSize: '11px', color: 'var(--text-3)', flexShrink: 0,
          transition: 'transform 0.2s', display: 'inline-block',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>▾</span>
      </button>

      {/* Expanded */}
      {expanded && (
        <div style={{
          borderTop: '1px solid var(--border)', padding: '16px 18px',
          animation: 'fadeUp 0.18s var(--ease) both',
        }}>
          {/* All paragraphs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {reflection.paragraphs?.map((p, i) => (
              <p key={i} style={{
                fontFamily: 'var(--font-serif)', fontSize: '15px', fontWeight: 300,
                color: 'var(--text-1)', lineHeight: 1.7, letterSpacing: '0.01em', margin: 0,
              }}>
                {p}
              </p>
            ))}
          </div>

          {/* What worked / What to adjust */}
          {(reflection.what_worked?.length > 0 || reflection.what_to_adjust?.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              {reflection.what_worked?.length > 0 && (
                <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
                  <div style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--sage)', marginBottom: '10px' }}>
                    What Worked
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    {reflection.what_worked.map((item, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--sage)', fontSize: '11px', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>✓</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-1)', lineHeight: 1.45 }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {reflection.what_to_adjust?.length > 0 && (
                <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
                  <div style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '10px' }}>
                    What to Adjust
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    {reflection.what_to_adjust.map((item, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--gold)', fontSize: '11px', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>→</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-1)', lineHeight: 1.45 }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Grade picker */}
          <GradePicker
            weekNumber={week_number}
            year={year}
            initial={grade ?? undefined}
            onSaved={setGrade}
          />
        </div>
      )}
    </div>
  )
}

/* ── Grade summary bar ── */
function GradeSummary({ rows }: { rows: StoredWeeklyReflection[] }) {
  const graded = rows.filter(r => r.reflection.grade)
  if (graded.length < 2) return null

  const counts = GRADES.reduce((acc, g) => {
    acc[g] = graded.filter(r => r.reflection.grade?.letter === g).length
    return acc
  }, {} as Record<WeeklyGrade['letter'], number>)

  const mostCommon = GRADES.reduce((best, g) => counts[g] > counts[best] ? g : best, 'B' as WeeklyGrade['letter'])

  return (
    <div style={{
      background: 'var(--bg-1)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)', padding: '14px 18px', marginBottom: '12px',
      display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
    }}>
      <div>
        <div style={{ fontSize: '9.5px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '2px' }}>Most common grade</div>
        <GradeBadge letter={mostCommon} size="lg" />
      </div>
      <div style={{ flex: 1, display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        {GRADES.filter(g => counts[g] > 0).map(g => (
          <div key={g} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <GradeBadge letter={g} size="sm" />
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>×{counts[g]}</span>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '9.5px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '2px' }}>Graded</div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', color: 'var(--text-1)', fontWeight: 300 }}>{graded.length}<span style={{ fontSize: '12px', color: 'var(--text-3)', marginLeft: '3px' }}>wks</span></div>
      </div>
    </div>
  )
}

/* ── Main export ── */
export default function WeeklyHistory({ rows }: { rows: StoredWeeklyReflection[] }) {
  const [visible, setVisible] = useState(false)

  if (rows.length === 0) return null

  return (
    <div style={{ marginTop: '28px' }}>
      <button
        onClick={() => setVisible(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '0 0 12px', width: '100%', textAlign: 'left',
        }}
      >
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        <span style={{
          fontSize: '11px', fontWeight: 600, color: 'var(--text-3)',
          textTransform: 'uppercase', letterSpacing: '0.1em',
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {visible ? '↑ Hide history' : `↓ Past weeks · ${rows.length}`}
        </span>
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
      </button>

      {visible && (
        <div style={{ animation: 'fadeUp 0.22s var(--ease) both' }}>
          <GradeSummary rows={rows} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {rows.map(row => (
              <HistoryCard key={`${row.year}-${row.week_number}`} row={row} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export { GradePicker, GradeBadge }
