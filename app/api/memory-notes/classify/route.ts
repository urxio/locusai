import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { getUserLocalDate } from '@/lib/db/users'

const anthropic = new Anthropic()

export type ClassifyResult = {
  type: 'reminder' | 'idea' | 'resource'
  trigger_date: string | null
  ai_tags: string[]
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { content }: { content: string } = await req.json()
  if (!content?.trim()) return Response.json({ error: 'Empty content' }, { status: 400 })

  const today = await getUserLocalDate(user.id)
  const hasUrl = /https?:\/\/[^\s]+/.test(content)

  const prompt = `Classify this note. Today is ${today}.

Note: "${content}"

Output a single valid JSON object only. No markdown.

{
  "type": "reminder" | "idea" | "resource",
  "trigger_date": "YYYY-MM-DD" | null,
  "ai_tags": ["tag1", "tag2"]
}

Rules:
- "reminder": has a specific date, deadline, or time-based trigger
- "resource": contains a URL, or references a tool/site/product/service to save${hasUrl ? ' [this note has a URL — use "resource"]' : ''}
- "idea": everything else
- trigger_date: parse relative to ${today} if type is reminder, else null
- ai_tags: 2–4 lowercase topic words from: travel, health, fitness, finance, relationships, learning, career, creativity, food, reading, shopping, family, friends, mindfulness, productivity, tools`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}'
    const result: ClassifyResult = JSON.parse(text)

    if (!['reminder', 'idea', 'resource'].includes(result.type)) result.type = 'idea'
    if (hasUrl) result.type = 'resource'
    if (!Array.isArray(result.ai_tags)) result.ai_tags = []
    result.ai_tags = result.ai_tags.slice(0, 4).map(t => String(t).toLowerCase())
    if (result.type !== 'reminder') result.trigger_date = null

    return Response.json(result)
  } catch {
    return Response.json({ type: hasUrl ? 'resource' : 'idea', trigger_date: null, ai_tags: [] } satisfies ClassifyResult)
  }
}
