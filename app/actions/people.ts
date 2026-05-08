'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { PersonGroup } from '@/lib/types'

export async function createPersonAction(data: { name: string; group: PersonGroup; notes?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: created, error } = await supabase
    .from('people')
    .insert({ user_id: user.id, name: data.name.trim(), group: data.group, notes: data.notes?.trim() || null })
    .select()
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/network')
  return created
}

export async function updatePersonAction(
  personId: string,
  updates: { name?: string; group?: PersonGroup; notes?: string | null; want_catchup?: boolean }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const payload: Record<string, unknown> = {}
  if (updates.name !== undefined) payload.name = updates.name.trim()
  if (updates.group !== undefined) payload.group = updates.group
  if (updates.notes !== undefined) payload.notes = updates.notes?.trim() || null
  if (updates.want_catchup !== undefined) payload.want_catchup = updates.want_catchup

  const { error } = await supabase
    .from('people')
    .update(payload)
    .eq('id', personId)
    .eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/network')
}

export async function deletePersonAction(personId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('people')
    .delete()
    .eq('id', personId)
    .eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/network')
}
