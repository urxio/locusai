import { createClient } from '@/lib/supabase/server'

/* ── TYPES ───────────────────────────────────────────── */

export type UserMemory = {
  energy: {
    overall_avg: number          // all-time average
    recent_avg: number           // last 14 days
    trend: 'improving' | 'declining' | 'stable'
    by_day: Record<string, number>  // e.g. { Mon: 7.2, Tue: 6.1 }
    best_day: string | null
    worst_day: string | null
  }
  habits: {
    strongest: Array<{ name: string; emoji: string; rate_pct: number }>
    needs_work: Array<{ name: string; emoji: string; rate_pct: number }>
  }
  blockers: {
    frequent: string[]                     // top blockers by frequency
    frequencies: Record<string, number>    // blocker → count
  }
  mood_themes: string[]    // recurring words from mood notes
  insights: string[]       // AI-generated observations, max 8
  checkin_count: number
  last_stats_update: string
  last_insights_update: string | null
}

/* ── READ ────────────────────────────────────────────── */

export async function readUserMemory(userId: string): Promise<UserMemory | null> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('user_memory')
      .select('data')
      .eq('user_id', userId)
      .single()
    return (data?.data as UserMemory) ?? null
  } catch {
    return null // table may not exist yet — always non-fatal
  }
}

/* ── FORMAT FOR PROMPT ───────────────────────────────── */

export function formatMemoryForPrompt(memory: UserMemory | null): string {
  if (!memory || memory.checkin_count < 5) return ''

  const lines: string[] = []
  lines.push('── LONG-TERM MEMORY ──')
  lines.push(`Locus has learned the following from ${memory.checkin_count} check-ins with this user:`)
  lines.push('')

  // Energy patterns
  const arrow = memory.energy.trend === 'improving' ? '↑' : memory.energy.trend === 'declining' ? '↓' : '→'
  const energyParts: string[] = [`overall avg ${memory.energy.overall_avg}/10`]
  if (Math.abs(memory.energy.recent_avg - memory.energy.overall_avg) >= 0.3) {
    energyParts.push(`recent 14d avg ${memory.energy.recent_avg}/10 ${arrow} ${memory.energy.trend}`)
  } else {
    energyParts.push(`trend: ${arrow} ${memory.energy.trend}`)
  }
  if (memory.energy.best_day) energyParts.push(`peaks on ${memory.energy.best_day}s`)
  if (memory.energy.worst_day && memory.energy.worst_day !== memory.energy.best_day) {
    energyParts.push(`dips on ${memory.energy.worst_day}s`)
  }
  lines.push(`Energy: ${energyParts.join(' · ')}`)

  // Habit consistency
  const habitParts: string[] = []
  if (memory.habits.strongest.length > 0) {
    const h = memory.habits.strongest[0]
    habitParts.push(`${h.emoji} ${h.name} is rock-solid (${h.rate_pct}% last 30d)`)
  }
  if (memory.habits.needs_work.length > 0) {
    const h = memory.habits.needs_work[0]
    habitParts.push(`${h.emoji} ${h.name} needs attention (${h.rate_pct}% last 30d)`)
  }
  if (habitParts.length > 0) lines.push(`Habits: ${habitParts.join(' · ')}`)

  // Recurring blockers
  if (memory.blockers.frequent.length > 0) {
    const details = memory.blockers.frequent.slice(0, 4).map(b => {
      const n = memory.blockers.frequencies[b] ?? 0
      return n >= 3 ? `"${b}" (${n}×)` : `"${b}"`
    })
    lines.push(`Recurring blockers: ${details.join(' · ')}`)
  }

  // Mood themes
  if (memory.mood_themes.length > 0) {
    lines.push(`Mood themes: ${memory.mood_themes.slice(0, 6).join(', ')}`)
  }

  // AI-generated insights
  if (memory.insights.length > 0) {
    lines.push('')
    lines.push('Patterns learned over time:')
    memory.insights.forEach(insight => lines.push(`• ${insight}`))
  }

  lines.push('── END MEMORY ──')
  return lines.join('\n')
}
