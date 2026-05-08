import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAnthropicClient } from '@/lib/ai/client'
import { saveLocusComment } from '@/lib/db/journals'

export const runtime = 'nodejs'
export const maxDuration = 20

const SYSTEM = `You are Locus, a personal AI life assistant. A user has chosen to share a journal entry with you and wants your response. This is an opt-in, personal moment — they invited you in.

Write a warm, direct, personal response to what they shared. Think of yourself as a thoughtful friend who has been paying attention.

Rules:
- Be specific: reference what they actually wrote, don't be generic
- 2–4 sentences
- Can end with one genuine question, or just leave space — don't force a question if it doesn't fit
- Conversational and human, not clinical or coaching-speak
- Don't start with "I" — vary the opening
- Don't say "Thank you for sharing" or anything performative
- Don't give unsolicited advice unless the tone clearly invites it

Good examples:
- "That tension between wanting to slow down and not being able to is real — and it sounds exhausting to hold. What does a day that doesn't feel like catching up look like to you?"
- "The way you described that meeting says a lot — sounds like you've been carrying it since. Makes sense it's still in your head."
- "There's something quietly proud in how you wrote about that. Like you surprised yourself a little."

Response format: valid JSON only, no markdown fences.
{ "comment": "string" }`

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let content: string
  let date: string
  try {
    const body = await request.json()
    content = body.content ?? ''
    date = body.date ?? ''
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const trimmed = content.trim()
  if (!trimmed || !date) return NextResponse.json({ error: 'Missing content or date' }, { status: 400 })

  try {
    const client = getAnthropicClient()
    const res = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      system: SYSTEM,
      messages: [{ role: 'user', content: `Journal entry:\n"${trimmed}"` }],
    })

    const raw = res.content.find(b => b.type === 'text')?.text ?? ''
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    const parsed = JSON.parse(cleaned)
    const comment = typeof parsed.comment === 'string' && parsed.comment.trim()
      ? parsed.comment.trim()
      : null

    if (!comment) return NextResponse.json({ comment: null })

    await saveLocusComment(user.id, date, comment)

    return NextResponse.json({ comment })
  } catch (err) {
    console.error('[journal/comment]', err)
    return NextResponse.json({ comment: null })
  }
}
