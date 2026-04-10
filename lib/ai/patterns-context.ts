/**
 * patterns-context.ts
 * Pure computation: builds all statistical correlations needed for the
 * Patterns page and the AI pattern-generation prompt.
 * No Claude calls here — just data crunching.
 */

import { createClient } from '@/lib/supabase/server'

/* ── TYPES ──────────────────────────────────────────────── */

export type HabitEnergyCorr = {
  habitId:    string
  name:       string
  emoji:      string
  avgWith:    number   // avg energy on days this habit was logged
  avgWithout: number   // avg energy on days it wasn't
  diffPct:    number   // signed % difference (positive = habit correlated with higher energy)
  daysWith:   number   // sample size
}

export type HabitChain = {
  nameA:     string; emojiA: string
  nameB:     string; emojiB: string
  avgEnergy: number  // avg energy on days BOTH logged
  baseline:  number  // overall avg energy
  days:      number  // how many co-occurrence days
}

export type SentimentPeriod = {
  label:    string   // "Mar 28 – Apr 10"
  score:    number   // positive word count − negative word count
  entries:  number
}

export type DayOfWeekStats = {
  day:           string           // "Mon", "Tue", etc.
  avgEnergy:     number | null
  habitRate:     number | null    // 0-100, avg completion rate across all habits
}

export type PatternsContext = {
  checkinCount:     number
  journalCount:     number
  dayRange:         number         // how many calendar days of data

  energyByDay:      Record<string, number>  // { Mon: 7.2, Tue: 6.1 }
  bestDay:          string | null
  worstDay:         string | null
  overallAvgEnergy: number | null

  dayOfWeekStats:   DayOfWeekStats[]

  habitEnergyCorrs: HabitEnergyCorr[]  // sorted by |diffPct|, min 8% threshold
  habitChains:      HabitChain[]       // top 3 positive co-occurrence pairs

  sentimentPeriods: SentimentPeriod[]  // last 3 two-week windows
  sentimentTrend:   'improving' | 'declining' | 'stable' | 'insufficient'
  topPositiveWords: string[]
  topNegativeWords: string[]
}

/* ── WORD LISTS ─────────────────────────────────────────── */

const POSITIVE = new Set([
  'great','good','excited','focused','clear','productive','progress','accomplished',
  'energized','happy','motivated','strong','confident','ready','creative','inspired',
  'positive','successful','thriving','forward','calm','peaceful','proud','solid',
  'momentum','clarity','flow','effective','efficient','rested','refreshed','bright',
])

const NEGATIVE = new Set([
  'tired','stressed','frustrated','overwhelmed','stuck','anxious','hard','difficult',
  'bad','slow','blocked','exhausted','worried','uncertain','behind','struggling',
  'drained','scattered','unfocused','distracted','off','rough','lost','cloudy',
  'foggy','heavy','burned','burnt','anxious','depressed','sad','blah','meh',
])

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] as const

/* ── HELPERS ─────────────────────────────────────────────── */

function avg(nums: number[]): number {
  if (!nums.length) return 0
  return Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10
}

function extractWords(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 3)
}

function periodLabel(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`
}

/* ── MAIN ─────────────────────────────────────────────────── */

export async function buildPatternsContext(userId: string): Promise<PatternsContext> {
  const supabase = await createClient()

  const since90 = new Date()
  since90.setDate(since90.getDate() - 90)
  const sinceStr = since90.toISOString().split('T')[0]

  /* ── Fetch in parallel ── */
  const [
    { data: checkins },
    { data: habits },
    { data: habitLogs },
    { data: journals },
  ] = await Promise.all([
    supabase.from('check_ins')
      .select('date, energy_level, mood_note')
      .eq('user_id', userId)
      .gte('date', sinceStr)
      .order('date', { ascending: true }),
    supabase.from('habits')
      .select('id, name, emoji')
      .eq('user_id', userId),
    supabase.from('habit_logs')
      .select('habit_id, logged_date')
      .eq('user_id', userId)
      .gte('logged_date', sinceStr),
    supabase.from('journal_entries')
      .select('date, content')
      .eq('user_id', userId)
      .gte('date', sinceStr)
      .gt('content', ''),
  ])

  const checkinArr  = checkins  ?? []
  const habitArr    = habits    ?? []
  const logArr      = habitLogs ?? []
  const journalArr  = journals  ?? []

  /* ── Build lookup maps ── */
  const energyByDate = new Map<string, number>()
  checkinArr.forEach(c => energyByDate.set(c.date, c.energy_level))

  // habitId → Set<logged_date>
  const logsByHabit = new Map<string, Set<string>>()
  logArr.forEach(l => {
    if (!logsByHabit.has(l.habit_id)) logsByHabit.set(l.habit_id, new Set())
    logsByHabit.get(l.habit_id)!.add(l.logged_date)
  })

  const overallEnergies = Array.from(energyByDate.values())
  const overallAvgEnergy = overallEnergies.length ? avg(overallEnergies) : null

  /* ── 1. Energy by day of week ── */
  const byDayBuckets: Record<string, number[]> = {}
  checkinArr.forEach(c => {
    const d = DAYS[new Date(c.date + 'T12:00:00').getDay()]
    if (!byDayBuckets[d]) byDayBuckets[d] = []
    byDayBuckets[d].push(c.energy_level)
  })
  const energyByDay: Record<string, number> = {}
  Object.entries(byDayBuckets).forEach(([d, vals]) => {
    if (vals.length >= 2) energyByDay[d] = avg(vals)
  })

  const dayEntries = Object.entries(energyByDay).sort((a, b) => b[1] - a[1])
  const bestDay    = dayEntries[0]?.[0] ?? null
  const worstDay   = dayEntries[dayEntries.length - 1]?.[0] ?? null

  /* ── 2. Day-of-week stats (energy + habit completion rate) ── */
  const dayOfWeekStats: DayOfWeekStats[] = DAYS.map(day => {
    // Which dates (with check-ins) fall on this day?
    const datesOnDay = checkinArr
      .filter(c => DAYS[new Date(c.date + 'T12:00:00').getDay()] === day)
      .map(c => c.date)

    const energyVals = datesOnDay.map(d => energyByDate.get(d)!).filter(Boolean)
    const dayAvgEnergy = energyVals.length >= 2 ? avg(energyVals) : null

    // Avg completion rate across all habits on this day
    let habitRate: number | null = null
    if (habitArr.length > 0 && datesOnDay.length >= 2) {
      const rates = habitArr.map(h => {
        const logs = logsByHabit.get(h.id) ?? new Set()
        const done = datesOnDay.filter(d => logs.has(d)).length
        return done / datesOnDay.length
      })
      habitRate = Math.round((rates.reduce((s, r) => s + r, 0) / rates.length) * 100)
    }

    return { day, avgEnergy: dayAvgEnergy, habitRate }
  })

  /* ── 3. Habit × Energy correlations ── */
  const habitEnergyCorrs: HabitEnergyCorr[] = []

  habitArr.forEach(habit => {
    const logged = logsByHabit.get(habit.id) ?? new Set()

    const energyWith:    number[] = []
    const energyWithout: number[] = []

    checkinArr.forEach(c => {
      const e = c.energy_level
      if (logged.has(c.date)) energyWith.push(e)
      else energyWithout.push(e)
    })

    if (energyWith.length < 5 || energyWithout.length < 5) return

    const avgWith    = avg(energyWith)
    const avgWithout = avg(energyWithout)
    const diffPct    = avgWithout > 0
      ? Math.round(((avgWith - avgWithout) / avgWithout) * 100)
      : 0

    if (Math.abs(diffPct) < 8) return  // not significant enough

    habitEnergyCorrs.push({
      habitId:    habit.id,
      name:       habit.name,
      emoji:      habit.emoji,
      avgWith,
      avgWithout,
      diffPct,
      daysWith:   energyWith.length,
    })
  })

  habitEnergyCorrs.sort((a, b) => Math.abs(b.diffPct) - Math.abs(a.diffPct))

  /* ── 4. Habit chain effects (co-occurrence pairs) ── */
  const habitChains: HabitChain[] = []

  for (let i = 0; i < habitArr.length; i++) {
    for (let j = i + 1; j < habitArr.length; j++) {
      const hA = habitArr[i]
      const hB = habitArr[j]
      const logsA = logsByHabit.get(hA.id) ?? new Set()
      const logsB = logsByHabit.get(hB.id) ?? new Set()

      const coOccurrenceEnergies: number[] = []
      checkinArr.forEach(c => {
        if (logsA.has(c.date) && logsB.has(c.date)) {
          coOccurrenceEnergies.push(c.energy_level)
        }
      })

      if (coOccurrenceEnergies.length < 4) continue

      const chainAvg = avg(coOccurrenceEnergies)
      const baseline = overallAvgEnergy ?? 7

      // Only include if combined is meaningfully higher than baseline
      if (chainAvg - baseline < 0.4) continue

      habitChains.push({
        nameA: hA.name, emojiA: hA.emoji,
        nameB: hB.name, emojiB: hB.emoji,
        avgEnergy: chainAvg,
        baseline,
        days: coOccurrenceEnergies.length,
      })
    }
  }

  habitChains.sort((a, b) => (b.avgEnergy - b.baseline) - (a.avgEnergy - a.baseline))
  const topChains = habitChains.slice(0, 3)

  /* ── 5. Journal sentiment drift (2-week windows, last 6 weeks) ── */
  const wordFreqPos: Record<string, number> = {}
  const wordFreqNeg: Record<string, number> = {}

  journalArr.forEach(j => {
    extractWords(j.content).forEach(w => {
      if (POSITIVE.has(w)) wordFreqPos[w] = (wordFreqPos[w] ?? 0) + 1
      if (NEGATIVE.has(w)) wordFreqNeg[w] = (wordFreqNeg[w] ?? 0) + 1
    })
  })

  const topPositiveWords = Object.entries(wordFreqPos)
    .sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w]) => w)
  const topNegativeWords = Object.entries(wordFreqNeg)
    .sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w]) => w)

  // Build 3 two-week periods (most recent first)
  const sentimentPeriods: SentimentPeriod[] = []
  const now = new Date()

  for (let p = 0; p < 3; p++) {
    const periodEnd   = new Date(now)
    periodEnd.setDate(periodEnd.getDate() - p * 14)
    const periodStart = new Date(periodEnd)
    periodStart.setDate(periodStart.getDate() - 13)

    const startStr = periodStart.toISOString().split('T')[0]
    const endStr   = periodEnd.toISOString().split('T')[0]

    const periodJournals = journalArr.filter(j => j.date >= startStr && j.date <= endStr)
    if (!periodJournals.length) continue

    let pos = 0, neg = 0
    periodJournals.forEach(j => {
      extractWords(j.content).forEach(w => {
        if (POSITIVE.has(w)) pos++
        if (NEGATIVE.has(w)) neg++
      })
    })

    sentimentPeriods.push({
      label:   periodLabel(periodStart, periodEnd),
      score:   pos - neg,
      entries: periodJournals.length,
    })
  }

  let sentimentTrend: PatternsContext['sentimentTrend'] = 'insufficient'
  if (sentimentPeriods.length >= 2) {
    const recent = sentimentPeriods[0].score
    const older  = sentimentPeriods[sentimentPeriods.length - 1].score
    const diff   = recent - older
    sentimentTrend = diff > 4 ? 'improving' : diff < -4 ? 'declining' : 'stable'
  }

  return {
    checkinCount:    checkinArr.length,
    journalCount:    journalArr.length,
    dayRange:        90,
    energyByDay,
    bestDay,
    worstDay,
    overallAvgEnergy,
    dayOfWeekStats,
    habitEnergyCorrs,
    habitChains:     topChains,
    sentimentPeriods,
    sentimentTrend,
    topPositiveWords,
    topNegativeWords,
  }
}

/* ── FORMAT FOR AI PROMPT ─────────────────────────────────── */

export function formatPatternsForPrompt(ctx: PatternsContext): string {
  const lines: string[] = []

  lines.push(`DATA WINDOW: ${ctx.checkinCount} check-ins · ${ctx.journalCount} journal entries · last 90 days`)
  lines.push('')

  // Energy by day
  if (Object.keys(ctx.energyByDay).length >= 3) {
    lines.push('ENERGY BY DAY OF WEEK:')
    const sorted = Object.entries(ctx.energyByDay).sort((a, b) => b[1] - a[1])
    sorted.forEach(([d, e]) => {
      const bar = '█'.repeat(Math.round(e)) + '░'.repeat(10 - Math.round(e))
      lines.push(`  ${d}: ${e}/10 [${bar}]`)
    })
    if (ctx.bestDay)  lines.push(`  → Peak: ${ctx.bestDay}`)
    if (ctx.worstDay) lines.push(`  → Lowest: ${ctx.worstDay}`)
    lines.push('')
  }

  // Habit × energy
  if (ctx.habitEnergyCorrs.length > 0) {
    lines.push('HABIT × ENERGY CORRELATIONS (days logged vs not logged):')
    ctx.habitEnergyCorrs.slice(0, 5).forEach(h => {
      const sign = h.diffPct > 0 ? '+' : ''
      lines.push(`  ${h.emoji} ${h.name}: avg ${h.avgWith}/10 (logged, n=${h.daysWith}) vs ${h.avgWithout}/10 (not logged) → ${sign}${h.diffPct}%`)
    })
    lines.push('')
  }

  // Habit chains
  if (ctx.habitChains.length > 0) {
    lines.push('HABIT COMBINATIONS → HIGH ENERGY DAYS:')
    ctx.habitChains.forEach(c => {
      lines.push(`  ${c.emojiA} ${c.nameA} + ${c.emojiB} ${c.nameB}: avg energy ${c.avgEnergy}/10 on ${c.days} co-occurrence days (baseline ${c.baseline}/10)`)
    })
    lines.push('')
  }

  // Sentiment
  if (ctx.sentimentPeriods.length >= 2) {
    lines.push(`JOURNAL SENTIMENT DRIFT (positive words − negative words):`)
    ctx.sentimentPeriods.forEach(p => {
      const sign = p.score > 0 ? '+' : ''
      lines.push(`  ${p.label}: ${sign}${p.score} (${p.entries} entries)`)
    })
    lines.push(`  → Trend: ${ctx.sentimentTrend}`)
    if (ctx.topPositiveWords.length) lines.push(`  → Top positive words: ${ctx.topPositiveWords.join(', ')}`)
    if (ctx.topNegativeWords.length) lines.push(`  → Top negative words: ${ctx.topNegativeWords.join(', ')}`)
    lines.push('')
  }

  return lines.join('\n')
}
