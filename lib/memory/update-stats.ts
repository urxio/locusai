/**
 * updateMemoryStats — runs after every check-in.
 * Pure computation (no Claude call). Updates energy, blocker,
 * mood-theme, and habit-rate stats in the user_memory table.
 * Non-fatal: never throws, never blocks the check-in flow.
 */

import { createClient } from '@/lib/supabase/server'
import type { UserMemory } from '@/lib/ai/memory'

/* ── STOP WORDS for mood theme extraction ── */
const STOP_WORDS = new Set([
  'the','a','an','is','are','was','were','be','been','being',
  'have','has','had','do','does','did','will','would','could',
  'should','may','might','shall','can','to','of','in','for',
  'on','with','at','by','from','as','it','its','this','that',
  'these','those','my','your','his','her','our','their','we',
  'you','he','she','they','i','me','him','us','them','not',
  'but','and','or','so','if','about','bit','feeling','feel',
  'felt','like','just','very','quite','good','bad','today',
  'day','week','been','some','then','than','when','what','more',
  'also','still','really','going','little','much','well','here',
  'there','which','into','time','get','got','even','been','want',
  'need','work','make','said','know','think','come','back',
])

/* ── HELPERS ── */
function roundTo1(n: number): number {
  return Math.round(n * 10) / 10
}
function avg(nums: number[]): number {
  return nums.length === 0 ? 0 : roundTo1(nums.reduce((s, n) => s + n, 0) / nums.length)
}

/* ── MAIN ── */
export async function updateMemoryStats(userId: string): Promise<void> {
  try {
    const supabase = await createClient()

    // Fetch up to 90 days of check-ins
    const since = new Date()
    since.setDate(since.getDate() - 90)

    const { data: checkins } = await supabase
      .from('check_ins')
      .select('date, energy_level, mood_note, blockers')
      .eq('user_id', userId)
      .gte('date', since.toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (!checkins || checkins.length === 0) return

    /* ── ENERGY STATS ── */
    const overallAvg = avg(checkins.map(c => c.energy_level))
    const recent14   = checkins.slice(-14)
    const prior14    = checkins.slice(-28, -14)
    const recentAvg  = avg(recent14.map(c => c.energy_level))
    const priorAvg   = avg(prior14.map(c => c.energy_level))

    const trend: UserMemory['energy']['trend'] =
      prior14.length < 3 ? 'stable' :
      recentAvg - priorAvg > 0.5  ? 'improving' :
      recentAvg - priorAvg < -0.5 ? 'declining'  : 'stable'

    const DAY = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    const buckets: Record<string, number[]> = {}
    checkins.forEach(c => {
      const d = DAY[new Date(c.date + 'T12:00:00').getDay()]
      if (!buckets[d]) buckets[d] = []
      buckets[d].push(c.energy_level)
    })
    const byDay: Record<string, number> = {}
    Object.entries(buckets).forEach(([d, vals]) => {
      if (vals.length >= 2) byDay[d] = avg(vals)
    })
    const sorted = Object.entries(byDay).sort((a, b) => b[1] - a[1])
    const bestDay  = sorted[0]?.[0] ?? null
    const worstDay = sorted[sorted.length - 1]?.[0] ?? null

    /* ── BLOCKER FREQUENCY ── */
    const blockerFreq: Record<string, number> = {}
    checkins.forEach(c => {
      ;(c.blockers ?? []).forEach((b: string) => {
        if (b !== 'No blockers today') blockerFreq[b] = (blockerFreq[b] ?? 0) + 1
      })
    })
    const frequent = Object.entries(blockerFreq)
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([b]) => b)

    /* ── MOOD THEMES ── */
    const wordFreq: Record<string, number> = {}
    checkins.forEach(c => {
      if (!c.mood_note) return
      c.mood_note
        .toLowerCase()
        .replace(/[^a-z\s]/g, '')
        .split(/\s+/)
        .filter((w: string) => w.length > 4 && !STOP_WORDS.has(w))
        .forEach((w: string) => { wordFreq[w] = (wordFreq[w] ?? 0) + 1 })
    })
    const moodThemes = Object.entries(wordFreq)
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([word]) => word)

    /* ── HABIT RATES (last 30 days) ── */
    const thirtyAgo = new Date()
    thirtyAgo.setDate(thirtyAgo.getDate() - 30)
    const sinceDate = thirtyAgo.toISOString().split('T')[0]

    const [{ data: habits }, { data: logs }] = await Promise.all([
      supabase.from('habits').select('id, name, emoji, target_count').eq('user_id', userId),
      supabase.from('habit_logs').select('habit_id').eq('user_id', userId).gte('logged_date', sinceDate),
    ])

    const logCounts = new Map<string, number>()
    logs?.forEach(l => logCounts.set(l.habit_id, (logCounts.get(l.habit_id) ?? 0) + 1))

    const habitRates = (habits ?? []).map(h => {
      const done   = logCounts.get(h.id) ?? 0
      const target = Math.max(1, Math.round(h.target_count * (30 / 7)))
      const rate   = Math.min(100, Math.round((done / target) * 100))
      return { name: h.name, emoji: h.emoji, rate_pct: rate }
    })

    const strongest = habitRates
      .filter(h => h.rate_pct >= 65)
      .sort((a, b) => b.rate_pct - a.rate_pct)
      .slice(0, 3)
    const needsWork = habitRates
      .filter(h => h.rate_pct < 50)
      .sort((a, b) => a.rate_pct - b.rate_pct)
      .slice(0, 3)

    /* ── PRESERVE EXISTING INSIGHTS ── */
    const { data: existing } = await supabase
      .from('user_memory')
      .select('data')
      .eq('user_id', userId)
      .single()
    const prev = existing?.data as UserMemory | undefined

    /* ── WRITE ── */
    const memory: UserMemory = {
      energy: { overall_avg: overallAvg, recent_avg: recentAvg, trend, by_day: byDay, best_day: bestDay, worst_day: worstDay },
      habits: { strongest, needs_work: needsWork },
      blockers: { frequent, frequencies: blockerFreq },
      mood_themes: moodThemes,
      insights: prev?.insights ?? [],
      checkin_count: checkins.length,
      last_stats_update: new Date().toISOString(),
      last_insights_update: prev?.last_insights_update ?? null,
    }

    await supabase
      .from('user_memory')
      .upsert(
        { user_id: userId, data: memory, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
  } catch (err) {
    // Non-fatal — never block the check-in
    console.error('[memory:update-stats]', err)
  }
}
