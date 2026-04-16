'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(name: string, avatarUrl: string | null, coverUrl: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase
    .from('users')
    .update({
      name: name.trim(),
      avatar_url: avatarUrl?.trim() || null,
      cover_url: coverUrl?.trim() || null,
    })
    .eq('id', user.id)

  revalidatePath('/settings')
  revalidatePath('/', 'layout')
}
