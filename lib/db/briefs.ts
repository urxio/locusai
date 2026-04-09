import { createClient } from '@/lib/supabase/server'
import type { Brief } from '@/lib/types'

export async function getTodayBrief(userId: string): Promise<Brief | null> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('briefs')
    .select('*')
    .eq('user_id', userId)
    .eq('brief_date', today)
    .eq('stale', false)
    .single()
  if (error) return null
  return data
}

export async function storeBrief(userId: string, brief: Omit<Brief, 'id' | 'user_id' | 'generated_at' | 'stale'>): Promise<Brief | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('briefs')
    .upsert(
      { ...brief, user_id: userId, generated_at: new Date().toISOString(), stale: false },
      { onConflict: 'user_id,brief_date' }
    )
    .select()
    .single()
  if (error) { console.error('storeBrief:', error); return null }
  return data
}

export async function markBriefStale(userId: string): Promise<void> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const { error } = await supabase
    .from('briefs')
    .update({ stale: true })
    .eq('user_id', userId)
    .eq('brief_date', today)
  if (error) console.error('markBriefStale:', error)
}
