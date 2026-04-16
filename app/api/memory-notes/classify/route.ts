import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { getUserLocalDate } from '@/lib/db/users'

const anthropic = new Anthropic()

type ClassifyResult = {
  type: 'reminder' | 'idea' | 'resource'
  trigger_date: string | null
  ai_tags: string[]
  clarifying_question: string | null
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { content }: { content: string } = await req.json()
  if (!content?.trim()) return Response.json({ error: 'Empty content' }, { status: 400 })

  const today = await getUserLocalDate(user.id)

  // Auto-detect URLs so we can always force "resource" for link-only notes
  const hasUrl = /https?:\/\/[^\s]+/.test(content)

  const prompt = `Classify this note and check if it needs clarification. Today's date is ${today}.

Note: "${content}"

Respond with a single valid JSON object only. No markdown, no explanation.

{
  "type": "reminder" | "idea" | "resource",
  "trigger_date": "YYYY-MM-DD" | null,
  "ai_tags": ["tag1", "tag2"],
  "clarifying_question": "short question" | null
}

Classification rules:
- type "reminder": mentions a specific date, deadline, event, or time-based action (appointment, "before X", "by Friday", "next week")
- type "resource": contains a URL, or references a tool, website, app, product, or service to save for later${hasUrl ? '\n- This note contains a URL — classify as "resource".' : ''}
- type "idea": everything else — intentions, things to try, observations, plans without a hard date
- trigger_date: if type is "reminder", parse the date relative to today (${today}). Null otherwise.
- ai_tags: 2–5 lowercase topic tags. Pick from: travel, health, fitness, finance, relationships, learning, career, creativity, food, reading, shopping, family, friends, mindfulness, productivity, tools, research.

Clarification rules:
- clarifying_question: ask ONE short, specific question ONLY if the note is genuinely ambiguous and the answer would meaningfully change how Locus surfaces it. Examples of ambiguity: missing date on what sounds like a time-sensitive reminder, unclear what action is needed, vague reference ("that thing", "the guy", "later").
- Do NOT ask if the note is self-contained and clear.
- Do NOT ask about URLs — they are always self-explanatory.
- Max 12 words. Start with a lowercase word. No question mark needed.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 180,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}'
    const result: ClassifyResult = JSON.parse(text)

    // Sanitize
    if (!['reminder', 'idea', 'resource'].includes(result.type)) result.type = 'idea'
    if (hasUrl) result.type = 'resource'
    if (!Array.isArray(result.ai_tags)) result.ai_tags = []
    result.ai_tags = result.ai_tags.slice(0, 5).map(t => String(t).toLowerCase())
    if (result.type !== 'reminder') result.trigger_date = null
    if (typeof result.clarifying_question !== 'string') result.clarifying_question = null
    if (result.clarifying_question === '') result.clarifying_question = null

    return Response.json(result)
  } catch {
    return Response.json({ type: 'idea', trigger_date: null, ai_tags: [], clarifying_question: null } satisfies ClassifyResult)
  }
}
