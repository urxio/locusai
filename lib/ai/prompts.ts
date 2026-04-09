import type { BriefContext } from './context'
import { formatMemoryForPrompt } from './memory'

export const SYSTEM_PROMPT = `You are Locus — an AI companion and life operating system. You are not a productivity tool. You are a calm, caring presence that genuinely knows this person — their rhythms, struggles, goals, and what makes them thrive. You generate a daily brief that feels like it comes from someone who has been paying close attention for weeks: someone who notices patterns, remembers what was hard, celebrates quiet progress, and offers exactly what's needed today — not generic advice, but something felt.

TONE
- Warm, human, direct. The tone of a trusted mentor who also genuinely cares about the person's wellbeing — not just their output.
- Specific, not vague. Always reference real goals, habits, and energy data by name. No filler phrases.
- Acknowledge difficulty with compassion, not just pragmatism. Low energy days are human. Stalled goals are normal. Name it, then redirect.
- When momentum is real, name it clearly and warmly. Progress deserves to be witnessed.
- Write like you know them — because you do.

INTELLIGENCE RULES
1. ENERGY-FIRST: Everything is calibrated to today's energy. Low energy (≤4) → protect focus, suggest shorter high-value tasks. High energy (≥7) → push on the most ambitious goal. Moderate (5-6) → balanced mix.
2. GOAL MOMENTUM: A goal at 80% is not the same as one at 20%. A goal with 3 days left is urgent. A goal stalled for weeks needs a nudge. Notice these patterns and name them.
3. HABIT SIGNALS: A 7+ day streak is momentum worth protecting. A broken streak is worth acknowledging. Habits not done yet today should appear in priorities when energy allows.
4. BLOCKER ROUTING: Each blocker maps to an action type. "Unclear priorities" → clarify/plan task. "Low energy" → protect time, reduce friction. "Waiting on others" → async work or habit-focused day. "Too many meetings" → identify one deep work window.
5. MOOD CONTEXT: Read the mood note for signals — anxiety, excitement, distraction, confidence. Let it color the insight_text but don't quote it back verbatim.
6. PATTERN RECOGNITION: If energy has been declining for 3+ days, mention recovery. If habits have been consistently high, name the streak. If a goal deadline is close with low progress, flag it.
7. LONG-TERM MEMORY: If a LONG-TERM MEMORY section appears above the daily data, treat it as essential context. Reference the user's historical patterns directly — mention their best energy day if relevant, call out a recurring blocker by name, or acknowledge a habit's long-term consistency. Use the learned patterns to make the brief feel like it comes from an advisor who has been watching for weeks, not just today. Never invent patterns not in the memory.
8. JOURNAL ENTRIES: If TODAY'S JOURNAL ENTRY or RECENT JOURNAL ENTRIES appear, treat them as the richest personal context available. The journal is the user's unfiltered inner voice. Read it carefully — not just for facts but for emotional tone, underlying concerns, and things they might not have named explicitly. Let journal content meaningfully shape the insight_text and priority reasoning. Never quote journal text directly back to them, but let it be felt in the response.

OUTPUT FORMAT — respond with a single valid JSON object only. No markdown fences, no explanation.

{
  "insight_text": "<2-4 sentences. Must reference specific goals, habits, or energy patterns by name. Should feel like it was written knowing this exact person today — not a generic observation.>",
  "priorities": [
    {
      "title": "<specific, actionable task — max 12 words>",
      "category": "<work | health | personal | learning>",
      "estimated_time": "<e.g. 25 min | 1 hr | 15 min>",
      "time_of_day": "<morning | afternoon | evening | flexible>",
      "reasoning": "<one sentence: why this, why now, connected to a specific goal or habit>"
    }
  ],
  "energy_score": <number 1-10, your read of today's productive capacity>
}

Produce exactly 3 priorities. Order: highest-impact first. At least one must advance an active goal. At least one must connect to a habit (done or not yet done today).`

export function buildUserMessage(ctx: BriefContext): string {
  const lines: string[] = []
  const today = ctx.date

  // ── LONG-TERM MEMORY (prepended when available) ──
  const memoryBlock = formatMemoryForPrompt(ctx.memory)
  if (memoryBlock) {
    lines.push(memoryBlock)
    lines.push('')
    lines.push('─'.repeat(40))
    lines.push('')
  }

  lines.push(`DATE: ${today}`)
  lines.push('─'.repeat(40))

  // ── TODAY'S CHECK-IN ──
  if (ctx.todayCheckin) {
    const e = ctx.todayCheckin.energy_level
    const energyLabel = e >= 9 ? 'Exceptional' : e >= 7 ? 'High' : e >= 5 ? 'Moderate' : e >= 3 ? 'Low' : 'Depleted'
    lines.push(`TODAY'S CHECK-IN`)
    lines.push(`Energy: ${e}/10 (${energyLabel})`)
    if (ctx.todayCheckin.mood_note) {
      lines.push(`Mood: "${ctx.todayCheckin.mood_note}"`)
    }
    const realBlockers = ctx.todayCheckin.blockers.filter(b => b !== 'No blockers today')
    if (realBlockers.length > 0) {
      lines.push(`Blockers: ${realBlockers.join(' · ')}`)
    } else {
      lines.push(`Blockers: None`)
    }
  } else {
    lines.push(`TODAY'S CHECK-IN: Not completed`)
    if (ctx.avgEnergy !== null) {
      lines.push(`Recent avg energy: ${ctx.avgEnergy}/10`)
    }
  }
  lines.push('')

  // ── ENERGY TREND ──
  if (ctx.recentCheckins.length >= 3) {
    const recent = ctx.recentCheckins.slice(0, 7)
    const vals = recent.map(c => c.energy_level)
    const avg = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
    const trend = vals[0] > vals[vals.length - 1] ? '↓ declining' : vals[0] < vals[vals.length - 1] ? '↑ rising' : '→ stable'
    lines.push(`ENERGY TREND (${recent.length} days): avg ${avg}/10, ${trend}`)
    lines.push(`Daily readings: ${recent.map(c => `${c.date.slice(5)}: ${c.energy_level}`).join(' | ')}`)
    lines.push('')
  }

  // ── ACTIVE GOALS ──
  if (ctx.goals.length > 0) {
    lines.push(`ACTIVE GOALS (${ctx.goals.length})`)

    ctx.goals.forEach(g => {
      const urgency = getGoalUrgency(g.target_date, g.progress_pct)
      lines.push(`• [${g.category.toUpperCase()}] "${g.title}"`)
      lines.push(`  Progress: ${g.progress_pct}% ${getProgressBar(g.progress_pct)} ${urgency}`)
      if (g.next_action) lines.push(`  Next action: ${g.next_action}`)
      if (g.target_date) {
        const daysLeft = Math.ceil((new Date(g.target_date).getTime() - Date.now()) / 86400000)
        lines.push(`  Deadline: ${g.target_date} (${daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? 'DUE TODAY' : `${Math.abs(daysLeft)} days overdue`})`)
      }
      lines.push(`  Timeframe: ${g.timeframe}`)
    })
  } else {
    lines.push(`ACTIVE GOALS: None set yet`)
  }
  lines.push('')

  // ── HABITS ──
  if (ctx.habits.length > 0) {
    const todayLogged = ctx.habits.filter(h => h.logs.some(l => l.logged_date === today))
    const todayPending = ctx.habits.filter(h => !h.logs.some(l => l.logged_date === today))

    lines.push(`HABITS — Today: ${todayLogged.length}/${ctx.habits.length} done · Week rate: ${ctx.weekHabitRate}%`)
    lines.push('')

    if (todayLogged.length > 0) {
      lines.push(`  ✓ Done today: ${todayLogged.map(h => `${h.emoji} ${h.name}`).join(', ')}`)
    }
    if (todayPending.length > 0) {
      lines.push(`  ○ Still pending: ${todayPending.map(h => `${h.emoji} ${h.name}`).join(', ')}`)
    }
    lines.push('')

    lines.push(`  Streaks & momentum:`)
    ctx.habits.forEach(h => {
      const streakTag = h.streak >= 14 ? '🔥 strong streak' : h.streak >= 7 ? '⚡ building' : h.streak >= 3 ? '↑ going' : h.streak === 0 ? '○ not started' : `${h.streak}d`
      const weekStatus = h.weekCompletions >= h.target_count ? '✓ on track' : `${h.weekCompletions}/${h.target_count} this week`
      lines.push(`  ${h.emoji} ${h.name} [${h.frequency}]: streak ${h.streak} days (${streakTag}) · ${weekStatus}`)
    })
  } else {
    lines.push(`HABITS: None set yet`)
  }
  lines.push('')

  // ── RECENT MOOD PATTERNS ──
  const notesWithMood = ctx.recentCheckins.filter(c => c.mood_note && c.mood_note.trim().length > 0).slice(0, 3)
  if (notesWithMood.length > 0) {
    lines.push(`RECENT MOOD NOTES`)
    notesWithMood.forEach(c => {
      lines.push(`  ${c.date}: "${c.mood_note}"`)
    })
    lines.push('')
  }

  // ── TODAY'S JOURNAL ──
  if (ctx.todayJournal && ctx.todayJournal.content.trim()) {
    lines.push(`TODAY'S JOURNAL ENTRY`)
    lines.push(ctx.todayJournal.content.trim())
    lines.push('')
  }

  // ── RECENT JOURNAL ENTRIES (last 7 days, excluding today if already shown) ──
  const pastJournals = ctx.recentJournals.filter(j =>
    j.date !== ctx.date && j.content.trim().length > 0
  ).slice(0, 3)
  if (pastJournals.length > 0) {
    lines.push(`RECENT JOURNAL ENTRIES`)
    pastJournals.forEach(j => {
      const preview = j.content.trim()
      lines.push(`  ${j.date}: "${preview.length > 200 ? preview.slice(0, 200) + '…' : preview}"`)
    })
    lines.push('')
  }

  return lines.join('\n')
}

function getGoalUrgency(targetDate: string | null, progress: number): string {
  if (!targetDate) return ''
  const daysLeft = Math.ceil((new Date(targetDate).getTime() - Date.now()) / 86400000)
  if (daysLeft <= 0) return '⚠️ OVERDUE'
  if (daysLeft <= 7 && progress < 80) return '🔴 URGENT'
  if (daysLeft <= 14 && progress < 50) return '🟡 AT RISK'
  if (progress >= 80) return '🟢 NEAR FINISH'
  return ''
}

function getProgressBar(pct: number): string {
  const filled = Math.round(pct / 10)
  return '[' + '█'.repeat(filled) + '░'.repeat(10 - filled) + ']'
}
