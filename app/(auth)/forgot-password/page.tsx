'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [sent,    setSent]    = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    if (error) setError(error.message)
    else setSent(true)
    setLoading(false)
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
          <div style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '4px' }}>Reset your password</div>
        </div>

        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-md)', borderRadius: '16px', padding: '28px' }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📬</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', color: 'var(--text-0)', marginBottom: '8px' }}>Check your inbox</div>
              <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6 }}>
                We sent a password reset link to{' '}
                <strong style={{ color: 'var(--text-1)' }}>{email}</strong>.
                <br />Click it to choose a new password.
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5 }}>
                Enter the email you signed up with and we&apos;ll send you a reset link.
              </p>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                style={{ padding: '10px 14px', background: 'var(--bg-2)', border: '1px solid var(--border-md)', borderRadius: '8px', color: 'var(--text-0)', fontSize: '13.5px', outline: 'none', fontFamily: 'inherit' }}
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
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-3)' }}>
          <Link href="/login" style={{ color: 'var(--gold)', textDecoration: 'none' }}>← Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
