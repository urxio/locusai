'use client'

import type { CheckIn, HabitWithLogs } from '@/lib/types'

export default function WeeklyReview({ checkins, habits }: { checkins: CheckIn[]; habits: HabitWithLogs[] }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const today = new Date()
  const weekData = days.map((label, i) => {
    const d = new Date(today)
    const dayOfWeek = today.getDay() || 7
    d.setDate(today.getDate() - (dayOfWeek - 1) + i)
    const dateStr = d.toISOString().split('T')[0]
    const checkin = checkins.find(c => c.date === dateStr)
    const isToday = dateStr === today.toISOString().split('T')[0]
    return { label, dateStr, energy: checkin?.energy_level ?? null, isToday }
  })

  const maxEnergy = 10
  const avgEnergy = checkins.length ? (checkins.reduce((s, c) => s + c.energy_level, 0) / checkins.length).toFixed(1) : null

  return (
    <div style={{ padding: '36px 40px 60px', maxWidth: '860px', animation: 'fadeUp 0.3s var(--ease) both' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 600, marginBottom: '6px', opacity: 0.85 }}>
          Week {getWeekNumber(today)} · {formatWeekRange(today)}
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '34px', fontWeight: 400, color: 'var(--text-0)', lineHeight: 1.15 }}>
          Your week, <em style={{ fontStyle: 'italic', color: 'var(--text-1)' }}>reflected.</em>
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-2)', marginTop: '6px' }}>Based on your check-ins and habit data this week.</div>
      </div>

      {/* Energy chart */}
      <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: '20px' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 600, marginBottom: '16px' }}>
          Energy this week {avgEnergy ? `· avg ${avgEnergy}/10` : ''}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
          {weekData.map(day => {
            const pct = day.energy ? (day.energy / maxEnergy) * 100 : 0
            const color = day.energy ? (day.energy >= 7 ? 'linear-gradient(0deg, #4a7a60, #8ab89a)' : day.energy >= 5 ? 'linear-gradient(0deg, #8a6230, #c8a058)' : 'linear-gradient(0deg, #6a3828, #a06848)') : 'none'
            return (
              <div key={day.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: day.isToday ? 'var(--gold)' : 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', fontWeight: 600 }}>{day.label}</div>
                <div style={{ height: '52px', borderRadius: '6px', background: 'var(--bg-3)', position: 'relative', overflow: 'hidden' }}>
                  {day.energy && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, borderRadius: '6px', background: color, height: `${pct}%`, transition: 'height 1s cubic-bezier(0.22, 1, 0.36, 1)' }} />}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '5px' }}>{day.energy ?? '—'}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* No data state */}
      {checkins.length === 0 && (
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-lg)', padding: '28px 24px', textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 300, color: 'var(--text-2)' }}>No check-ins this week yet.</div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '6px' }}>Complete daily check-ins to see your weekly reflection.</div>
        </div>
      )}

      {/* Habits */}
      {habits.length > 0 && (
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 600, marginBottom: '16px' }}>Habit streaks this week</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
            {habits.map(habit => {
              const weekDates = weekData.map(d => d.dateStr)
              const doneDates = habit.logs.map(l => l.logged_date)
              return (
                <div key={habit.id} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', marginBottom: '6px' }}>{habit.emoji}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: '8px' }}>{habit.name}</div>
                  <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', marginBottom: '6px' }}>
                    {weekDates.map(date => (
                      <div key={date} style={{ width: '8px', height: '8px', borderRadius: '50%', background: doneDates.includes(date) ? 'var(--sage)' : 'var(--bg-4)' }} />
                    ))}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-1)' }}>
                    <span style={{ color: 'var(--sage)' }}>{habit.weekCompletions}/{habit.target_count}</span> this week
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

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function formatWeekRange(today: Date): string {
  const dayOfWeek = today.getDay() || 7
  const monday = new Date(today); monday.setDate(today.getDate() - dayOfWeek + 1)
  const sunday = new Date(today); sunday.setDate(today.getDate() - dayOfWeek + 7)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${monday.toLocaleDateString('en-US', opts)} – ${sunday.toLocaleDateString('en-US', opts)}, ${today.getFullYear()}`
}
