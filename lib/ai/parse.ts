import type { BriefPriority } from '@/lib/types'

export type ParsedBrief = {
  insight_text: string
  priorities: BriefPriority[]
  energy_score: number | null
}

const FALLBACK: ParsedBrief = {
  insight_text: "Focus on what moves the needle most today. One deliberate step forward is enough.",
  priorities: [
    {
      title: "Review your top goal and take one concrete action",
      category: "work",
      estimated_time: "30 min",
      time_of_day: "morning",
      reasoning: "Consistent forward motion compounds over time."
    },
    {
      title: "Complete your most important habit",
      category: "health",
      estimated_time: "20 min",
      time_of_day: "flexible",
      reasoning: "Maintaining your streak builds the identity you're aiming for."
    },
    {
      title: "Block 30 minutes for deep work",
      category: "work",
      estimated_time: "30 min",
      time_of_day: "afternoon",
      reasoning: "Protected focus time is your highest-leverage resource."
    }
  ],
  energy_score: null
}

export function parseBriefResponse(raw: string): ParsedBrief {
  // Strip any accidental markdown fences
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    console.error('parseBriefResponse: JSON parse failed', cleaned.slice(0, 200))
    return FALLBACK
  }

  if (typeof parsed !== 'object' || parsed === null) return FALLBACK

  const obj = parsed as Record<string, unknown>

  const insight_text = typeof obj.insight_text === 'string' && obj.insight_text.trim()
    ? obj.insight_text.trim()
    : FALLBACK.insight_text

  const rawPriorities = Array.isArray(obj.priorities) ? obj.priorities : []
  const priorities: BriefPriority[] = rawPriorities
    .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null)
    .map(p => ({
      title: typeof p.title === 'string' ? p.title : 'Focus on your next action',
      category: isValidCategory(p.category) ? p.category : 'work',
      estimated_time: typeof p.estimated_time === 'string' ? p.estimated_time : '30 min',
      time_of_day: isValidTimeOfDay(p.time_of_day) ? p.time_of_day : 'flexible',
      reasoning: typeof p.reasoning === 'string' ? p.reasoning : '',
    }))
    .slice(0, 5)

  const energy_score =
    typeof obj.energy_score === 'number' && obj.energy_score >= 1 && obj.energy_score <= 10
      ? obj.energy_score
      : null

  return {
    insight_text,
    priorities: priorities.length > 0 ? priorities : FALLBACK.priorities,
    energy_score,
  }
}

function isValidCategory(v: unknown): v is BriefPriority['category'] {
  return ['work', 'health', 'personal', 'learning'].includes(v as string)
}

function isValidTimeOfDay(v: unknown): v is BriefPriority['time_of_day'] {
  return ['morning', 'afternoon', 'evening', 'flexible'].includes(v as string)
}
