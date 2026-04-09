import type { CheckIn, HabitWithLogs, Goal } from '@/lib/types'

export type WeeklyContext = {
  weekNumber: number
  year: number
  weekRange: string
  checkins: CheckIn[]
  habits: HabitWithLogs[]
  goals: Goal[]
  avgEnergy: number | null
  energyTrend: 'rising' | 'declining' | 'stable' | 'mixed'
  totalHabitCompletions: number
  totalHabitTarget: number
  habitRate: number
}

export const WEEKLY_SYSTEM_PROMPT = `You are Locus — a perceptive AI life OS generating a user's weekly reflection. This should read like a thoughtful advisor who studied the user's entire week: their energy patterns, what they shipped, where they fell short, and what it means going into next week.

TONE
- Substantive and specific. Reference actual numbers, habits, and goals by name.
- Warm but honest. Don't sugarcoat a bad week, but always end with forward momentum.
- Like a good coach: name patterns, not just events.

HIGHLIGHT MARKERS
Wrap 2-5 key phrases per paragraph in <<double angle brackets>>. These will be rendered as highlighted text. Use highlights for: week labels, specific stats, important patterns, actionable insights.

OUTPUT — respond with a single valid JSON object only. No markdown, no preamble.

{
  "paragraphs": [
    "<paragraph 1 — overall week summary with <<highlights>>. 2-4 sentences.>",
    "<paragraph 2 — energy or focus pattern with <<highlights>>. 2-3 sentences.>",
    "<paragraph 3 — habit/goal completion summary with <<highlights>>. 2-3 sentences.>"
  ],
  "what_worked": [
    "<specific win from this week — max 12 words>",
    "<specific win>",
    "<specific win>",
    "<specific win>"
  ],
  "what_to_adjust": [
    "<specific thing to improve next week — max 12 words>",
    "<specific thing>",
    "<specific thing>",
    "<specific thing>"
  ]
}

Rules:
- "what_worked" must have 3-5 items. Reference specific habits, goals, or behaviors by name.
- "what_to_adjust" must have 3-5 items. Be concrete — not "be more productive" but "protect morning hours for deep work".
- paragraphs must total 3 exactly.
- Each paragraph must stand alone and add something new.`

export function buildWeeklyUserMessage(ctx: WeeklyContext): string {
  const lines: string[] = []

  lines.push(`WEEK ${ctx.weekNumber} · ${ctx.weekRange} · ${ctx.year}`)
  lines.push('─'.repeat(50))

  // Energy breakdown
  lines.push(`ENERGY THIS WEEK`)
  if (ctx.checkins.length > 0) {
    lines.push(`Average: ${ctx.avgEnergy?.toFixed(1)}/10 · Trend: ${ctx.energyTrend}`)
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    ctx.checkins.forEach(c => {
      const d = new Date(c.date + 'T12:00:00')
      const label = dayNames[d.getDay()]
      const bar = '█'.repeat(Math.round(c.energy_level)) + '░'.repeat(10 - Math.round(c.energy_level))
      lines.push(`  ${label}: ${c.energy_level}/10 [${bar}]${c.mood_note ? ` — "${c.mood_note}"` : ''}`)
    })
    const highDay = ctx.checkins.reduce((a, b) => a.energy_level > b.energy_level ? a : b)
    const lowDay  = ctx.checkins.reduce((a, b) => a.energy_level < b.energy_level ? a : b)
    lines.push(`Peak: ${highDay.date} (${highDay.energy_level}) · Lowest: ${lowDay.date} (${lowDay.energy_level})`)
  } else {
    lines.push(`No check-ins recorded this week.`)
  }
  lines.push('')

  // Blockers from the week
  const allBlockers = ctx.checkins.flatMap(c => c.blockers.filter(b => b !== 'No blockers today'))
  if (allBlockers.length > 0) {
    const freq: Record<string, number> = {}
    allBlockers.forEach(b => { freq[b] = (freq[b] || 0) + 1 })
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1])
    lines.push(`BLOCKERS THIS WEEK: ${sorted.map(([b, n]) => `${b}${n > 1 ? ` (×${n})` : ''}`).join(', ')}`)
    lines.push('')
  }

  // Goals
  if (ctx.goals.length > 0) {
    lines.push(`ACTIVE GOALS (${ctx.goals.length})`)
    ctx.goals.forEach(g => {
      const daysLeft = g.target_date
        ? Math.ceil((new Date(g.target_date).getTime() - Date.now()) / 86400000)
        : null
      const deadline = daysLeft !== null
        ? (daysLeft <= 0 ? ' ⚠️ OVERDUE' : daysLeft <= 7 ? ` 🔴 ${daysLeft}d left` : ` · ${daysLeft}d left`)
        : ''
      lines.push(`  • [${g.category}] "${g.title}" — ${g.progress_pct}%${deadline}`)
      if (g.next_action) lines.push(`    Next: ${g.next_action}`)
    })
    lines.push('')
  }

  // Habits
  if (ctx.habits.length > 0) {
    lines.push(`HABITS — ${ctx.totalHabitCompletions}/${ctx.totalHabitTarget} completions this week (${ctx.habitRate}%)`)
    ctx.habits.forEach(h => {
      const rate = h.target_count > 0
        ? Math.round((h.weekCompletions / h.target_count) * 100)
        : 0
      const streakTag = h.streak >= 14 ? '🔥 strong momentum' : h.streak >= 7 ? '⚡ building' : h.streak > 0 ? `${h.streak}d streak` : 'streak broken'
      lines.push(`  ${h.emoji} ${h.name}: ${h.weekCompletions}/${h.target_count} (${rate}%) · ${streakTag}`)
    })
    lines.push('')
  }

  // Days checked in
  lines.push(`CHECK-IN DAYS: ${ctx.checkins.length}/7`)

  return lines.join('\n')
}

export type WeeklyReflection = {
  paragraphs: string[]
  what_worked: string[]
  what_to_adjust: string[]
}

const FALLBACK_REFLECTION: WeeklyReflection = {
  paragraphs: [
    'This week gave you data to work with. Your patterns are becoming clearer.',
    'Energy fluctuations are normal — the key is noticing what drives the peaks.',
    'Keep building the habits that move you forward. Consistency compounds.',
  ],
  what_worked: ['Showing up and tracking your week'],
  what_to_adjust: ['Add more check-ins to get richer weekly insights'],
}

export function parseWeeklyResponse(raw: string): WeeklyReflection {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  try {
    const obj = JSON.parse(cleaned)
    return {
      paragraphs: Array.isArray(obj.paragraphs) && obj.paragraphs.length > 0 ? obj.paragraphs : FALLBACK_REFLECTION.paragraphs,
      what_worked: Array.isArray(obj.what_worked) && obj.what_worked.length > 0 ? obj.what_worked : FALLBACK_REFLECTION.what_worked,
      what_to_adjust: Array.isArray(obj.what_to_adjust) && obj.what_to_adjust.length > 0 ? obj.what_to_adjust : FALLBACK_REFLECTION.what_to_adjust,
    }
  } catch {
    return FALLBACK_REFLECTION
  }
}
