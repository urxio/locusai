import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAnthropicClient } from '@/lib/ai/client'

export const runtime = 'nodejs'
export const maxDuration = 20

const SYSTEM = `You are a context-gathering assistant for Locus, a personal life OS app.

The user just submitted a brief mood note or journal entry. Your job is to decide whether ONE short follow-up question would genuinely help Locus understand and support this person better.

RULES:
- Only ask if the entry is vague, short (under 30 words), or uses broad emotion words without context (e.g. "stressed", "tired", "off", "overwhelmed", "anxious", "meh", "ok", "fine", "weird", "blah", "busy")
- If the entry is already specific and detailed — DO NOT ask. Return null.
- The question must reference something specific the user actually wrote — never generic
- Make it feel like a caring, curious friend asking — not a form or survey
- Keep it to one sentence, max 20 words
- Ask the most useful single thing that would change how you'd advise this person

RESPONSE FORMAT: respond with valid JSON only. No markdown fences.
{ "question": "string or null" }

Examples of GOOD questions:
- Entry: "feeling off" → "What's underneath that — something specific happened, or more of a low-energy day?"
- Entry: "stressed about everything" → "Is the stress coming from one main thing, or is it more of a general weight right now?"
- Entry: "had a weird day" → "What made it feel weird — something at work, or more personal?"

Examples of when to return null:
- Entry: "Great productive morning, got the API integration done and feeling energized for the afternoon." → null (already specific)
- Entry: "Had a difficult conversation with my manager about the project timeline, feeling uncertain about next steps." → null (already specific)
`

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ question: null })

  let content: string, type: string
  try {
    const body = await request.json()
    content = body.content ?? ''
    type    = body.type ?? 'checkin'
  } catch {
    return NextResponse.json({ question: null })
  }

  const trimmed = content.trim()
  if (!trimmed) return NextResponse.json({ question: null })

  // Hard skip: entries over 50 words are almost always specific enough
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length
  if (wordCount > 50) return NextResponse.json({ question: null })

  try {
    const client = getAnthropicClient()
    const res = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 128,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `${type === 'journal' ? 'Journal entry' : 'Mood note'}: "${trimmed}"`,
      }],
    })

    const raw = res.content.find(b => b.type === 'text')?.text ?? ''
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    const parsed = JSON.parse(cleaned)
    const question = typeof parsed.question === 'string' && parsed.question.trim()
      ? parsed.question.trim()
      : null
    return NextResponse.json({ question })
  } catch (err) {
    console.error('followup/generate error:', err)
    return NextResponse.json({ question: null })
  }
}
