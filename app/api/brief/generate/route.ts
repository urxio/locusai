import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTodayBrief, storeBrief } from '@/lib/db/briefs'
import { buildBriefContext } from '@/lib/ai/context'
import { SYSTEM_PROMPT, buildUserMessage } from '@/lib/ai/prompts'
import { parseBriefResponse } from '@/lib/ai/parse'
import { getAnthropicClient } from '@/lib/ai/client'
import { getUserLocalDate } from '@/lib/db/users'
import { savePendingClarifications } from '@/lib/ai/memory'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  // 1. Auth check
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = await getUserLocalDate(user.id)

  // 2. Check cache — return non-stale brief if exists
  const { force } = await request.json().catch(() => ({ force: false }))
  if (!force) {
    const cached = await getTodayBrief(user.id)
    if (cached) {
      return NextResponse.json({ brief: cached, cached: true })
    }
  }

  // 3. Build context from user's data
  let context
  try {
    context = await buildBriefContext(user.id, today)
  } catch (err) {
    console.error('buildBriefContext failed:', err)
    return NextResponse.json({ error: 'Failed to load user context' }, { status: 500 })
  }

  // 4. Call Claude
  const userMessage = buildUserMessage(context)
  const client = getAnthropicClient()

  let rawText = ''
  let tokensUsed = 0

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    tokensUsed = response.usage.input_tokens + response.usage.output_tokens

    // Extract text from response (may include thinking blocks)
    for (const block of response.content) {
      if (block.type === 'text') {
        rawText = block.text
        break
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Claude API call failed:', message)
    // Surface the real error in development
    return NextResponse.json(
      { error: 'AI generation failed', detail: message },
      { status: 502 }
    )
  }

  // 5. Parse response
  const parsed = parseBriefResponse(rawText)

  // 5b. Save clarifying questions to memory (fire-and-forget)
  if (parsed.clarifying_questions.length > 0) {
    void savePendingClarifications(user.id, today, parsed.clarifying_questions).catch(
      err => console.error('savePendingClarifications failed:', err)
    )
  }

  // 6. Store in DB
  const stored = await storeBrief(user.id, {
    brief_date: today,
    model_used: 'claude-haiku-4-5',
    raw_prompt: userMessage,
    priorities: parsed.priorities,
    insight_text: parsed.insight_text,
    energy_score: parsed.energy_score,
    tokens_used: tokensUsed,
  })

  if (!stored) {
    // Return parsed data even if storage fails
    return NextResponse.json({
      brief: {
        id: 'temp',
        user_id: user.id,
        brief_date: today,
        generated_at: new Date().toISOString(),
        model_used: 'claude-opus-4-6',
        raw_prompt: null,
        ...parsed,
        stale: false,
        tokens_used: tokensUsed,
      },
      cached: false,
    })
  }

  return NextResponse.json({ brief: stored, cached: false })
}
