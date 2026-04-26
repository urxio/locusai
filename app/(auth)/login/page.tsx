'use client'

export const dynamic = 'force-dynamic'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type View = 'login' | 'forgot' | 'forgot-code' | 'forgot-reset' | 'magic-sent'

const PHOTO = 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200&q=85'

/* ── Design tokens ─────────────────────────────────── */
const C = {
  bg:        '#0a0a0a',
  panel:     '#111111',
  white:     '#ffffff',
  offwhite:  'rgba(255,255,255,0.88)',
  muted:     'rgba(255,255,255,0.42)',
  subtle:    'rgba(255,255,255,0.18)',
  inputBg:   'rgba(255,255,255,0.06)',
  inputBdr:  'rgba(255,255,255,0.12)',
  inputFocus:'rgba(255,255,255,0.38)',
  border:    'rgba(255,255,255,0.10)',
  error:     '#ff6b6b',
  errorBg:   'rgba(255,107,107,0.10)',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px 16px',
  background: C.inputBg,
  border: `1px solid ${C.inputBdr}`,
  borderRadius: '10px',
  color: C.white,
  fontSize: '14px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  transition: 'border-color 0.18s',
}

const btnPrimary: React.CSSProperties = {
  width: '100%',
  padding: '14px',
  background: C.white,
  color: '#0a0a0a',
  border: 'none',
  borderRadius: '10px',
  fontSize: '14px',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
  letterSpacing: '-0.01em',
  transition: 'opacity 0.15s',
}

const btnSocial: React.CSSProperties = {
  flex: 1,
  padding: '12px 16px',
  background: C.inputBg,
  border: `1px solid ${C.inputBdr}`,
  borderRadius: '10px',
  color: C.offwhite,
  fontSize: '13.5px',
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  fontFamily: 'inherit',
  transition: 'background 0.15s, border-color 0.15s',
}

/* ── Icons ─────────────────────────────────────────── */
function LogoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="white">
      <circle cx="8" cy="8" r="3"/>
      <circle cx="8" cy="2" r="1.2"/>
      <circle cx="8" cy="14" r="1.2"/>
      <circle cx="2" cy="8" r="1.2"/>
      <circle cx="14" cy="8" r="1.2"/>
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.32.07 2.24.72 3.01.76 1.15-.24 2.24-.93 3.42-.84 1.45.12 2.54.7 3.27 1.78-2.96 1.77-2.27 5.66.45 6.74-.55 1.47-1.28 2.93-2.15 4.44zM12.03 7.25c-.14-2.47 1.86-4.52 4.22-4.73.35 2.82-2.56 4.96-4.22 4.73z"/>
    </svg>
  )
}

/* ── DarkInput helper ───────────────────────────────── */
function DarkInput({
  type, placeholder, value, onChange, autoFocus,
}: {
  type: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  autoFocus?: boolean
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      autoFocus={autoFocus}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...inputStyle,
        borderColor: focused ? C.inputFocus : C.inputBdr,
      }}
    />
  )
}

/* ── Main page ─────────────────────────────────────── */
export default function LoginPage() {
  const [view,     setView]     = useState<View>('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [code,     setCode]     = useState('')
  const [newPass,  setNewPass]  = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [keepMe,   setKeepMe]   = useState(true)

  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  function resetError() { setError(null) }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); resetError()
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError('Incorrect email or password.')
      } else if (!data?.session) {
        setError('Sign-in failed. Please try again.')
      } else {
        window.location.href = '/brief'
      }
    } catch {
      setError('Something went wrong. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleMagicLink() {
    if (!email) { setError('Enter your email first.'); return }
    setLoading(true); resetError()
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) setError(error.message || 'Failed to send magic link.')
      else setView('magic-sent')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function handleApple() {
    await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); resetError()
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      })
      if (error) {
        const msg = error.message.toLowerCase()
        if (msg.includes('user not found') || msg.includes('no user')) {
          setError('No account found with that email.')
        } else {
          setError(error.message || 'Failed to send code.')
        }
      } else {
        setCode(''); setView('forgot-code')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); resetError()
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' })
      if (error) {
        setError('Invalid or expired code. Please request a new one.')
      } else {
        setNewPass(''); setConfirm(''); setView('forgot-reset')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPass !== confirm) { setError('Passwords do not match.'); return }
    if (newPass.length < 8)  { setError('Password must be at least 8 characters.'); return }
    setLoading(true); resetError()
    try {
      const { error } = await supabase.auth.updateUser({ password: newPass })
      if (error) setError(error.message || 'Failed to update password.')
      else window.location.href = '/brief'
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: C.bg,
      fontFamily: "'DM Sans', -apple-system, sans-serif",
    }}>

      {/* ── Left: form panel ── */}
      <div style={{
        width: 'clamp(360px, 44%, 520px)',
        flexShrink: 0,
        background: C.panel,
        display: 'flex',
        flexDirection: 'column',
        padding: 'clamp(36px, 5vh, 56px) clamp(36px, 5vw, 64px)',
        overflowY: 'auto',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'clamp(48px, 8vh, 80px)' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.10)',
            border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <LogoIcon />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.white, letterSpacing: '-0.01em', lineHeight: 1 }}>Locus</div>
            <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.16em', color: C.muted, marginTop: '2px' }}>Life OS</div>
          </div>
        </div>

        {/* ── Magic link sent ── */}
        {view === 'magic-sent' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '20px' }}>📬</div>
            <h1 style={{ fontSize: '30px', fontWeight: 700, color: C.white, margin: '0 0 12px', letterSpacing: '-0.025em' }}>
              Check your inbox
            </h1>
            <p style={{ fontSize: '15px', color: C.muted, lineHeight: 1.6, margin: '0 0 32px' }}>
              We sent a magic link to <strong style={{ color: C.offwhite }}>{email}</strong>. Click it to sign in.
            </p>
            <button onClick={() => setView('login')} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit', padding: 0, textAlign: 'left', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
              ← Back to sign in
            </button>
          </div>
        )}

        {/* ── Forgot: enter email ── */}
        {view === 'forgot' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h1 style={{ fontSize: '30px', fontWeight: 700, color: C.white, margin: '0 0 10px', letterSpacing: '-0.025em' }}>
              Reset password
            </h1>
            <p style={{ fontSize: '15px', color: C.muted, lineHeight: 1.6, margin: '0 0 32px' }}>
              Enter your email and we&apos;ll send a 6-digit code.
            </p>
            <form onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <DarkInput type="email" placeholder="Enter email" value={email} onChange={setEmail} autoFocus />
              {error && <ErrorBox msg={error} />}
              <button type="submit" disabled={loading} style={btnPrimary}>{loading ? 'Sending…' : 'Send code →'}</button>
            </form>
            <button onClick={() => { setView('login'); resetError() }} style={{ marginTop: '20px', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', padding: 0, textAlign: 'left' }}>
              ← Back to sign in
            </button>
          </div>
        )}

        {/* ── Forgot: enter code ── */}
        {view === 'forgot-code' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h1 style={{ fontSize: '30px', fontWeight: 700, color: C.white, margin: '0 0 10px', letterSpacing: '-0.025em' }}>
              Enter your code
            </h1>
            <p style={{ fontSize: '15px', color: C.muted, lineHeight: 1.6, margin: '0 0 32px' }}>
              We sent a 6-digit code to <strong style={{ color: C.offwhite }}>{email}</strong>
            </p>
            <form onSubmit={handleVerifyCode} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="text" inputMode="numeric" placeholder="000000"
                value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                required autoFocus
                style={{ ...inputStyle, fontSize: '26px', letterSpacing: '0.35em', textAlign: 'center', paddingLeft: '14px' }}
              />
              {error && <ErrorBox msg={error} />}
              <button type="submit" disabled={loading || code.length < 6} style={{ ...btnPrimary, opacity: code.length < 6 ? 0.4 : 1 }}>
                {loading ? 'Verifying…' : 'Sign in →'}
              </button>
            </form>
            <button onClick={() => { setView('forgot'); resetError(); setCode('') }} style={{ marginTop: '20px', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', padding: 0, textAlign: 'left' }}>
              ← Resend code
            </button>
          </div>
        )}

        {/* ── Forgot: set new password ── */}
        {view === 'forgot-reset' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h1 style={{ fontSize: '30px', fontWeight: 700, color: C.white, margin: '0 0 10px', letterSpacing: '-0.025em' }}>
              New password
            </h1>
            <p style={{ fontSize: '15px', color: C.muted, lineHeight: 1.6, margin: '0 0 32px' }}>
              Choose a new password for your account.
            </p>
            <form onSubmit={handleSetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <DarkInput type="password" placeholder="New password (min 8 chars)" value={newPass} onChange={setNewPass} autoFocus />
              <DarkInput type="password" placeholder="Confirm password" value={confirm} onChange={setConfirm} />
              {error && <ErrorBox msg={error} />}
              <button type="submit" disabled={loading} style={{ ...btnPrimary, marginTop: '4px' }}>{loading ? 'Saving…' : 'Update password →'}</button>
            </form>
          </div>
        )}

        {/* ── Main login ── */}
        {view === 'login' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

            {/* Heading */}
            <div style={{ marginBottom: '36px' }}>
              <h1 style={{
                fontSize: 'clamp(28px, 3.5vw, 38px)',
                fontWeight: 700,
                color: C.white,
                margin: '0 0 10px',
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
              }}>
                Welcome back.
              </h1>
              <p style={{ fontSize: '14.5px', color: C.muted, lineHeight: 1.65, margin: 0 }}>
                Sign in to your Locus account to continue.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <DarkInput type="email" placeholder="Enter Email" value={email} onChange={setEmail} />
              <DarkInput type="password" placeholder="Create Password" value={password} onChange={setPassword} />

              {/* Keep me signed in */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none', marginTop: '2px' }}>
                <div
                  onClick={() => setKeepMe(v => !v)}
                  style={{
                    width: '17px', height: '17px', borderRadius: '5px', flexShrink: 0,
                    background: keepMe ? 'rgba(255,255,255,0.88)' : 'transparent',
                    border: `1.5px solid ${keepMe ? 'rgba(255,255,255,0.88)' : C.inputBdr}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s', cursor: 'pointer',
                  }}
                >
                  {keepMe && (
                    <svg width="9" height="7" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="#0a0a0a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span style={{ fontSize: '13.5px', color: C.muted }}>I Agree To The Terms &amp; Privacy Policy</span>
              </label>

              {error && <ErrorBox msg={error} />}

              <button
                type="submit"
                disabled={loading}
                style={{ ...btnPrimary, marginTop: '8px' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.90' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            {/* OR divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '22px 0' }}>
              <div style={{ flex: 1, height: '1px', background: C.border }} />
              <span style={{ fontSize: '12px', color: C.muted, letterSpacing: '0.06em' }}>or sign in via</span>
              <div style={{ flex: 1, height: '1px', background: C.border }} />
            </div>

            {/* Social buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleGoogle}
                style={btnSocial}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.10)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = C.inputBg }}
              >
                <GoogleIcon /> Google
              </button>
              <button
                onClick={handleApple}
                style={btnSocial}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.10)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = C.inputBg }}
              >
                <AppleIcon /> Apple
              </button>
            </div>

            {/* Forgot password */}
            <div style={{ marginTop: '18px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => { setView('forgot'); resetError() }}
                style={{ background: 'none', border: 'none', color: C.muted, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', padding: 0, textDecoration: 'underline', textUnderlineOffset: '3px' }}
              >
                Forgot password?
              </button>
            </div>

            {/* Create account */}
            <p style={{ marginTop: '28px', fontSize: '14px', color: C.muted, textAlign: 'center' }}>
              Don&apos;t have an account?{' '}
              <Link href="/signup" style={{ color: C.white, fontWeight: 600, textDecoration: 'none' }}>
                Sign up
              </Link>
            </p>
          </div>
        )}
      </div>

      {/* ── Right: photo panel ── */}
      <div style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        display: 'none',
        borderRadius: '0 20px 20px 0',
        margin: '12px 12px 12px 0',
      }} className="auth-photo-panel">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={PHOTO}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }}
        />
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.10) 50%, transparent 100%)',
          borderRadius: '16px',
        }} />
        {/* Subtle vignette border */}
        <div style={{
          position: 'absolute', inset: 0,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
          borderRadius: '16px',
        }} />
      </div>

      <style>{`
        @media (min-width: 860px) {
          .auth-photo-panel { display: block !important; }
        }
        input::placeholder { color: rgba(255,255,255,0.30); }
      `}</style>
    </div>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{
      fontSize: '13px',
      color: C.error,
      padding: '10px 14px',
      background: C.errorBg,
      borderRadius: '8px',
      border: '1px solid rgba(255,107,107,0.20)',
      lineHeight: 1.5,
    }}>
      {msg}
    </div>
  )
}
