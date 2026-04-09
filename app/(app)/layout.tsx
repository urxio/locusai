import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        userName={profile?.name ?? user.email?.split('@')[0] ?? 'You'}
        avatarUrl={profile?.avatar_url ?? null}
      />
      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', background: 'var(--bg-0)' }}>
        {children}
      </main>
    </div>
  )
}
