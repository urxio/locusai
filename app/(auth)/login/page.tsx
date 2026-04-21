'use client'

export const dynamic = 'force-dynamic'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type View = 'login' | 'forgot' | 'forgot-code' | 'forgot-reset' | 'magic-sent'

const PHOTO = 'https://images.unsplash.com/photo-1616047006789-b7af5afb8c20?w=1200&q=85'
const QUOTE = {
  label: 'A GENTLE REMINDER',
  text: '"The quieter you become, the more you can hear."',
  author: '— Ram Dass',
}

/* ── Shared styles ─────────────────────────────────── */
const C = {
  cream:   '#f5f0e8',
  white:   '#ffffff',
  ink:     '#1a1a18',
  ink2:    '#3d3d38',
  muted:   '#8a8880',
  border:  '#e4dfd6',
  sage:    '#6e9e91',
  error:   '#c94f3a',
  errorBg: 'rgba(201,79,58,0.08)',
}

const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px 11px 40px',
  background: '#faf8f4',
  border: `1px solid ${C.border}`,
  borderRadius: '10px',
  color: C.ink,
  fontSize: '14px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

const labelStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: C.muted,
  marginBottom: '6px',
  display: 'block',
}

const btnPrimary: React.CSSProperties = {
  width: '100%',
  padding: '13px',
  background: C.ink,
  color: '#fff',
  border: 'none',
  borderRadius: '12px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  letterSpacing: '-0.01em',
  transition: 'opacity 0.15s',
}

const btnSecondary: React.CSSProperties = {
  flex: 1,
  padding: '11px 16px',
  background: C.white,
  border: `1px solid ${C.border}`,
  borderRadius: '10px',
  color: C.ink2,
  fontSize: '13.5px',
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  fontFamily: 'inherit',
  transition: 'background 0.15s',
}

/* ── Icons ─────────────────────────────────────────── */
function EmailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="3"/><path d="m2 7 10 7 10-7"/>
    </svg>
  )
}
function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={C.ink}>
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.32.07 2.24.72 3.01.76 1.15-.24 2.24-.93 3.42-.84 1.45.12 2.54.7 3.27 1.78-2.96 1.77-2.27 5.66.45 6.74-.55 1.47-1.28 2.93-2.15 4.44zM12.03 7.25c-.14-2.47 1.86-4.52 4.22-4.73.35 2.82-2.56 4.96-4.22 4.73z"/>
    </svg>
  )
}

/* ── InputField helper ──────────────────────────────── */
function InputField({
  label, type, placeholder, value, onChange, icon, rightSlot, autoFocus,
}: {
  label: string
  type: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  icon: React.ReactNode
  rightSlot?: React.ReactNode
  autoFocus?: boolean
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <label style={labelStyle}>{label}</label>
        {rightSlot}
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          {icon}
        </div>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            ...inputBase,
            borderColor: focused ? '#a8b8b4' : C.border,
            boxShadow: focused ? '0 0 0 3px rgba(110,158,145,0.12)' : 'none',
          }}
        />
      </div>
    </div>
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
    <div style={{ minHeight: '100vh', display: 'flex', background: C.cream, fontFamily: 'inherit' }}>

      {/* ── Left: form panel ── */}
      <div style={{
        flex: '0 0 clamp(380px, 52%, 580px)',
        display: 'flex',
        flexDirection: 'column',
        padding: 'clamp(32px, 5vh, 52px) clamp(32px, 6vw, 72px)',
        overflowY: 'auto',
      }}>

        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'clamp(40px, 7vh, 72px)' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '50%',
            background: C.ink,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="white">
              <circle cx="8" cy="8" r="3"/><circle cx="8" cy="2" r="1.2"/><circle cx="8" cy="14" r="1.2"/>
              <circle cx="2" cy="8" r="1.2"/><circle cx="14" cy="8" r="1.2"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.01em', color: C.ink, lineHeight: 1.1 }}>Locus</div>
            <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.18em', color: C.muted, marginTop: '1px' }}>Life OS</div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </div>
        </div>

        {/* ── Magic link sent ── */}
        {view === 'magic-sent' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '20px' }}>📬</div>
            <h1 style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: '32px', fontWeight: 700, color: C.ink, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
              Check your inbox
            </h1>
            <p style={{ fontSize: '15px', color: C.muted, lineHeight: 1.6, margin: '0 0 32px' }}>
              We sent a magic link to <strong style={{ color: C.ink2 }}>{email}</strong>. Click it to sign in.
            </p>
            <button onClick={() => setView('login')} style={{ background: 'none', border: 'none', color: C.sage, cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit', padding: 0, textAlign: 'left', fontWeight: 600 }}>
              ← Back to sign in
            </button>
          </div>
        )}

        {/* ── Forgot: enter email ── */}
        {view === 'forgot' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h1 style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: '32px', fontWeight: 700, color: C.ink, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
              Reset password
            </h1>
            <p style={{ fontSize: '15px', color: C.muted, lineHeight: 1.6, margin: '0 0 32px' }}>
              Enter your email and we&apos;ll send a 6-digit code to sign in.
            </p>
            <form onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <InputField label="Email" type="email" placeholder="you@example.com" value={email} onChange={setEmail} icon={<EmailIcon />} autoFocus />
              {error && <ErrorBox msg={error} />}
              <button type="submit" disabled={loading} style={btnPrimary}>{loading ? 'Sending…' : 'Send code →'}</button>
            </form>
            <button onClick={() => { setView('login'); resetError() }} style={{ marginTop: '16px', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', padding: 0, textAlign: 'left' }}>
              ← Back to sign in
            </button>
          </div>
        )}

        {/* ── Forgot: enter code ── */}
        {view === 'forgot-code' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h1 style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: '32px', fontWeight: 700, color: C.ink, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
              Enter your code
            </h1>
            <p style={{ fontSize: '15px', color: C.muted, lineHeight: 1.6, margin: '0 0 32px' }}>
              We sent a 6-digit code to <strong style={{ color: C.ink2 }}>{email}</strong>
            </p>
            <form onSubmit={handleVerifyCode} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <input
                type="text" inputMode="numeric" placeholder="000000"
                value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                required autoFocus
                style={{ ...inputBase, paddingLeft: '14px', fontSize: '28px', letterSpacing: '0.35em', textAlign: 'center' }}
              />
              {error && <ErrorBox msg={error} />}
              <button type="submit" disabled={loading || code.length < 6} style={{ ...btnPrimary, opacity: code.length < 6 ? 0.4 : 1 }}>
                {loading ? 'Verifying…' : 'Sign in →'}
              </button>
            </form>
            <button onClick={() => { setView('forgot'); resetError(); setCode('') }} style={{ marginTop: '16px', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', padding: 0, textAlign: 'left' }}>
              ← Resend code
            </button>
          </div>
        )}

        {/* ── Forgot: set new password ── */}
        {view === 'forgot-reset' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h1 style={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: '32px', fontWeight: 700, color: C.ink, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
              New password
            </h1>
            <p style={{ fontSize: '15px', color: C.muted, lineHeight: 1.6, margin: '0 0 32px' }}>
              Choose a new password for your account.
            </p>
            <form onSubmit={handleSetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <InputField label="New password" type="password" placeholder="Min 8 characters" value={newPass} onChange={setNewPass} icon={<LockIcon />} autoFocus />
              <InputField label="Confirm password" type="password" placeholder="Repeat password" value={confirm} onChange={setConfirm} icon={<LockIcon />} />
              {error && <ErrorBox msg={error} />}
              <button type="submit" disabled={loading} style={btnPrimary}>{loading ? 'Saving…' : 'Update password →'}</button>
            </form>
          </div>
        )}

        {/* ── Main login ── */}
        {view === 'login' && (
          <>
            {/* Headline */}
            <div style={{ marginBottom: '32px' }}>
              <h1 style={{
                fontFamily: 'var(--font-serif, Georgia, serif)',
                fontSize: 'clamp(30px, 4vw, 44px)',
                fontWeight: 700,
                color: C.ink,
                margin: '0 0 12px',
                letterSpacing: '-0.025em',
                lineHeight: 1.1,
              }}>
                Welcome back.
              </h1>
              <p style={{ fontSize: '15px', color: C.muted, lineHeight: 1.65, margin: 0, maxWidth: '380px' }}>
                Step back into your rhythm. A quiet space for goals, habits, and the day ahead.
              </p>
            </div>

            {/* Card */}
            <div style={{
              background: C.white,
              borderRadius: '20px',
              padding: 'clamp(20px, 3vw, 28px)',
              boxShadow: '0 2px 24px rgba(60,50,30,0.08), 0 1px 4px rgba(60,50,30,0.04)',
              border: `1px solid ${C.border}`,
            }}>
              {/* Form */}
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <InputField
                  label="Email" type="email" placeholder="you@example.com"
                  value={email} onChange={setEmail} icon={<EmailIcon />}
                />
                <InputField
                  label="Password" type="password" placeholder="••••••••"
                  value={password} onChange={setPassword} icon={<LockIcon />}
                  rightSlot={
                    <button type="button" onClick={() => { setView('forgot'); resetError() }}
                      style={{ background: 'none', border: 'none', color: C.muted, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                      Forgot?
                    </button>
                  }
                />

                {/* Keep me signed in */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                  <div
                    onClick={() => setKeepMe(v => !v)}
                    style={{
                      width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
                      background: keepMe ? C.sage : 'transparent',
                      border: `1.5px solid ${keepMe ? C.sage : C.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s', cursor: 'pointer',
                    }}
                  >
                    {keepMe && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: '13.5px', color: C.ink2 }}>Keep me signed in</span>
                </label>

                {error && <ErrorBox msg={error} />}

                <button type="submit" disabled={loading}
                  style={btnPrimary}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.88' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
                >
                  {loading ? 'Signing in…' : 'Continue →'}
                </button>
              </form>

              {/* OR divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
                <div style={{ flex: 1, height: '1px', background: C.border }} />
                <span style={{ fontSize: '11px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: C.border }} />
              </div>

              {/* OAuth buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleGoogle} style={btnSecondary}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f9f6f1' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = C.white }}
                >
                  <GoogleIcon /> Google
                </button>
                <button onClick={handleApple} style={btnSecondary}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f9f6f1' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = C.white }}
                >
                  <AppleIcon /> Apple
                </button>
              </div>
            </div>

            {/* Magic link */}
            <button onClick={handleMagicLink} disabled={loading}
              style={{ marginTop: '14px', background: 'none', border: 'none', color: C.muted, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', padding: 0, textDecoration: 'underline', textUnderlineOffset: '3px' }}
            >
              Or sign in with a magic link
            </button>

            {/* Create account */}
            <p style={{ marginTop: '28px', fontSize: '14px', color: C.muted }}>
              New here?{' '}
              <Link href="/signup" style={{ color: C.ink, fontWeight: 600, textDecoration: 'none', borderBottom: `1px solid ${C.ink}`, paddingBottom: '1px' }}>
                Create an account
              </Link>
            </p>
          </>
        )}
      </div>

      {/* ── Right: photo panel ── */}
      <div style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        display: 'none',
      }} className="auth-photo-panel">
        {/* Photo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={PHOTO}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />

        {/* TODAY badge */}
        <div style={{
          position: 'absolute', top: '28px', left: '28px',
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: '999px',
          padding: '8px 18px',
          display: 'flex', alignItems: 'center', gap: '8px',
          fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em',
          color: '#333',
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: C.sage }} />
          TODAY
        </div>

        {/* Quote overlay */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(to top, rgba(10,8,4,0.72) 0%, rgba(10,8,4,0.3) 55%, transparent 100%)',
          padding: '80px 36px 36px',
        }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginBottom: '10px', fontWeight: 600 }}>
            {QUOTE.label}
          </div>
          <div style={{
            fontFamily: 'var(--font-serif, Georgia, serif)',
            fontSize: 'clamp(18px, 2.2vw, 26px)',
            fontWeight: 600,
            color: 'white',
            lineHeight: 1.4,
            marginBottom: '10px',
            letterSpacing: '-0.01em',
          }}>
            {QUOTE.text}
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
            {QUOTE.author}
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 860px) {
          .auth-photo-panel { display: block !important; }
        }
      `}</style>
    </div>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{
      fontSize: '13px', color: C.error,
      padding: '10px 14px',
      background: C.errorBg,
      borderRadius: '8px',
      border: `1px solid rgba(201,79,58,0.15)`,
      lineHeight: 1.5,
    }}>
      {msg}
    </div>
  )
}
