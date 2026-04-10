import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import TimezoneSync from '@/components/layout/TimezoneSync'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, avatar_url, onboarded_at')
    .eq('id', user.id)
    .single()

  // New users haven't onboarded yet — send them to setup
  if (profile && !profile.onboarded_at) {
    redirect('/onboarding')
  }

  return (
    <div className="app-shell">
      <Sidebar
        userName={profile?.name ?? user.email?.split('@')[0] ?? 'You'}
        avatarUrl={profile?.avatar_url ?? null}
      />
      <main className="app-main">
        {children}
      </main>
      <BottomNav />
      <TimezoneSync />
    </div>
  )
}
