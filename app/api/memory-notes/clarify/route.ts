import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { content, type }: { content: string; type: string } = await req.json()
  if (!content?.trim()) return Response.json({ question: null })

  // URLs are always self-explanatory — never ask
  if (/https?:\/\/[^\s]+/.test(content)) return Response.json({ question: null })

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 80,
    system: `You are a detail-oriented assistant helping someone build a personal memory system. Your job is to ask one short clarifying question when a note is missing important context. You respond with ONLY the question text — no punctuation at the end, no quotes, no explanation. If the note is perfectly clear, respond with the single word: null`,
    messages: [
      {
        role: 'user',
        content: `Note type: ${type}
Note: "${content}"

Does this note need clarification to be useful later? Missing info like: who, what exactly, when, or what action to take?

If yes — ask one short specific question (max 10 words, lowercase).
If no — respond with: null`,
      },
    ],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : 'null'
  const question = raw === 'null' || raw === '' ? null : raw.replace(/[?".]$/, '').trim()

  return Response.json({ question })
}
