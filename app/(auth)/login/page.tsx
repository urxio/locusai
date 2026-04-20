'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type View = 'login' | 'forgot' | 'forgot-code' | 'forgot-reset' | 'magic-sent'

const LOGO = (
  <div style={{ textAlign: 'center', marginBottom: '40px' }}>
    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--gold) 0%, #a07830 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: '0 2px 20px rgba(212,168,83,0.3)' }}>
      <svg width="22" height="22" viewBox="0 0 16 16" fill="#131110"><circle cx="8" cy="8" r="3"/><circle cx="8" cy="2" r="1.2"/><circle cx="8" cy="14" r="1.2"/><circle cx="2" cy="8" r="1.2"/><circle cx="14" cy="8" r="1.2"/></svg>
    </div>
    <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '28px', fontWeight: 400, color: 'var(--text-0)' }}>Locus</div>
  </div>
)

export default function LoginPage() {
  const [view,     setView]     = useState<View>('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [code,      setCode]      = useState('')
  const [newPass,   setNewPass]   = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const supabase = createClient()

  function resetError() { setError(null) }

  /* ── Sign in with password ── */
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); resetError()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else window.location.href = '/brief'
    setLoading(false)
  }

  /* ── Magic link ── */
  async function handleMagicLink() {
    if (!email) { setError('Enter your email first.'); return }
    setLoading(true); resetError()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setError(error.message)
    else setView('magic-sent')
    setLoading(false)
  }

  /* ── Google OAuth ── */
  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  /* ── Forgot: send 6-digit OTP ── */
  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); resetError()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })
    if (error) setError(error.message)
    else { setCode(''); setView('forgot-code') }
    setLoading(false)
  }

  /* ── Forgot: verify 6-digit OTP → move to password reset ── */
  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); resetError()
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'email',
    })
    if (error) setError(error.message)
    else { setNewPass(''); setConfirm(''); setView('forgot-reset') }
    setLoading(false)
  }

  /* ── Forgot: set new password after OTP verified ── */
  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPass !== confirm) { setError('Passwords do not match.'); return }
    if (newPass.length < 8)  { setError('Password must be at least 8 characters.'); return }
    setLoading(true); resetError()
    const { error } = await supabase.auth.updateUser({ password: newPass })
    if (error) setError(error.message)
    else window.location.href = '/brief'
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    padding: '10px 14px', background: 'var(--bg-2)', border: '1px solid var(--border-md)',
    borderRadius: '8px', color: 'var(--text-0)', fontSize: '13.5px', outline: 'none', fontFamily: 'inherit',
  }
  const btnPrimary: React.CSSProperties = {
    padding: '11px', background: 'var(--gold)', color: '#131110', border: 'none',
    borderRadius: '8px', fontSize: '13.5px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-0)', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {LOGO}

        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-md)', borderRadius: '16px', padding: '28px' }}>

          {/* ── Magic link sent ── */}
          {view === 'magic-sent' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📬</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', color: 'var(--text-0)', marginBottom: '8px' }}>Check your inbox</div>
              <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5 }}>
                We sent a magic link to <strong style={{ color: 'var(--text-1)' }}>{email}</strong>
              </div>
              <button onClick={() => setView('login')} style={{ marginTop: '20px', background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
                ← Back to sign in
              </button>
            </div>
          )}

          {/* ── Enter email for code ── */}
          {view === 'forgot' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-0)', marginBottom: '6px' }}>Forgot your password?</div>
                <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5 }}>
                  Enter your email and we&apos;ll send you a 6-digit code to sign in.
                </div>
              </div>
              <form onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="email" placeholder="Email" value={email} required autoFocus
                  onChange={e => setEmail(e.target.value)}
                  style={inputStyle}
                />
                {error && <div style={{ fontSize: '12px', color: '#e07060', padding: '8px 12px', background: 'rgba(200,80,60,0.1)', borderRadius: '6px' }}>{error}</div>}
                <button type="submit" disabled={loading} style={btnPrimary}>
                  {loading ? 'Sending…' : 'Send code'}
                </button>
              </form>
              <button
                onClick={() => { setView('login'); resetError() }}
                style={{ width: '100%', marginTop: '10px', padding: '10px', background: 'transparent', border: 'none', color: 'var(--text-3)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                ← Back to sign in
              </button>
            </>
          )}

          {/* ── Enter 6-digit code ── */}
          {view === 'forgot-code' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-0)', marginBottom: '6px' }}>Enter your code</div>
                <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5 }}>
                  We sent a 6-digit code to <strong style={{ color: 'var(--text-1)' }}>{email}</strong>
                </div>
              </div>
              <form onSubmit={handleVerifyCode} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  required
                  autoFocus
                  style={{ ...inputStyle, fontSize: '24px', letterSpacing: '0.3em', textAlign: 'center' }}
                />
                {error && <div style={{ fontSize: '12px', color: '#e07060', padding: '8px 12px', background: 'rgba(200,80,60,0.1)', borderRadius: '6px' }}>{error}</div>}
                <button type="submit" disabled={loading || code.length < 6} style={{ ...btnPrimary, opacity: code.length < 6 ? 0.5 : 1 }}>
                  {loading ? 'Verifying…' : 'Sign in'}
                </button>
              </form>
              <button
                onClick={() => { setView('forgot'); resetError(); setCode('') }}
                style={{ width: '100%', marginTop: '10px', padding: '10px', background: 'transparent', border: 'none', color: 'var(--text-3)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                ← Resend code
              </button>
            </>
          )}

          {/* ── Set new password ── */}
          {view === 'forgot-reset' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-0)', marginBottom: '6px' }}>Set a new password</div>
                <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5 }}>
                  You&apos;re signed in. Choose a new password for your account.
                </div>
              </div>
              <form onSubmit={handleSetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="password" placeholder="New password (min 8 characters)" value={newPass}
                  onChange={e => setNewPass(e.target.value)} required minLength={8} autoFocus
                  style={inputStyle}
                />
                <input
                  type="password" placeholder="Confirm new password" value={confirm}
                  onChange={e => setConfirm(e.target.value)} required
                  style={inputStyle}
                />
                {error && <div style={{ fontSize: '12px', color: '#e07060', padding: '8px 12px', background: 'rgba(200,80,60,0.1)', borderRadius: '6px' }}>{error}</div>}
                <button type="submit" disabled={loading} style={btnPrimary}>
                  {loading ? 'Saving…' : 'Update password'}
                </button>
              </form>
            </>
          )}

          {/* ── Main login ── */}
          {view === 'login' && (
            <>
              <button onClick={handleGoogle} style={{ width: '100%', padding: '11px', background: 'var(--bg-2)', border: '1px solid var(--border-md)', borderRadius: '8px', color: 'var(--text-1)', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px', fontFamily: 'inherit' }}>
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}/>
                <span style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}/>
              </div>

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="email" placeholder="Email" value={email} required
                  onChange={e => setEmail(e.target.value)}
                  style={inputStyle}
                />
                <input
                  type="password" placeholder="Password" value={password} required
                  onChange={e => setPassword(e.target.value)}
                  style={inputStyle}
                />
                {error && <div style={{ fontSize: '12px', color: '#e07060', padding: '8px 12px', background: 'rgba(200,80,60,0.1)', borderRadius: '6px' }}>{error}</div>}
                <button type="submit" disabled={loading} style={btnPrimary}>
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', gap: '8px' }}>
                <button
                  onClick={handleMagicLink}
                  disabled={loading}
                  style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--border-md)', borderRadius: '8px', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Send magic link
                </button>
                <button
                  onClick={() => { setView('forgot'); resetError() }}
                  style={{ padding: '10px 14px', background: 'transparent', border: 'none', color: 'var(--text-3)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                >
                  Forgot password?
                </button>
              </div>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-3)' }}>
          No account?{' '}
          <Link href="/signup" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Create one</Link>
        </p>
      </div>
    </div>
  )
}
