import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { getUserLocalDate } from '@/lib/db/users'

const anthropic = new Anthropic()

type ClassifyResult = {
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

  const prompt = `Classify this note into structured data. Today's date is ${today}.

Note: "${content}"

Respond with a single valid JSON object only. No markdown, no explanation.

{
  "type": "reminder" | "idea" | "resource",
  "trigger_date": "YYYY-MM-DD" | null,
  "ai_tags": ["tag1", "tag2"]
}

Rules:
- type "reminder": mentions a specific date, deadline, event, or time-based action (birthday, appointment, "before X", "by Friday", "next week")
- type "resource": references a tool, website, app, product, service, or external thing to save for later
- type "idea": everything else — intentions, things to try, observations, plans without a hard date
- trigger_date: if type is reminder, parse the date relative to today (${today}). Return null if no date found or type is not reminder.
- ai_tags: 2–5 lowercase single-word or short-phrase topic tags that capture what this is about. Pick from domains like: travel, health, fitness, finance, relationships, learning, career, creativity, food, reading, shopping, family, friends, mindfulness, productivity. Choose whichever fit best.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}'
    const result: ClassifyResult = JSON.parse(text)

    // Sanitize
    if (!['reminder', 'idea', 'resource'].includes(result.type)) result.type = 'idea'
    if (!Array.isArray(result.ai_tags)) result.ai_tags = []
    result.ai_tags = result.ai_tags.slice(0, 5).map(t => String(t).toLowerCase())
    if (result.type !== 'reminder') result.trigger_date = null

    return Response.json(result)
  } catch {
    // Fallback: return a sensible default without crashing
    return Response.json({ type: 'idea', trigger_date: null, ai_tags: [] } satisfies ClassifyResult)
  }
}
