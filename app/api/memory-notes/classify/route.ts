import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { getUserLocalDate } from '@/lib/db/users'

const anthropic = new Anthropic()

export type ClassifyResult = {
  type: 'reminder' | 'idea' | 'resource'
  trigger_date: string | null
  ai_tags: string[]
}

// Client-callable pre-classification based on signal words — fast, no AI needed
export function preClassify(content: string): 'reminder' | 'idea' | 'resource' | null {
  const lower = content.toLowerCase()
  if (/https?:\/\/[^\s]+/.test(content)) return 'resource'
  const reminderSignals = /\b(today|tomorrow|tonight|this (monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month|weekend)|next (week|month|monday|tuesday|wednesday|thursday|friday)|by (friday|monday|end of|the)|before |deadline|due |don'?t forget|remember to|need to (call|email|send|submit|pay|buy|pick up|book|schedule|follow up)|appointment|meeting at|call at|renew|expires?)\b/i
  if (reminderSignals.test(lower)) return 'reminder'
  const resourceSignals = /\b(app|tool|site|website|book|article|course|podcast|video|plugin|software|service|platform|newsletter|channel|repo|github|library|framework|recipe)\b/i
  if (resourceSignals.test(lower)) return 'resource'
  return null
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { content }: { content: string } = await req.json()
  if (!content?.trim()) return Response.json({ error: 'Empty content' }, { status: 400 })

  const today = await getUserLocalDate(user.id)
  const hasUrl = /https?:\/\/[^\s]+/.test(content)

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 150,
      system: `You classify personal notes into exactly one of three types: reminder, resource, or idea.

REMINDER — anything time-sensitive or action-based with a when:
- "Call dentist before Friday"
- "Submit proposal by end of month"
- "Don't forget to pay rent tomorrow"
- "Pick up dry cleaning this weekend"

RESOURCE — a tool, site, app, book, service, or reference to save for later:
- "Scott's Cheap Flights is great for deals"
- "Notion is good for docs"
- "Read Atomic Habits"
- "Try the Headspace app"
- Anything containing a URL

IDEA — an intention, observation, or plan with no hard date and no specific tool:
- "Try intermittent fasting"
- "Work on being more present with family"
- "Consider switching to a standing desk"

When in doubt: if it has a date or "need to X" → reminder. If it names a specific tool/site/thing → resource. Otherwise → idea.

Output valid JSON only:
{"type":"reminder","trigger_date":"YYYY-MM-DD or null","ai_tags":["tag1","tag2"]}

For trigger_date: today is ${today}. Parse relative dates (tomorrow, next Friday, etc). Use null if no date or type is not reminder.
For ai_tags: 2–4 lowercase words describing the topic. Choose from: travel, health, fitness, finance, relationships, learning, career, creativity, food, reading, shopping, family, friends, mindfulness, productivity, tools, work, wellness.`,
      messages: [{ role: 'user', content: `Note: "${content}"` }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}'
    const result: ClassifyResult = JSON.parse(text)

    // Sanitize
    if (!['reminder', 'idea', 'resource'].includes(result.type)) result.type = 'idea'
    if (hasUrl) result.type = 'resource'
    if (!Array.isArray(result.ai_tags)) result.ai_tags = []
    result.ai_tags = result.ai_tags.slice(0, 4).map(t => String(t).toLowerCase())
    if (result.type !== 'reminder') result.trigger_date = null

    return Response.json(result)
  } catch {
    // Fallback to signal-word detection before defaulting to idea
    const preType = preClassify(content)
    return Response.json({
      type: preType ?? 'idea',
      trigger_date: null,
      ai_tags: [],
    } satisfies ClassifyResult)
  }
}
