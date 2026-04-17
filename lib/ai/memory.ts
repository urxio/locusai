import { createClient } from '@/lib/supabase/server'

/* ── TYPES ───────────────────────────────────────────── */

export type SelfProfile = {
  occupation: string
  relationship_status: 'single' | 'in_relationship' | 'married' | 'other' | 'prefer_not_to_say' | ''
  has_kids: boolean | null
  work_arrangement: 'remote' | 'office' | 'hybrid' | 'other' | ''
  personality: string[]   // e.g. ['Introvert', 'Morning person', 'Analytical']
  life_context: string    // 1-2 sentence free text written by user
  saved_at: string
}

export type ClarifyingAnswer = {
  question: string
  answer: string
  answered_at: string   // ISO timestamp
  brief_date: string    // YYYY-MM-DD
}

export type PersonMemory = {
  name: string              // "Sarah" | "mom" | "my boss"
  relationship: string      // "friend" | "family" | "partner" | "colleague" | "manager" | "other"
  mentions: number
  last_mentioned: string    // YYYY-MM-DD
  sentiment: 'positive' | 'negative' | 'mixed' | 'neutral'
  context: string           // 1 sentence — how they appear in the user's life
}

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
  // Patterns page cache
  pattern_narratives?: string[]
  pattern_generated_at?: string | null
  // People / relationship memory
  people_memory?: {
    people: PersonMemory[]
    last_updated: string
  }
  // Self-reported profile — set during onboarding, editable later
  self_profile?: SelfProfile
  // Clarifying Q&A — questions the AI asked, answers the user provided
  clarifying_qa?: ClarifyingAnswer[]
  // Pending questions to show after today's brief (cleared when answered/skipped)
  pending_clarifications?: {
    brief_date: string
    questions: string[]
  }
  // Habit audit dismissals — { 'YYYY-MM-DD': ['habitId', ...] } — cross-device sync
  audit_dismissals?: Record<string, string[]>
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

/* ── FORMAT SELF PROFILE FOR PROMPT ─────────────────── */

export function formatSelfProfileForPrompt(memory: UserMemory | null): string {
  const p = memory?.self_profile
  if (!p) return ''
  const tags = Array.isArray(p.personality) ? p.personality : []
  // Only include if at least one field is set
  if (!p.occupation && !p.relationship_status && tags.length === 0 && !p.life_context) return ''

  const lines: string[] = []
  lines.push('── ABOUT THIS PERSON ──')

  if (p.occupation) lines.push(`Occupation: ${p.occupation}`)

  const relLabel: Record<string, string> = {
    single: 'Single', in_relationship: 'In a relationship',
    married: 'Married', other: 'Other',
  }
  if (p.relationship_status && p.relationship_status !== 'prefer_not_to_say') {
    lines.push(`Relationship: ${relLabel[p.relationship_status] ?? p.relationship_status}`)
  }
  if (p.has_kids === true)  lines.push('Kids: Yes')
  if (p.has_kids === false) lines.push('Kids: No')

  if (p.work_arrangement && p.work_arrangement !== 'other') {
    const wLabel: Record<string, string> = { remote: 'Remote', office: 'Office', hybrid: 'Hybrid' }
    lines.push(`Work setup: ${wLabel[p.work_arrangement] ?? p.work_arrangement}`)
  }
  if (tags.length > 0) {
    lines.push(`Personality: ${tags.join(' · ')}`)
  }
  if (p.life_context?.trim()) {
    lines.push(`Context: "${p.life_context.trim()}"`)
  }

  lines.push('── END ABOUT THIS PERSON ──')
  return lines.join('\n')
}

/* ── FORMAT FOR PROMPT ───────────────────────────────── */

export function formatMemoryForPrompt(memory: UserMemory | null): string {
  if (!memory || !memory.checkin_count || memory.checkin_count < 5 || !memory.energy) return ''

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

/* ── SAVE PENDING CLARIFICATIONS ────────────────────── */

export async function savePendingClarifications(
  userId: string,
  briefDate: string,
  questions: string[]
): Promise<void> {
  if (!questions.length) return
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('user_memory')
      .select('data')
      .eq('user_id', userId)
      .single()
    const current = (data?.data ?? {}) as UserMemory
    const updated: UserMemory = {
      ...current,
      pending_clarifications: { brief_date: briefDate, questions },
    }
    await supabase
      .from('user_memory')
      .upsert({ user_id: userId, data: updated }, { onConflict: 'user_id' })
  } catch (err) {
    console.error('savePendingClarifications:', err)
  }
}

/* ── FORMAT CLARIFYING Q&A FOR PROMPT ───────────────── */

export function formatClarifyingQAForPrompt(memory: UserMemory | null): string {
  const qa = memory?.clarifying_qa?.slice(-12)
  if (!qa?.length) return ''
  const lines: string[] = []
  lines.push('── CLARIFIED CONTEXT ──')
  lines.push('The user has directly answered these questions to help Locus understand them better:')
  lines.push('')
  qa.forEach(item => {
    lines.push(`Q: ${item.question}`)
    lines.push(`A: ${item.answer}`)
    lines.push('')
  })
  lines.push('── END CLARIFIED CONTEXT ──')
  return lines.join('\n')
}

/* ── FORMAT PEOPLE FOR PROMPT ────────────────────────── */

export function formatPeopleForPrompt(memory: UserMemory | null): string {
  const people = memory?.people_memory?.people
  if (!people || people.length === 0) return ''

  const lines: string[] = []
  lines.push('── RELATIONSHIPS ──')
  lines.push('People this user mentions often (learned from journals & mood notes):')

  people.slice(0, 6).forEach(p => {
    const now = Date.now()
    const lastMs = new Date(p.last_mentioned).getTime()
    const daysAgo = Math.floor((now - lastMs) / 86400000)
    const recency = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo}d ago`

    const sentimentIcon = p.sentiment === 'positive' ? '✦'
      : p.sentiment === 'negative' ? '↓'
      : p.sentiment === 'mixed' ? '~'
      : '·'

    lines.push(`• ${p.name} [${p.relationship}] — ${p.mentions}× mentions, last ${recency} — ${sentimentIcon} ${p.context}`)
  })

  lines.push('── END RELATIONSHIPS ──')
  return lines.join('\n')
}
