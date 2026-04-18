import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserHabitsWithLogs } from '@/lib/db/habits'
import { getActiveGoalsWithSteps } from '@/lib/db/goals'
import { readUserMemory } from '@/lib/ai/memory'
import { getAnthropicClient } from '@/lib/ai/client'

export const runtime = 'nodejs'
export const maxDuration = 30

type SuggestedBlock = {
  day_of_week: number
  time_slot: 'morning' | 'afternoon' | 'evening'
  title: string
  type: 'goal' | 'custom'
  reference_id: string | null
  reason: string
}

type SuggestResponse = {
  blocks: SuggestedBlock[]
  summary: string
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let weekStart: string
  try {
    const body = await request.json()
    weekStart = body.weekStart
    if (!weekStart) throw new Error('missing weekStart')
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const [habits, goals, memory] = await Promise.all([
    getUserHabitsWithLogs(user.id),
    getActiveGoalsWithSteps(user.id),
    readUserMemory(user.id),
  ])

  const habitSummary = habits.map(h => {
    const days = h.days_of_week && h.days_of_week.length > 0
      ? `days: [${h.days_of_week.join(',')}]`
      : 'every day'
    const slot = h.time_of_day ? `, time_of_day: ${h.time_of_day}` : ', time_of_day: unset'
    return `- ${h.emoji} "${h.name}" [${days}${slot}]`
  }).join('\n')

  const goalSummary = goals.map(g => {
    const deadline = g.target_date ? `, due: ${g.target_date}` : ''
    return `- id:${g.id} "${g.title}" [${g.category}${deadline}]`
  }).join('\n')

  const energyContext = memory?.energy?.best_day
    ? `Best energy day: ${memory.energy.best_day}, recent avg: ${memory.energy.recent_avg}/10`
    : 'Energy patterns: unknown'

  const prompt = `You are Locus. Suggest a smart weekly plan for the week of ${weekStart}.

Given:
HABITS:
${habitSummary || '(none)'}

GOALS:
${goalSummary || '(none)'}

ENERGY PATTERNS:
${energyContext}

Rules:
1. For habits with no time_of_day, suggest best slot based on type (morning = exercise/meditation, evening = reading/journaling, flexible/nutrition = morning or flexible)
2. Suggest 2-4 focused goal work blocks spread across the week (not all on same day)
3. Prefer morning/afternoon for deep work goals
4. Don't double-book a slot if a habit already fills it (only flag if habit has time_of_day set)
5. Keep weekends (day_of_week 0=Sun, 6=Sat) lighter — 1-2 blocks max
6. day_of_week: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

Return ONLY valid JSON with no markdown fences:
{"blocks":[{"day_of_week":N,"time_slot":"morning|afternoon|evening","title":"...","type":"goal|custom","reference_id":"uuid or null","reason":"one sentence"}],"summary":"2-3 sentence overview of the suggested week"}`

  const client = getAnthropicClient()

  let rawText = ''
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1200,
      system: 'You are a JSON API. Respond with a single valid JSON object only. No markdown, no prose, no code fences. Just the raw JSON.',
      messages: [{ role: 'user', content: prompt }],
    })

    for (const block of response.content) {
      if (block.type === 'text') {
        rawText = block.text
        break
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Claude API call failed (planner suggest):', message)
    return NextResponse.json({ error: 'AI generation failed', detail: message }, { status: 502 })
  }

  let parsed: SuggestResponse
  try {
    // Extract the first {...} block — handles prose wrappers and markdown fences
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON object found in response')
    parsed = JSON.parse(jsonMatch[0]) as SuggestResponse
    if (!Array.isArray(parsed.blocks)) throw new Error('No blocks array in response')
    // Ensure summary exists
    if (typeof parsed.summary !== 'string') parsed.summary = ''
  } catch (err) {
    console.error('Failed to parse planner suggestion:', err)
    console.error('Raw AI response:', rawText)
    return NextResponse.json({ error: 'Failed to parse AI response', detail: rawText.slice(0, 300) }, { status: 500 })
  }

  return NextResponse.json(parsed)
}
