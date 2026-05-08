import { createClient } from '@/lib/supabase/server'
import type { Person, PersonGroup } from '@/lib/types'

export async function getPeople(userId: string): Promise<Person[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true })
  if (error) { console.error('getPeople:', error); return [] }
  return data ?? []
}

export async function upsertPersonByName(
  userId: string,
  name: string,
  updates: { notes?: string; last_mentioned_at?: string }
): Promise<void> {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('people')
    .select('id')
    .eq('user_id', userId)
    .ilike('name', name)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('people')
      .update(updates)
      .eq('id', existing.id)
  } else {
    await supabase.from('people').insert({
      user_id: userId,
      name,
      notes: updates.notes ?? null,
      last_mentioned_at: updates.last_mentioned_at ?? null,
      group: 'acquaintances',
    })
  }
}

export async function createPerson(
  userId: string,
  data: { name: string; group: PersonGroup; notes?: string }
): Promise<Person | null> {
  const supabase = await createClient()
  const { data: created, error } = await supabase
    .from('people')
    .insert({ user_id: userId, name: data.name, group: data.group, notes: data.notes ?? null })
    .select()
    .single()
  if (error) { console.error('createPerson:', error); return null }
  return created
}

export async function updatePerson(
  personId: string,
  updates: Partial<Pick<Person, 'name' | 'group' | 'notes' | 'want_catchup' | 'last_mentioned_at'>>
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('people').update(updates).eq('id', personId)
  if (error) console.error('updatePerson:', error)
}

export async function deletePerson(personId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('people').delete().eq('id', personId)
  if (error) console.error('deletePerson:', error)
}
