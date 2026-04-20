import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAnthropicClient } from '@/lib/ai/client'

export const runtime = 'nodejs'
export const maxDuration = 60

type Message = { role: 'user' | 'assistant'; content: string }

const SYSTEM = `You are Locus, a warm and thoughtful AI helping a new user set up their personal life OS. Your job is to learn about them through friendly conversation — who they are, what they're working towards, and what habits matter to them.

You need to collect (in a natural, flowing conversation):
1. **Goals** — what they want to achieve (1–5 goals). For each, infer: title, category (one of: product, health, learning, financial, wellbeing, other), timeframe (quarter, year, or ongoing).
2. **Habits** — daily/weekly practices they want to build (1–5 habits). For each, infer: emoji (appropriate one), name, days_of_week (empty array [] for daily, [1,3,5] for 3x/week, [1,2,3,4,5] for weekdays, or specific days).
3. **Profile** (all optional — don't push if they skip): occupation, relationship_status (single | in_relationship | married | prefer_not_to_say | ""), has_kids (true | false | null), work_arrangement (remote | office | hybrid | other | ""), personality (array of traits from: Introvert, Extrovert, Morning person, Night owl, Creative, Analytical, Detail-oriented, Big-picture thinker, High-energy, Calm & steady — up to 4), life_context (a sentence about their life in their own words).
4. **Today's check-in** — energy_level (1–10, must ask explicitly), mood_note (one sentence, optional).

Conversation guidelines:
- Keep every message to 1–3 sentences max — short, warm, human
- Start by welcoming them and asking what they're working on right now
- Guide naturally from goals → habits → brief personal context → how they feel today
- Don't ask for all fields in one message — one or two topics at a time
- If they skip something, don't push — use null/empty defaults
- Sound like a genuinely curious friend, not a form
- You MUST exchange at least 4 messages before wrapping up (don't rush)
- Always explicitly ask for energy as a number before finishing
- After asking for energy and getting at least goals + habits, you have enough to finish

When you have collected goals, habits, and energy level (minimum), close naturally with one warm sentence, then on a new line append the hidden data block — the user never sees this:

<onboarding_data>
{"profile":{"occupation":"","relationship_status":"","has_kids":null,"work_arrangement":"","personality":[],"life_context":""},"goals":[{"title":"Launch MVP","category":"product","timeframe":"quarter"}],"habits":[{"emoji":"🏃","name":"Morning run","days_of_week":[]}],"checkin":{"energy_level":7,"mood_note":"Excited to start"}}
</onboarding_data>

JSON rules:
- All profile fields are optional — use "" or null or [] if not provided
- goals: array of {title, category, timeframe} — at minimum 1
- habits: array of {emoji, name, days_of_week} — at minimum 1
- checkin.energy_level: integer 1–10 (required)
- checkin.mood_note: one sentence or null

After appending the data block, add one final warm closing sentence (e.g., "Setting up your Locus now — your first brief is almost ready."). Do not reveal the JSON or the tags.`

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  let messages: Message[]
  let userName: string

  try {
    const body = await request.json()
    messages = body.messages ?? []
    userName = body.userName ?? 'there'
  } catch {
    return new Response('Bad request', { status: 400 })
  }

  const client = getAnthropicClient()

  // Seed with a hidden prompt when starting fresh
  const apiMessages = messages.length === 0
    ? [{ role: 'user' as const, content: `(Start the onboarding conversation now. The user's name is ${userName}. Welcome them warmly and ask about their goals.)` }]
    : messages

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 600,
          system: SYSTEM,
          messages: apiMessages,
          stream: true,
        })

        for await (const event of response) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
      } catch (err) {
        console.error('[onboarding/chat] stream error:', err)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
