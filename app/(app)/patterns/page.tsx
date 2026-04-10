import { createClient } from '@/lib/supabase/server'
import { buildPatternsContext } from '@/lib/ai/patterns-context'
import { readUserMemory } from '@/lib/ai/memory'
import PatternsView from '@/components/patterns/PatternsView'

export const dynamic = 'force-dynamic'

export default async function PatternsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [ctx, memory] = await Promise.all([
    buildPatternsContext(user.id),
    readUserMemory(user.id),
  ])

  return (
    <PatternsView
      ctx={ctx}
      cachedNarratives={memory?.pattern_narratives ?? null}
      cachedGeneratedAt={memory?.pattern_generated_at ?? null}
    />
  )
}
