import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWeeklyPlan } from '@/lib/db/planner'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const weekStart = searchParams.get('weekStart')
  if (!weekStart) {
    return NextResponse.json({ error: 'weekStart query param required' }, { status: 400 })
  }

  const blocks = await getWeeklyPlan(user.id, weekStart)
  return NextResponse.json(blocks)
}
