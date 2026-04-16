import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsView from '@/components/settings/SettingsView'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, avatar_url, cover_url, timezone')
    .eq('id', user.id)
    .single()

  return (
    <SettingsView
      name={profile?.name ?? ''}
      avatarUrl={profile?.avatar_url ?? null}
      coverUrl={profile?.cover_url ?? null}
      timezone={profile?.timezone ?? 'UTC'}
      email={user.email ?? ''}
    />
  )
}
