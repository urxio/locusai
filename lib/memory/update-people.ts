/**
 * updatePeopleMemory — extracts people the user mentions in journals & mood notes
 * using Claude Haiku, then stores a structured relationship map in user_memory.
 *
 * Throttled to once every 5 days. Requires 3+ journal entries or 10+ mood notes.
 * Non-fatal: never throws, never blocks the caller.
 */

import { createClient } from '@/lib/supabase/server'
import { readUserMemory } from '@/lib/ai/memory'
import { getAnthropicClient } from '@/lib/ai/client'
import type { PersonMemory } from '@/lib/ai/memory'

const THROTTLE_DAYS = 5
const MIN_JOURNALS  = 3

export async function updatePeopleMemory(userId: string): Promise<void> {
  try {
    const memory = await readUserMemory(userId)
    if (!memory) return

    // Throttle check
    const lastUpdated = memory.people_memory?.last_updated
    if (lastUpdated) {
      const daysSince = (Date.now() - new Date(lastUpdated).getTime()) / 86400000
      if (daysSince < THROTTLE_DAYS) return
    }

    const supabase = await createClient()

    // Fetch last 60 days of journals + mood notes
    const since60 = new Date()
    since60.setDate(since60.getDate() - 60)
    const sinceStr = since60.toISOString().split('T')[0]

    const [{ data: journals }, { data: checkins }] = await Promise.all([
      supabase
        .from('journal_entries')
        .select('date, content')
        .eq('user_id', userId)
        .gte('date', sinceStr)
        .order('date', { ascending: false })
        .limit(40),
      supabase
        .from('check_ins')
        .select('date, mood_note')
        .eq('user_id', userId)
        .gte('date', sinceStr)
        .not('mood_note', 'is', null)
        .order('date', { ascending: false })
        .limit(60),
    ])

    const journalEntries = (journals ?? []).filter(j => j.content?.trim().length > 20)
    const moodNotes      = (checkins ?? []).filter(c => c.mood_note?.trim().length > 5)

    // Need enough content to be meaningful
    if (journalEntries.length < MIN_JOURNALS && moodNotes.length < 10) return

    // Build a compact corpus for Claude
    const corpus: string[] = []

    journalEntries.slice(0, 25).forEach(j => {
      corpus.push(`[${j.date}] ${j.content.trim().slice(0, 500)}`)
    })
    moodNotes.slice(0, 30).forEach(c => {
      corpus.push(`[${c.date}] mood: ${c.mood_note!.trim()}`)
    })

    const prompt = `Analyze these personal journal entries and mood notes. Identify people this person mentions — by name (e.g. "Sarah", "John") or relationship label (e.g. "mom", "my boss", "my partner", "my sister"). For each person mentioned 2+ times, return a structured summary.

Entries (newest first):
${corpus.join('\n')}

Return ONLY a JSON array with this exact shape — no markdown, no explanation:
[
  {
    "name": "Sarah",
    "relationship": "friend",
    "mentions": 6,
    "last_mentioned": "YYYY-MM-DD",
    "sentiment": "positive",
    "context": "One sentence describing how this person typically appears — what situations, emotions, or themes they're associated with."
  }
]

Rules:
- "relationship" must be one of: friend | family | partner | colleague | manager | other
- "sentiment" must be one of: positive | negative | mixed | neutral
- Only include people mentioned 2+ times
- If a name could be multiple people, use the most common context
- "context" must be 1 concrete sentence about how they appear in this person's life — not generic
- Sort by mention count descending
- Max 8 people
- Return [] if no people qualify`

    const client = getAnthropicClient()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = response.content[0]?.type === 'text' ? response.content[0].text : ''

    let people: PersonMemory[] = []
    try {
      const match = raw.match(/\[[\s\S]*\]/)
      if (match) {
        const parsed = JSON.parse(match[0])
        if (Array.isArray(parsed)) {
          people = parsed.filter((p): p is PersonMemory =>
            typeof p.name === 'string' &&
            typeof p.relationship === 'string' &&
            typeof p.mentions === 'number' &&
            typeof p.sentiment === 'string' &&
            typeof p.context === 'string'
          ).slice(0, 8)
        }
      }
    } catch {
      return // parse failure — non-fatal
    }

    if (people.length === 0) return

    await supabase
      .from('user_memory')
      .update({
        data: {
          ...memory,
          people_memory: {
            people,
            last_updated: new Date().toISOString(),
          },
        },
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    console.log(`[memory:people] extracted ${people.length} people for user ${userId.slice(0, 8)}`)
  } catch (err) {
    console.error('[memory:update-people]', err)
  }
}
