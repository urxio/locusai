import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAnthropicClient } from '@/lib/ai/client'
import type { BriefPriority } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 20

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { answers, briefInsight, currentPriorities } = await request.json().catch(() => ({}))
  if (!answers?.length || !briefInsight) return NextResponse.json({ note: null })

  const client = getAnthropicClient()

  const qa = (answers as { question: string; answer: string }[])
    .map(({ question, answer }) => `Q: ${question}\nA: ${answer}`)
    .join('\n\n')

  const prioritiesContext = currentPriorities?.length
    ? `\nCurrent priorities:\n${(currentPriorities as BriefPriority[]).map((p, i) => `${i + 1}. ${p.title} (${p.category}, ${p.time_of_day})`).join('\n')}`
    : ''

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      system: `You are a personal AI assistant. The user answered clarifying questions about their day. Based on what you learned, respond with JSON only — no markdown, no explanation:
{
  "note": "1-2 sentences acknowledging what you learned and adding one specific insight. Direct, personal, no preamble like 'Based on your answers'.",
  "updatedInsight": "Revised brief insight text if the answers materially change the picture — otherwise null. 2-3 sentences max.",
  "updatedPriorities": [
    { "title": "...", "category": "work|health|personal|learning", "estimated_time": "...", "time_of_day": "morning|afternoon|evening|flexible", "reasoning": "..." }
  ] or null
}
Only set updatedInsight/updatedPriorities if the answers significantly change what the user should focus on today. Keep priorities to 2-3 items max.`,
      messages: [{
        role: 'user',
        content: `Today's brief: "${briefInsight}"${prioritiesContext}\n\nUser's answers to my questions:\n${qa}`,
      }],
    })

    const raw = response.content.find(b => b.type === 'text')?.text ?? ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ note: null, updatedInsight: null, updatedPriorities: null })

    const parsed = JSON.parse(match[0]) as {
      note?: string
      updatedInsight?: string | null
      updatedPriorities?: BriefPriority[] | null
    }

    return NextResponse.json({
      note: parsed.note?.trim() ?? null,
      updatedInsight: parsed.updatedInsight?.trim() ?? null,
      updatedPriorities: parsed.updatedPriorities ?? null,
    })
  } catch (err) {
    console.error('[brief/clarify]', err)
    return NextResponse.json({ note: null, updatedInsight: null, updatedPriorities: null })
  }
}
