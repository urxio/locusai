import { createClient } from '@/lib/supabase/server'
import { getUserHabitsWithLogs } from '@/lib/db/habits'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const habits = await getUserHabitsWithLogs(user.id)

  // Return only what HabitsWeekStrip needs — keep payload small
  const payload = habits.map(h => ({
    id:          h.id,
    name:        h.name,
    emoji:       h.emoji,
    frequency:   h.frequency,
    days_of_week: h.days_of_week,
    streak:      h.streak,
    // Only send logs from the past 7 days
    logs:        h.logs
      .filter(l => {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - 6)
        return l.logged_date >= cutoff.toISOString().split('T')[0]
      })
      .map(l => ({ logged_date: l.logged_date })),
  }))

  return Response.json(payload)
}
