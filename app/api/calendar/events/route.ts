import { createClient } from '@/lib/supabase/server'
import { getCalendarEventsForAI } from '@/lib/google/calendar'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 20

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const events = await getCalendarEventsForAI(user.id)
  return Response.json({ events })
}
