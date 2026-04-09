'use client'

import type { Goal } from '@/lib/types'

const PROGRESS_COLORS: Record<string, string> = {
  product:    'linear-gradient(90deg, #b8882a 0%, #e8c870 100%)',
  health:     'linear-gradient(90deg, #8a5a38 0%, #c89060 100%)',
  learning:   'linear-gradient(90deg, #385a8a 0%, #6090c8 100%)',
  financial:  'linear-gradient(90deg, #b8882a 0%, #e8c870 100%)',
  wellbeing:  'linear-gradient(90deg, #4a7a60 0%, #8ab89a 100%)',
  other:      'linear-gradient(90deg, #4a7a60 0%, #8ab89a 100%)',
}

export default function GoalsList({ goals }: { goals: Goal[] }) {
  const quarter = goals.filter(g => g.timeframe === 'quarter' && g.status === 'active')
  const yearly  = goals.filter(g => g.timeframe === 'year'    && g.status === 'active')
  const ongoing = goals.filter(g => g.timeframe === 'ongoing' && g.status === 'active')

  return (
    <div style={{ padding: '36px 40px 60px', maxWidth: '860px', animation: 'fadeUp 0.3s var(--ease) both' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 600, marginBottom: '6px', opacity: 0.85 }}>Your System</div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '34px', fontWeight: 400, color: 'var(--text-0)', lineHeight: 1.15 }}>
          Goals & <em style={{ fontStyle: 'italic', color: 'var(--text-1)' }}>Direction</em>
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-2)', marginTop: '6px' }}>What you&apos;re building toward — this quarter and beyond.</div>
      </div>

      {quarter.length > 0 && <GoalSection title={`This Quarter · Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`} goals={quarter} />}
      {yearly.length > 0  && <GoalSection title={`This Year · ${new Date().getFullYear()}`} goals={yearly} />}
      {ongoing.length > 0 && <GoalSection title="Ongoing" goals={ongoing} />}

      {goals.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: 300, color: 'var(--text-2)', marginBottom: '16px' }}>No goals yet.</div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>Goals will appear here once you add them during onboarding.</div>
        </div>
      )}
    </div>
  )
}

function GoalSection({ title, goals }: { title: string; goals: Goal[] }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', fontWeight: 400, color: 'var(--text-1)', marginBottom: '14px', letterSpacing: '0.01em', display: 'flex', alignItems: 'center', gap: '10px' }}>
        {title}
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
      </div>
      {goals.map(goal => <GoalCard key={goal.id} goal={goal} />)}
    </div>
  )
}

function GoalCard({ goal }: { goal: Goal }) {
  const gradient = PROGRESS_COLORS[goal.category] ?? PROGRESS_COLORS.other
  const daysLeft = goal.target_date
    ? Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / 86400000)
    : null

  return (
    <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 22px', marginBottom: '10px', transition: 'border-color 0.2s' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-md)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-0)', lineHeight: 1.3, marginBottom: '3px' }}>{goal.title}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>{goal.category}</div>
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 300, color: 'var(--text-0)', flexShrink: 0 }}>{goal.progress_pct}%</div>
      </div>

      <div style={{ height: '3px', background: 'var(--bg-4)', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
        <div style={{ height: '100%', borderRadius: '4px', background: gradient, width: `${goal.progress_pct}%`, transition: 'width 1.4s cubic-bezier(0.22, 1, 0.36, 1)' }} />
      </div>

      <div style={{ fontSize: '12.5px', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontWeight: 600, flexShrink: 0 }}>Next</span>
        <span style={{ flex: 1 }}>{goal.next_action || '—'}</span>
        {daysLeft !== null && (
          <span style={{ fontSize: '11px', color: daysLeft < 7 ? '#e07060' : 'var(--text-3)', flexShrink: 0 }}>
            {daysLeft > 0 ? `${daysLeft}d left` : 'Overdue'}
          </span>
        )}
      </div>
    </div>
  )
}
