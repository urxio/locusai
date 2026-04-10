import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import TimezoneSync from '@/components/layout/TimezoneSync'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const [{ data: profile }, { count: overdueStepCount }] = await Promise.all([
    supabase
      .from('users')
      .select('name, avatar_url, onboarded_at')
      .eq('id', user.id)
      .single(),
    supabase
      .from('goal_steps')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('completed', false)
      .not('due_date', 'is', null)
      .lt('due_date', today),
  ])

  // New users haven't onboarded yet — send them to setup
  if (profile && !profile.onboarded_at) {
    redirect('/onboarding')
  }

  const overdueCount = overdueStepCount ?? 0

  return (
    <div className="app-shell">
      <Sidebar
        userName={profile?.name ?? user.email?.split('@')[0] ?? 'You'}
        avatarUrl={profile?.avatar_url ?? null}
        overdueStepCount={overdueCount}
      />
      <main className="app-main">
        {children}
      </main>
      <BottomNav overdueStepCount={overdueCount} />
      <TimezoneSync />
    </div>
  )
}
