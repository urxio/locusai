import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { habitId, auditDate } = await req.json() as { habitId: string; auditDate: string }

  try {
    const { data: memRow } = await supabase
      .from('user_memory').select('data').eq('user_id', user.id).single()
    const mem = (memRow?.data ?? {}) as Record<string, unknown>

    const dismissals = (mem.audit_dismissals ?? {}) as Record<string, string[]>
    if (!dismissals[auditDate]) dismissals[auditDate] = []
    if (!dismissals[auditDate].includes(habitId)) {
      dismissals[auditDate].push(habitId)
    }

    // Keep only last 7 days to avoid unbounded growth
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    const cutoffStr = cutoff.toISOString().split('T')[0]
    for (const date of Object.keys(dismissals)) {
      if (date < cutoffStr) delete dismissals[date]
    }

    await supabase.from('user_memory').upsert(
      { user_id: user.id, data: { ...mem, audit_dismissals: dismissals } },
      { onConflict: 'user_id' }
    )
  } catch { /* non-fatal */ }

  return new Response('ok')
}
