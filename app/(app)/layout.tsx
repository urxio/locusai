import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import TimezoneSync from '@/components/layout/TimezoneSync'
import ToastShell from '@/components/ui/ToastShell'

const DEFAULT_BG = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&q=85'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const [{ data: profile }, { count: overdueStepCount }] = await Promise.all([
    supabase
      .from('users')
      .select('name, avatar_url, onboarded_at, cover_url')
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

  if (profile && !profile.onboarded_at) {
    redirect('/onboarding')
  }

  const overdueCount = overdueStepCount ?? 0
  const bgUrl = (profile as { cover_url?: string | null } | null)?.cover_url || DEFAULT_BG

  return (
    <ToastShell>
      {/* OS Landscape Background — visible in light mode (html bg covers it in dark) */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          backgroundImage: `url(${bgUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {/* Light mode gradient overlay */}
      <style>{`
        html[data-theme="light"] .os-overlay {
          background: linear-gradient(to bottom, rgba(255,255,255,0.06) 0%, transparent 50%, rgba(0,0,0,0.08) 100%);
        }
      `}</style>
      <div
        aria-hidden
        className="os-overlay"
        style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}
      />

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
    </ToastShell>
  )
}
