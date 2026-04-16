import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { WHEEL_AREAS, type WheelScores } from '@/lib/types'

const anthropic = new Anthropic()

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const {
    scores,
    suggested,
  }: { scores: WheelScores; suggested: Partial<WheelScores> } = await req.json()

  // Build the area breakdown with self-reported vs data-backed comparison
  const areaLines = WHEEL_AREAS.map(a => {
    const self = scores[a.key] ?? 5
    const data = suggested[a.key]
    const tag = data !== undefined
      ? ` (data suggests ${data.toFixed(1)})`
      : ' (self-reported only)'
    return `- ${a.label}: ${self}/10${tag}`
  }).join('\n')

  // Find biggest gap (self vs data) and lowest score
  const lowestArea = WHEEL_AREAS
    .map(a => ({ label: a.label, score: scores[a.key] ?? 5 }))
    .sort((a, b) => a.score - b.score)[0]

  const gaps = WHEEL_AREAS
    .filter(a => suggested[a.key] !== undefined)
    .map(a => ({
      label: a.label,
      gap: (scores[a.key] ?? 5) - (suggested[a.key] as number),
    }))
    .filter(g => Math.abs(g.gap) >= 1.5)
    .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))

  const gapNote = gaps.length > 0
    ? `Notable gap: you rated ${gaps[0].label} ${gaps[0].gap > 0 ? `${gaps[0].gap.toFixed(1)} points higher` : `${Math.abs(gaps[0].gap).toFixed(1)} points lower`} than your data suggests.`
    : ''

  const prompt = `You are a perceptive life coach reviewing a Wheel of Life snapshot. Be honest, warm, and direct. No platitudes.

Self-reported scores (1-10):
${areaLines}

Lowest scoring area: ${lowestArea.label} (${lowestArea.score}/10)
${gapNote}

In exactly 3 sentences:
1. Name the most important pattern or imbalance you see across the wheel.
2. Speak to the gap between perception and data if there is one — or validate the self-awareness if scores and data align.
3. Give one concrete, specific action this week to move the needle on the lowest area.

Be direct. No filler. Start with the observation, not "I notice" or "It looks like".`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 220,
    messages: [{ role: 'user', content: prompt }],
  })

  const insight = message.content[0].type === 'text' ? message.content[0].text : ''
  return Response.json({ insight })
}
