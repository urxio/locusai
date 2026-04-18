import { getAnthropicClient } from './client'

type RawStep = { title: string; due_date: string | null }

export async function generateGoalSteps(goal: {
  title: string
  category: string
  timeframe: string
  target_date: string | null
  progress_pct: number
}): Promise<RawStep[]> {
  const today = new Date().toISOString().split('T')[0]

  // Infer an end date when none is set
  const endDate = (() => {
    if (goal.target_date) return goal.target_date
    const d = new Date()
    if (goal.timeframe === 'quarter') d.setMonth(d.getMonth() + 3)
    else if (goal.timeframe === 'year') d.setFullYear(d.getFullYear() + 1)
    else d.setMonth(d.getMonth() + 6)   // ongoing → 6 months
    return d.toISOString().split('T')[0]
  })()

  const prompt = `Break down this goal into 4-7 concrete, actionable steps. Each step is a specific milestone the user must reach to complete the goal.

Goal: "${goal.title}"
Category: ${goal.category}
Timeframe: ${goal.timeframe}
Target completion: ${endDate}
Today: ${today}
Requirements:
- Steps must be ordered chronologically
- Each title starts with an action verb, is specific, max 10 words
- Due dates spread evenly from today through ${endDate}
- Together the steps cover the full path to goal completion
- Generate 4-7 steps (more for complex goals)

Return ONLY a JSON array. No explanation, no markdown:
[{"title": "Research competitors and define scope", "due_date": "2024-02-15"}, ...]`

  const client = getAnthropicClient()
  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 700,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = response.content[0]?.type === 'text' ? response.content[0].text : ''

  try {
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) return []
    const parsed = JSON.parse(match[0])
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (s): s is RawStep =>
        typeof s?.title === 'string' && s.title.trim().length > 2
    )
  } catch {
    return []
  }
}
