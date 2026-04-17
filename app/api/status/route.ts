import { createClient } from '@/lib/supabase/server'
import { getTodayCheckin, getRecentCheckins } from '@/lib/db/checkins'
import { getUserHabitsWithLogs } from '@/lib/db/habits'
import { getActiveGoals } from '@/lib/db/goals'
import { getUserLocalDate } from '@/lib/db/users'

export const dynamic = 'force-dynamic'

function moodWord(note: string | null): string {
  if (!note) return '—'
  const cleaned = note.replace(/^(feeling|i('m| am|feel)\s+)/i, '').trim()
  const words   = cleaned.split(/[\s,;.]+/).filter(Boolean)
  return words.slice(0, 2).join(' ') || '—'
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const today = await getUserLocalDate(user.id)

  const [checkin, recentCheckins, habits, goals] = await Promise.all([
    getTodayCheckin(user.id, today),
    getRecentCheckins(user.id, 7),
    getUserHabitsWithLogs(user.id),
    getActiveGoals(user.id),
  ])

  const energy    = checkin?.energy_level ?? null
  const avgEnergy = recentCheckins.length
    ? Math.round((recentCheckins.reduce((s, c) => s + c.energy_level, 0) / recentCheckins.length) * 10) / 10
    : null

  const scheduledToday = habits.filter(h => h.isScheduledToday)
  const doneToday      = scheduledToday.filter(h => h.logs.some(l => l.logged_date === today))

  const active = goals.filter(g => g.status === 'active')
  const avgPct = active.length
    ? Math.round(active.reduce((s, g) => s + g.progress_pct, 0) / active.length)
    : null

  return Response.json({
    energy,
    avgEnergy,
    habitsDone:  doneToday.length,
    habitsTotal: scheduledToday.length,
    habitsAll:   habits.length,
    goalsActive: active.length,
    avgPct,
    mood:        moodWord(checkin?.mood_note ?? null),
    hasCheckin:  !!checkin,
  })
}
