import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAnthropicClient } from '@/lib/ai/client'

export const runtime = 'nodejs'
export const maxDuration = 20

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { answers, briefInsight } = await request.json().catch(() => ({}))
  if (!answers?.length || !briefInsight) return NextResponse.json({ note: null })

  const client = getAnthropicClient()

  const qa = (answers as { question: string; answer: string }[])
    .map(({ question, answer }) => `Q: ${question}\nA: ${answer}`)
    .join('\n\n')

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 150,
      system: `You are a personal AI assistant. The user just answered clarifying questions about their day. Write a single clarification note: 1-2 sentences that acknowledge what you learned and add one specific, actionable insight. Be direct and personal. No preamble like "Based on your answers" — just the insight itself.`,
      messages: [{
        role: 'user',
        content: `Today's brief: "${briefInsight}"\n\nUser's answers:\n${qa}`,
      }],
    })

    const note = response.content.find(b => b.type === 'text')?.text?.trim() ?? null
    return NextResponse.json({ note })
  } catch (err) {
    console.error('[brief/clarify]', err)
    return NextResponse.json({ note: null })
  }
}
