import type { BriefContext } from './context'

export const SYSTEM_PROMPT = `You are Locus — a calm, perceptive life operating system. Your role is to generate a daily brief: a concise AI insight and a short list of prioritized actions tailored to the user's energy level, active goals, and recent habits.

Tone guidelines:
- Warm but direct. Never cheesy or over-motivational.
- Serif-quality prose — thoughtful, specific, not generic.
- Acknowledge reality (low energy, blockers) without dwelling on it.
- Surface one sharp observation that connects the user's data to their day ahead.

Response format: You MUST respond with a single valid JSON object. No markdown, no explanation, no preamble. The JSON must follow this exact schema:

{
  "insight_text": "<1-3 sentence observation about the user's current trajectory, today's energy, and what matters most right now>",
  "priorities": [
    {
      "title": "<specific action, max 12 words>",
      "category": "<one of: work | health | personal | learning>",
      "estimated_time": "<e.g. 30 min | 1 hr | 15 min>",
      "time_of_day": "<one of: morning | afternoon | evening | flexible>",
      "reasoning": "<one sentence connecting this to their goals or energy>"
    }
  ],
  "energy_score": <number 1-10, your assessment of their likely productive energy today>
}

Produce 3 priorities. Order them by impact and energy fit. If energy is low (≤4), lean toward shorter, high-leverage tasks. If energy is high (≥7), include at least one ambitious goal-advancing action.`

export function buildUserMessage(ctx: BriefContext): string {
  const lines: string[] = []

  lines.push(`Date: ${ctx.date}`)
  lines.push('')

  // Today's check-in
  if (ctx.todayCheckin) {
    lines.push(`TODAY'S CHECK-IN`)
    lines.push(`Energy: ${ctx.todayCheckin.energy_level}/10`)
    if (ctx.todayCheckin.mood_note) {
      lines.push(`Mood note: "${ctx.todayCheckin.mood_note}"`)
    }
    if (ctx.todayCheckin.blockers.length > 0) {
      lines.push(`Blockers: ${ctx.todayCheckin.blockers.join(', ')}`)
    }
  } else {
    lines.push(`TODAY'S CHECK-IN: Not completed yet`)
    if (ctx.avgEnergy !== null) {
      lines.push(`7-day avg energy: ${ctx.avgEnergy}/10`)
    }
  }
  lines.push('')

  // Recent energy trend
  if (ctx.recentCheckins.length > 1) {
    const trend = ctx.recentCheckins.slice(0, 5).map(c => `${c.date}: ${c.energy_level}`).join(', ')
    lines.push(`RECENT ENERGY TREND (last ${Math.min(ctx.recentCheckins.length, 5)} days): ${trend}`)
    lines.push('')
  }

  // Active goals
  if (ctx.goals.length > 0) {
    lines.push(`ACTIVE GOALS (${ctx.goals.length})`)
    ctx.goals.forEach(g => {
      lines.push(`- [${g.category.toUpperCase()} · ${g.timeframe}] "${g.title}"`)
      lines.push(`  Progress: ${g.progress_pct}%`)
      if (g.next_action) lines.push(`  Next action: ${g.next_action}`)
      if (g.target_date) lines.push(`  Target date: ${g.target_date}`)
    })
  } else {
    lines.push(`ACTIVE GOALS: None set yet`)
  }
  lines.push('')

  // Habit performance
  if (ctx.habits.length > 0) {
    lines.push(`HABITS THIS WEEK (${ctx.weekHabitRate}% completion rate)`)
    ctx.habits.forEach(h => {
      const status = h.weekCompletions >= h.target_count ? '✓ on track' : `${h.weekCompletions}/${h.target_count}`
      lines.push(`- ${h.emoji} ${h.name} [${h.frequency}]: ${status}, streak: ${h.streak} days`)
    })
  } else {
    lines.push(`HABITS: None set yet`)
  }

  return lines.join('\n')
}
