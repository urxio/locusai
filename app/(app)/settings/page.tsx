import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsView from '@/components/settings/SettingsView'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileResult, calTokenResult] = await Promise.all([
    supabase.from('users').select('name, avatar_url, cover_url, timezone').eq('id', user.id).single(),
    supabase.from('google_calendar_tokens').select('user_id').eq('user_id', user.id).single(),
  ])

  const profile = profileResult.data

  return (
    <SettingsView
      name={profile?.name ?? ''}
      avatarUrl={profile?.avatar_url ?? null}
      coverUrl={profile?.cover_url ?? null}
      timezone={profile?.timezone ?? 'UTC'}
      email={user.email ?? ''}
      calendarConnected={!!calTokenResult.data}
    />
  )
}
