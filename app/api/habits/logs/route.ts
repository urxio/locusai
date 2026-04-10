import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year  = parseInt(searchParams.get('year')  ?? '0')
  const month = parseInt(searchParams.get('month') ?? '0') // 1-based

  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 })
  }

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  // Last day of the month: day 0 of the next month
  const lastDay   = new Date(year, month, 0).getDate()
  const endDate   = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data: logs, error } = await supabase
    .from('habit_logs')
    .select('habit_id, logged_date')
    .eq('user_id', user.id)
    .gte('logged_date', startDate)
    .lte('logged_date', endDate)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Group by habitId
  const grouped = new Map<string, string[]>()
  ;(logs ?? []).forEach(l => {
    if (!grouped.has(l.habit_id)) grouped.set(l.habit_id, [])
    grouped.get(l.habit_id)!.push(l.logged_date)
  })

  return NextResponse.json(
    Array.from(grouped.entries()).map(([habitId, dates]) => ({ habitId, dates }))
  )
}
