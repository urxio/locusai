/**
 * Seed script for development data.
 * Run with: npx ts-node --project tsconfig.json scripts/seed.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env.
 * Uses service role key to bypass RLS.
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const USER_EMAIL = process.env.SEED_USER_EMAIL!

async function seed() {
  console.log('🌱 Seeding development data...')

  // Get user id
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users.find(u => u.email === USER_EMAIL)
  if (!user) { console.error(`User ${USER_EMAIL} not found. Create the account first.`); process.exit(1) }
  const userId = user.id
  console.log(`Found user: ${user.email} (${userId})`)

  // Upsert profile
  await supabase.from('users').upsert({ id: userId, name: 'Boris', timezone: 'America/New_York', onboarded_at: new Date().toISOString() })

  // Goals
  const goals = [
    { user_id: userId, title: 'Ship Locus v1 to 100 beta users', category: 'product', timeframe: 'quarter', target_date: '2026-04-30', progress_pct: 62, next_action: 'Complete onboarding prototype and send to 5 testers', status: 'active' },
    { user_id: userId, title: 'Run 3× per week consistently', category: 'health', timeframe: 'quarter', target_date: null, progress_pct: 44, next_action: "Today's run — keep this week from falling behind", status: 'active' },
    { user_id: userId, title: 'Read 8 books on product & design', category: 'learning', timeframe: 'quarter', target_date: null, progress_pct: 37, next_action: 'Finish ch.7 of "The Design of Everyday Things"', status: 'active' },
    { user_id: userId, title: 'Build a product with $1k MRR', category: 'financial', timeframe: 'year', target_date: '2026-12-31', progress_pct: 12, next_action: 'Validate Locus pricing model with 3 potential customers', status: 'active' },
    { user_id: userId, title: 'Reach a 7.5 average daily wellbeing score', category: 'wellbeing', timeframe: 'year', target_date: null, progress_pct: 71, next_action: 'Current 3-month avg: 7.1 · up from 6.4 in Jan', status: 'active' },
  ]
  const { error: goalsError } = await supabase.from('goals').insert(goals)
  if (goalsError) console.error('Goals error:', goalsError)
  else console.log(`✓ Inserted ${goals.length} goals`)

  // Habits
  const habits = [
    { user_id: userId, name: 'Morning pages', emoji: '🌅', frequency: 'daily', target_count: 7 },
    { user_id: userId, name: 'Run', emoji: '🏃', frequency: '3x_week', target_count: 3 },
    { user_id: userId, name: 'Reading', emoji: '📖', frequency: 'daily', target_count: 7 },
    { user_id: userId, name: 'Meditation', emoji: '🧘', frequency: 'daily', target_count: 7 },
  ]
  const { data: insertedHabits, error: habitsError } = await supabase.from('habits').insert(habits).select()
  if (habitsError) console.error('Habits error:', habitsError)
  else console.log(`✓ Inserted ${habits.length} habits`)

  // Check-ins (last 7 days)
  const energyLevels = [8, 9, 7, 6, 4, 7, 7]
  const checkins = energyLevels.map((energy, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    return {
      user_id: userId,
      energy_level: energy,
      mood_note: i === 0 ? 'Feeling focused and clear-headed today.' : null,
      blockers: i === 4 ? ['Too many meetings', 'Low energy'] : [],
      date: d.toISOString().split('T')[0],
      checked_in_at: d.toISOString(),
    }
  })
  const { error: checkinsError } = await supabase.from('check_ins').insert(checkins)
  if (checkinsError) console.error('Check-ins error:', checkinsError)
  else console.log(`✓ Inserted ${checkins.length} check-ins`)

  // Habit logs (last 7 days)
  if (insertedHabits) {
    const logs: { habit_id: string; user_id: string; logged_date: string }[] = []
    const completionPattern: Record<string, boolean[]> = {
      [insertedHabits[0].id]: [true, true, true, true, false, true, true],  // morning pages 6/7
      [insertedHabits[1].id]: [true, false, false, true, false, false, false], // run 2/3
      [insertedHabits[2].id]: [true, true, true, true, true, false, true],   // reading 6/7
      [insertedHabits[3].id]: [true, true, false, true, false, true, true],  // meditation 5/7
    }
    for (const [habitId, pattern] of Object.entries(completionPattern)) {
      pattern.forEach((done, i) => {
        if (done) {
          const d = new Date(); d.setDate(d.getDate() - (6 - i))
          logs.push({ habit_id: habitId, user_id: userId, logged_date: d.toISOString().split('T')[0] })
        }
      })
    }
    const { error: logsError } = await supabase.from('habit_logs').insert(logs)
    if (logsError) console.error('Habit logs error:', logsError)
    else console.log(`✓ Inserted ${logs.length} habit logs`)
  }

  console.log('\n✅ Seed complete!')
}

seed().catch(console.error)
