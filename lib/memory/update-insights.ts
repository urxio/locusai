/**
 * updateMemoryInsights — runs after weekly review generation.
 * Calls Claude to synthesize new behavioral patterns/insights
 * from the user's accumulated data. Throttled to once per 6 days.
 * Non-fatal: never throws, never blocks the weekly flow.
 */

import { createClient } from '@/lib/supabase/server'
import { readUserMemory, patchUserMemory } from '@/lib/ai/memory'
import { getAnthropicClient } from '@/lib/ai/client'

export async function updateMemoryInsights(userId: string): Promise<void> {
  try {
    const memory = await readUserMemory(userId)

    // Need at least 7 check-ins for meaningful patterns
    if (!memory || memory.checkin_count < 7) return

    // Throttle: don't regenerate if updated within the last 6 days
    if (memory.last_insights_update) {
      const daysSince =
        (Date.now() - new Date(memory.last_insights_update).getTime()) /
        (1000 * 60 * 60 * 24)
      if (daysSince < 6) return
    }

    const supabase = await createClient()

    // Goals for extra context
    const { data: goals } = await supabase
      .from('goals')
      .select('title, category, progress_pct, status')
      .eq('user_id', userId)
      .in('status', ['active', 'completed'])
      .limit(6)

    const goalsSummary =
      goals?.map(g => `"${g.title}" (${g.progress_pct}%, ${g.status})`).join('; ') ??
      'no goals'

    // Day-by-day energy for richer analysis
    const energyByDay = Object.entries(memory.energy.by_day)
      .map(([d, v]) => `${d}=${v}`)
      .join(', ')

    const existing = memory.insights.length > 0
      ? memory.insights.map(i => `- ${i}`).join('\n')
      : 'none yet — this is the first insights generation'

    const prompt = `You are analyzing behavioral patterns for a personal productivity app user. Generate 4-6 short, specific insights based on their real data. Each insight must be a single concrete sentence that reveals something meaningful about their patterns. Reference actual numbers, days, or habit names. Avoid generic productivity advice.

User data (${memory.checkin_count} check-ins across ~${Math.round(memory.checkin_count * 1.3)} days):
Energy: overall avg ${memory.energy.overall_avg}/10 · recent 14d avg ${memory.energy.recent_avg}/10 · long-term trend: ${memory.energy.trend}
Energy by day of week: ${energyByDay || 'insufficient data'}
Best energy day: ${memory.energy.best_day ?? 'unclear'} · Lowest energy day: ${memory.energy.worst_day ?? 'unclear'}

Habit consistency (30-day rate):
  Strongest: ${memory.habits.strongest.map(h => `${h.emoji} ${h.name} ${h.rate_pct}%`).join(', ') || 'none tracked'}
  Needs work: ${memory.habits.needs_work.map(h => `${h.emoji} ${h.name} ${h.rate_pct}%`).join(', ') || 'none'}

Recurring blockers (times reported):
  ${memory.blockers.frequent.slice(0, 5).map(b => `"${b}" ×${memory.blockers.frequencies[b]}`).join(' · ') || 'none recurring'}

Mood themes (words appearing multiple times): ${memory.mood_themes.join(', ') || 'none'}

Active goals: ${goalsSummary}

Existing insights — DO NOT repeat or rephrase any of these:
${existing}

Return ONLY a JSON array of insight strings. No other text, no markdown.
Example format: ["Insight one about their specific pattern", "Insight two referencing actual data"]`

    const client = getAnthropicClient()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 700,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw =
      response.content[0]?.type === 'text' ? response.content[0].text : ''

    let newInsights: string[] = []
    try {
      const match = raw.match(/\[[\s\S]*?\]/)
      if (match) {
        const parsed = JSON.parse(match[0])
        if (Array.isArray(parsed)) {
          newInsights = parsed.filter(
            (s): s is string => typeof s === 'string' && s.trim().length > 10
          )
        }
      }
    } catch {
      return // parse failure — non-fatal
    }

    if (newInsights.length === 0) return

    // Merge: newest insights first, cap at 8 total
    const merged = [...newInsights, ...memory.insights].slice(0, 8)

    await patchUserMemory(userId, {
      insights: merged,
      last_insights_update: new Date().toISOString(),
    })

    console.log(`[memory:insights] updated ${merged.length} insights for user ${userId.slice(0, 8)}`)
  } catch (err) {
    // Non-fatal — never block the weekly flow
    console.error('[memory:update-insights]', err)
  }
}
