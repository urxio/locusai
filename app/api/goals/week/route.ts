import { createClient } from '@/lib/supabase/server'
import { getActiveGoalsWithSteps } from '@/lib/db/goals'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const goals = await getActiveGoalsWithSteps(user.id)

  const payload = goals.map(g => ({
    id:           g.id,
    title:        g.title,
    category:     g.category,
    progress_pct: g.progress_pct,
    target_date:  g.target_date,
    timeframe:    g.timeframe,
    steps: g.steps.map(s => ({
      id:           s.id,
      title:        s.title,
      completed:    s.completed,
      due_date:     s.due_date,
    })),
  }))

  return Response.json(payload)
}
