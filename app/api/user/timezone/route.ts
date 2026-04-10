import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Validate the timezone string is a real IANA zone
function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { timezone } = body

  if (!timezone || typeof timezone !== 'string' || !isValidTimezone(timezone)) {
    return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 })
  }

  await supabase
    .from('users')
    .update({ timezone })
    .eq('id', user.id)

  return NextResponse.json({ ok: true })
}
