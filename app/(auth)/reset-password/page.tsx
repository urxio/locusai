'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Stage = 'exchanging' | 'ready' | 'done' | 'error'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  )
}

function ResetPasswordInner() {
  const searchParams  = useSearchParams()
  const [stage,       setStage]     = useState<Stage>('exchanging')
  const [password,    setPassword]  = useState('')
  const [confirm,     setConfirm]   = useState('')
  const [loading,     setLoading]   = useState(false)
  const [error,       setError]     = useState<string | null>(null)
  const supabase = createClient()

  /* ── Exchange the code / token that Supabase puts in the URL ── */
  useEffect(() => {
    // Implicit flow: Supabase fires PASSWORD_RECOVERY via the hash fragment
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStage('ready')
      }
    })

    async function exchange() {
      const code       = searchParams.get('code')
      const tokenHash  = searchParams.get('token_hash')
      const type       = searchParams.get('type')

      // PKCE flow — code in URL, verifier in cookie (same browser session)
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) { setError(error.message); setStage('error'); return }
        setStage('ready')
        return
      }

      // token_hash flow (older Supabase email templates)
      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as 'recovery' | 'email' | 'magiclink',
        })
        if (error) { setError(error.message); setStage('error'); return }
        setStage('ready')
        return
      }

      // No query params — may be implicit flow (hash handled by onAuthStateChange above)
      // Wait up to 3s for the PASSWORD_RECOVERY event before giving up
      setTimeout(() => {
        setStage(s => s === 'exchanging' ? 'error' : s)
        setError(e => e ?? 'Invalid or expired reset link. Please request a new one.')
      }, 3000)
    }

    exchange()
    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setStage('done')
    setTimeout(() => { window.location.href = '/brief' }, 1800)
  }

  const inputStyle: React.CSSProperties = {
    padding: '10px 14px', background: 'var(--bg-2)', border: '1px solid var(--border-md)',
    borderRadius: '8px', color: 'var(--text-0)', fontSize: '13.5px', outline: 'none', fontFamily: 'inherit',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-0)', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--gold) 0%, #a07830 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: '0 2px 20px rgba(212,168,83,0.3)' }}>
            <svg width="22" height="22" viewBox="0 0 16 16" fill="#131110"><circle cx="8" cy="8" r="3"/><circle cx="8" cy="2" r="1.2"/><circle cx="8" cy="14" r="1.2"/><circle cx="2" cy="8" r="1.2"/><circle cx="14" cy="8" r="1.2"/></svg>
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '28px', fontWeight: 400, color: 'var(--text-0)' }}>Locus</div>
          <div style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '4px' }}>Choose a new password</div>
        </div>

        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-md)', borderRadius: '16px', padding: '28px' }}>

          {/* Exchanging / loading */}
          {stage === 'exchanging' && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-2)', fontSize: '13px' }}>
              Verifying link…
            </div>
          )}

          {/* Error state */}
          {stage === 'error' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', color: 'var(--text-0)', marginBottom: '8px' }}>Link expired</div>
              <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5, marginBottom: '20px' }}>{error}</div>
              <button
                onClick={() => { window.location.href = '/login' }}
                style={{ padding: '10px 20px', background: 'var(--gold)', color: '#131110', border: 'none', borderRadius: '8px', fontSize: '13.5px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Back to sign in
              </button>
            </div>
          )}

          {/* Success state */}
          {stage === 'done' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>✓</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', color: 'var(--text-0)', marginBottom: '8px' }}>Password updated</div>
              <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>Redirecting you in…</div>
            </div>
          )}

          {/* Password form */}
          {stage === 'ready' && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="password"
                placeholder="New password (min 8 characters)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                autoFocus
                style={inputStyle}
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                style={inputStyle}
              />
              {error && (
                <div style={{ fontSize: '12px', color: '#e07060', padding: '8px 12px', background: 'rgba(200,80,60,0.1)', borderRadius: '6px' }}>
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                style={{ padding: '11px', background: 'var(--gold)', color: '#131110', border: 'none', borderRadius: '8px', fontSize: '13.5px', fontWeight: 700, cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit', marginTop: '4px' }}
              >
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}
