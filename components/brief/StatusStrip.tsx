'use client'

import type { Goal, CheckIn, HabitWithLogs } from '@/lib/types'

type Props = {
  goals:      Goal[]
  checkin:    CheckIn | null
  avgEnergy:  number | null
  habits:     HabitWithLogs[]
}

/* ── helpers ─────────────────────────────────────────── */

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function moodWord(note: string | null): string {
  if (!note) return '—'
  const cleaned = note.replace(/^(feeling|i('m| am|feel)\s+)/i, '').trim()
  const words   = cleaned.split(/[\s,;.]+/).filter(Boolean)
  return words.slice(0, 2).join(' ') || '—'
}

/* ── segment bar (the glowing bars from the image) ───── */

function SegmentBar({
  total,
  filled,
  color    = '#4ade80',
  maxBars  = 12,
}: {
  total:    number
  filled:   number
  color?:   string
  maxBars?: number
}) {
  const bars     = Math.min(Math.max(total, 1), maxBars)
  const litCount = Math.min(Math.round((filled / Math.max(total, 1)) * bars), bars)

  return (
    <div style={{ display: 'flex', gap: '3px', alignItems: 'stretch', width: '100%', marginTop: '12px' }}>
      {Array.from({ length: bars }).map((_, i) => {
        const isLit     = i < litCount
        const isCurrent = i === litCount && litCount < bars
        return (
          <div
            key={i}
            style={{
              flex:        1,
              height:      '13px',
              borderRadius: '3px',
              background:  isLit ? color : 'rgba(255,255,255,0.07)',
              boxShadow:   isLit ? `0 0 7px ${color}bb, 0 0 2px ${color}` : 'none',
              outline:     isCurrent ? '1.5px solid rgba(255,255,255,0.22)' : 'none',
              outlineOffset: '1px',
              transition:  'background 0.25s',
            }}
          />
        )
      })}
    </div>
  )
}

/* ── single pill card ────────────────────────────────── */

type PillConfig = {
  href:      string
  icon:      React.ReactNode
  iconBg:    string
  label:     string
  value:     string
  sub:       string
  barTotal?: number
  barFilled?: number
  barColor?: string
}

function Pill({ href, icon, iconBg, label, value, sub, barTotal, barFilled, barColor }: PillConfig) {
  const hasBars = barTotal != null && barFilled != null && barColor != null

  return (
    <a
      href={href}
      style={{
        display:         'flex',
        flexDirection:   'column',
        flex:            '0 0 auto',
        minWidth:        '148px',
        background:      'var(--bg-1)',
        border:          '1px solid var(--border)',
        borderRadius:    '18px',
        padding:         '14px 14px 13px',
        textDecoration:  'none',
        cursor:          'pointer',
        transition:      'border-color 0.18s, transform 0.18s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-md)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      {/* Top row — icon + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '9px' }}>
        <div style={{
          width:           '28px',
          height:          '28px',
          borderRadius:    '8px',
          background:      iconBg,
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          flexShrink:      0,
        }}>
          {icon}
        </div>
        <span style={{
          fontSize:       '10px',
          fontWeight:     700,
          color:          'var(--text-3)',
          letterSpacing:  '0.08em',
          textTransform:  'uppercase',
        }}>
          {label}
        </span>
      </div>

      {/* Value */}
      <div style={{
        fontSize:       '21px',
        fontWeight:     700,
        color:          'var(--text-0)',
        lineHeight:     1,
        letterSpacing:  '-0.02em',
      }}>
        {value}
      </div>

      {/* Sub-label */}
      <div style={{
        fontSize:   '11px',
        color:      'var(--text-3)',
        marginTop:  '3px',
        lineHeight: 1.3,
        flex:       1,
      }}>
        {sub}
      </div>

      {/* Glowing bars */}
      {hasBars && (
        <SegmentBar total={barTotal!} filled={barFilled!} color={barColor!} />
      )}
    </a>
  )
}

/* ── icon svgs ───────────────────────────────────────── */

function EnergyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2L4 9h5l-2 5 7-8H9l2-4z" fill="#4ade8033" stroke="#4ade80" />
    </svg>
  )
}

function HabitsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="8" cy="8" r="5.5" />
      <path d="M5.5 8.2l2 1.8 3-3.5" />
    </svg>
  )
}

function GoalsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#d4a853" strokeWidth="1.7" strokeLinecap="round">
      <circle cx="8" cy="8" r="6" />
      <circle cx="8" cy="8" r="3" />
      <circle cx="8" cy="8" r="0.8" fill="#d4a853" />
    </svg>
  )
}

function MoodIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#9080c8" strokeWidth="1.7" strokeLinecap="round">
      <path d="M2 2.5h8l3 2.5-3 2.5H2z" />
      <path d="M5 10.5h6l3 2-3 2H5z" opacity="0.55" />
    </svg>
  )
}

/* ── main strip ──────────────────────────────────────── */

export default function StatusStrip({ goals, checkin, avgEnergy, habits }: Props) {
  const today = todayStr()

  /* Energy */
  const energy    = checkin?.energy_level ?? null
  const energyVal = energy ?? avgEnergy
  const energyDisplay = energyVal != null ? `${energyVal} / 10` : '—'
  const energySub     = energy     ? 'Today'        : avgEnergy ? '7-day avg' : 'No check-in'

  /* Habits */
  const scheduledToday = habits.filter(h => h.isScheduledToday)
  const doneToday      = scheduledToday.filter(h =>
    h.logs.some(l => l.logged_date === today)
  )
  const habitsDisplay = scheduledToday.length > 0
    ? `${doneToday.length} / ${scheduledToday.length}`
    : habits.length > 0 ? `${habits.length} total` : '—'
  const habitsSub = scheduledToday.length > 0 ? 'done today' : 'habits'

  /* Goals */
  const active     = goals.filter(g => g.status === 'active')
  const avgPct     = active.length
    ? Math.round(active.reduce((s, g) => s + g.progress_pct, 0) / active.length)
    : null
  const goalsDisplay = active.length > 0 ? `${active.length}` : '—'
  const goalsSub     = avgPct != null
    ? `active · ${avgPct}% avg`
    : active.length === 1 ? 'active goal' : 'active goals'

  /* Mood */
  const mood    = moodWord(checkin?.mood_note ?? null)
  const moodSub = checkin ? 'last check-in' : 'no check-in yet'

  const pills: PillConfig[] = [
    {
      href:      '/checkin',
      icon:      <EnergyIcon />,
      iconBg:    'rgba(74,222,128,0.12)',
      label:     'Energy',
      value:     energyDisplay,
      sub:       energySub,
      barTotal:  10,
      barFilled: Math.round(energyVal ?? 0),
      barColor:  '#4ade80',
    },
    {
      href:      '/habits',
      icon:      <HabitsIcon />,
      iconBg:    'rgba(74,222,128,0.10)',
      label:     'Habits',
      value:     habitsDisplay,
      sub:       habitsSub,
      barTotal:  Math.max(scheduledToday.length, 1),
      barFilled: doneToday.length,
      barColor:  '#4ade80',
    },
    {
      href:      '/goals',
      icon:      <GoalsIcon />,
      iconBg:    'rgba(212,168,83,0.12)',
      label:     'Goals',
      value:     goalsDisplay,
      sub:       goalsSub,
      barTotal:  100,
      barFilled: avgPct ?? 0,
      barColor:  '#d4a853',
    },
    {
      href:  '/checkin',
      icon:  <MoodIcon />,
      iconBg: 'rgba(144,128,200,0.12)',
      label: 'Mood',
      value: mood,
      sub:   moodSub,
    },
  ]

  return (
    <div style={{ marginTop: '20px' }}>
      {/* Section label */}
      <div style={{
        fontSize:      '10px',
        fontWeight:    700,
        color:         'var(--text-3)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        marginBottom:  '10px',
      }}>
        Today&apos;s Status
      </div>

      {/* Horizontal scroll row */}
      <div style={{
        display:                  'flex',
        gap:                      '10px',
        overflowX:                'auto',
        paddingBottom:            '4px',
        scrollbarWidth:           'none',
        WebkitOverflowScrolling:  'touch',
        marginLeft:               '-2px',
        paddingLeft:              '2px',
      } as React.CSSProperties}>
        {pills.map(p => <Pill key={p.label} {...p} />)}
      </div>

      {/* Hide scrollbar in webkit */}
      <style>{`
        .status-strip-row::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
