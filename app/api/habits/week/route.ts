import { createClient } from '@/lib/supabase/server'
import { getUserHabitsWithLogs } from '@/lib/db/habits'
import { getUserLocalDate } from '@/lib/db/users'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Use user's local date — same source as logHabitAction on the habits page
  const today = await getUserLocalDate(user.id)

  // Cutoff = Monday of this week (at most 6 days back)
  const todayDate        = new Date(today + 'T12:00:00')
  const daysSinceMonday  = (todayDate.getDay() + 6) % 7
  const monday           = new Date(todayDate)
  monday.setDate(todayDate.getDate() - daysSinceMonday)
  const cutoffStr = monday.toISOString().split('T')[0]

  const habits = await getUserHabitsWithLogs(user.id)

  const payload = habits.map(h => ({
    id:           h.id,
    name:         h.name,
    emoji:        h.emoji,
    frequency:    h.frequency,
    days_of_week: h.days_of_week,
    streak:       h.streak,
    logs:         h.logs
      .filter(l => l.logged_date >= cutoffStr)
      .map(l => ({ logged_date: l.logged_date })),
  }))

  return Response.json(payload)
}
