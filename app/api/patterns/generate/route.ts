import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildPatternsContext, formatPatternsForPrompt } from '@/lib/ai/patterns-context'
import { readUserMemory, patchUserMemory } from '@/lib/ai/memory'
import { getAnthropicClient } from '@/lib/ai/client'

export const runtime    = 'nodejs'
export const maxDuration = 60

const THROTTLE_DAYS = 6  // max once per 6 days

const SYSTEM_PROMPT = `You are Locus — an AI life companion analyzing behavioral patterns. Your job is to surface patterns the user genuinely would not notice themselves day-to-day. You have access to computed statistics from their real data.

Rules:
- Write exactly 3–4 observations. No more.
- Each observation must cite a specific number, habit name, or day from the data.
- No generic productivity advice. No "try to sleep more" or "set goals". Only pattern descriptions.
- Write as if you've been watching them for months — because you have.
- Vary the angle: energy, time/day rhythms, behavior combinations, emotional drift.
- Tone: calm, precise, genuinely curious. Like a good doctor reading test results.
- Start each with "You" or "When you" or "On" or "Your".
- Each is 1–2 sentences maximum.

Return ONLY a valid JSON array of strings. No markdown, no explanation.
["Observation one.", "Observation two.", "Observation three."]`

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { force } = await req.json().catch(() => ({ force: false }))

  // Check throttle unless forced
  if (!force) {
    const memory = await readUserMemory(user.id)
    if (memory?.pattern_generated_at) {
      const daysSince = (Date.now() - new Date(memory.pattern_generated_at).getTime()) / 86400000
      if (daysSince < THROTTLE_DAYS) {
        return NextResponse.json({
          narratives: memory.pattern_narratives ?? [],
          cached: true,
          nextAllowedIn: Math.ceil(THROTTLE_DAYS - daysSince),
        })
      }
    }
  }

  // Build raw statistical context
  const ctx = await buildPatternsContext(user.id)

  if (ctx.checkinCount < 10) {
    return NextResponse.json({
      error: 'insufficient_data',
      message: `Need at least 10 check-ins to find patterns — you have ${ctx.checkinCount} so far.`,
    }, { status: 422 })
  }

  const dataBlock = formatPatternsForPrompt(ctx)

  const userMessage = `Here is the computed behavioral data for this user:\n\n${dataBlock}\n\nWrite 3–4 pattern observations based strictly on this data. Be specific, be surprising, be concise.`

  const client = getAnthropicClient()

  let rawText = ''
  try {
    const response = await client.messages.create({
      model:      'claude-haiku-4-5',
      max_tokens: 800,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: userMessage }],
    })
    rawText = response.content.find(b => b.type === 'text')?.text ?? ''
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'AI call failed', detail: msg }, { status: 502 })
  }

  // Parse JSON array
  let narratives: string[] = []
  try {
    const match = rawText.match(/\[[\s\S]*?\]/)
    if (match) {
      const parsed = JSON.parse(match[0])
      if (Array.isArray(parsed)) {
        narratives = parsed.filter((s): s is string => typeof s === 'string' && s.trim().length > 10)
      }
    }
  } catch {
    return NextResponse.json({ error: 'Parse failed', raw: rawText }, { status: 500 })
  }

  if (!narratives.length) {
    return NextResponse.json({ error: 'No narratives generated', raw: rawText }, { status: 500 })
  }

  // Cache in user_memory
  await patchUserMemory(user.id, {
    pattern_narratives:   narratives,
    pattern_generated_at: new Date().toISOString(),
  })

  return NextResponse.json({ narratives, cached: false, context: ctx })
}
