'use server'

import { createClient } from '@/lib/supabase/server'
import type { MemoryNote } from '@/lib/types'
import { revalidatePath } from 'next/cache'

export async function createMemoryNote(
  content: string,
  type: MemoryNote['type'],
  trigger_date: string | null,
  ai_tags: string[]
): Promise<MemoryNote | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('memory_notes')
    .insert({ user_id: user.id, content, type, trigger_date, ai_tags })
    .select()
    .single()

  if (error) { console.error('createMemoryNote:', error); return null }
  revalidatePath('/capture')
  return data
}

export async function resolveMemoryNote(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase
    .from('memory_notes')
    .update({ resolved: true })
    .eq('id', id)
    .eq('user_id', user.id)

  revalidatePath('/capture')
}

export async function deleteMemoryNote(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase
    .from('memory_notes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  revalidatePath('/capture')
}

export async function updateMemoryNoteTags(id: string, tags: string[]): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase
    .from('memory_notes')
    .update({ ai_tags: tags })
    .eq('id', id)
    .eq('user_id', user.id)

  revalidatePath('/capture')
}
