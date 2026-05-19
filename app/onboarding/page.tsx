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
    <div style={{ minHeight: '100vh', background: '#0d0c0b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      {/* Orb background — matches landing page */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: '65vw', height: '65vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,0.28) 0%, transparent 60%)', filter: 'blur(70px)' }} />
        <div style={{ position: 'absolute', top: '5%', right: '-12%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(90,120,160,0.15) 0%, transparent 60%)', filter: 'blur(90px)' }} />
        <div style={{ position: 'absolute', top: '50%', left: '25%', width: '55vw', height: '55vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,0.20) 0%, transparent 60%)', filter: 'blur(75px)' }} />
        <div style={{ position: 'absolute', top: '70%', left: '-5%', width: '40vw', height: '40vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(90,158,122,0.12) 0%, transparent 60%)', filter: 'blur(90px)' }} />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <OnboardingFlow userName={userName} isRedo={isRedo} />
      </div>
    </div>
  )
}
