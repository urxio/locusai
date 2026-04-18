import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readUserMemory, patchUserMemory } from '@/lib/ai/memory'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { habitId, auditDate } = await req.json() as { habitId: string; auditDate: string }

  try {
    const memory     = (await readUserMemory(user.id)) ?? {}
    const dismissals = { ...((memory as { audit_dismissals?: Record<string, string[]> }).audit_dismissals ?? {}) }

    if (!dismissals[auditDate]) dismissals[auditDate] = []
    if (!dismissals[auditDate].includes(habitId)) dismissals[auditDate].push(habitId)

    // Keep only last 7 days to avoid unbounded growth
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    const cutoffStr = cutoff.toISOString().split('T')[0]
    for (const date of Object.keys(dismissals)) {
      if (date < cutoffStr) delete dismissals[date]
    }

    await patchUserMemory(user.id, { audit_dismissals: dismissals })
  } catch { /* non-fatal */ }

  return new Response('ok')
}
