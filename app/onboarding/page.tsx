import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingFlow from '@/components/onboarding/OnboardingFlow'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ redo?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, onboarded_at')
    .eq('id', user.id)
    .single()

  const params = await searchParams
  const isRedo = params.redo === 'true'

  // Already onboarded and not a redo → go to brief
  if (profile?.onboarded_at && !isRedo) {
    redirect('/brief')
  }

  const userName = profile?.name ?? user.email?.split('@')[0] ?? 'there'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-0)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <OnboardingFlow userName={userName} isRedo={isRedo} />
    </div>
  )
}
