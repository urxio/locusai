import { createClient } from '@/lib/supabase/server'
import type { WheelSnapshot } from '@/lib/types'

export async function getWheelSnapshots(userId: string): Promise<WheelSnapshot[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('wheel_of_life')
    .select('*')
    .eq('user_id', userId)
    .order('snapshot_date', { ascending: false })
    .limit(12)
  if (error) { console.error('getWheelSnapshots:', error); return [] }
  return data ?? []
}

export async function getTodayWheelSnapshot(userId: string, date: string): Promise<WheelSnapshot | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('wheel_of_life')
    .select('*')
    .eq('user_id', userId)
    .eq('snapshot_date', date)
    .single()
  if (error && error.code !== 'PGRST116') { console.error('getTodayWheelSnapshot:', error) }
  return data ?? null
}
