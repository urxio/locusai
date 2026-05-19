'use client'

import Link from 'next/link'

const PHOTO = '/wallpapers/locus-5.jpg'

const C = {
  white:    '#ffffff',
  offwhite: 'rgba(255,255,255,0.90)',
  muted:    'rgba(255,255,255,0.45)',
  green:    '#4ade80',
  greenBg:  'rgba(74,222,128,0.10)',
  greenBdr: 'rgba(74,222,128,0.20)',
}

export default function EmailConfirmedPage() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={PHOTO} alt="" style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.38)', zIndex: 1 }} />

      <div style={{
        position: 'relative', zIndex: 2,
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        fontFamily: "'DM Sans', -apple-system, sans-serif",
      }}>
        <div style={{
          width: '100%', maxWidth: '400px',
          background: 'rgba(14,12,10,0.82)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '36px 32px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.50)',
        }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="Jaune" width={34} height={34} style={{ borderRadius: '9px', display: 'block' }} />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: C.white, letterSpacing: '-0.01em', lineHeight: 1 }}>Jaune</div>
              <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.16em', color: C.muted, marginTop: '2px' }}>Life OS</div>
            </div>
          </div>

          {/* Checkmark */}
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%',
            background: C.greenBg, border: `1px solid ${C.greenBdr}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '20px',
          }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M4.5 11.5L9 16L17.5 7" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: 700, color: C.white, margin: '0 0 10px', letterSpacing: '-0.025em', lineHeight: 1.15 }}>
            Email confirmed
          </h1>
          <p style={{ fontSize: '14px', color: C.muted, lineHeight: 1.6, margin: '0 0 28px' }}>
            Your account is ready. Head to <strong style={{ color: C.offwhite }}>jaune.space</strong> and sign in to get started.
          </p>

          <Link
            href="/login"
            style={{
              display: 'block', width: '100%', padding: '13px',
              background: C.white, color: '#111',
              border: 'none', borderRadius: '10px',
              fontSize: '14px', fontWeight: 700,
              textAlign: 'center', textDecoration: 'none',
              fontFamily: 'inherit', letterSpacing: '-0.01em',
              boxSizing: 'border-box',
            }}
          >
            Sign in
          </Link>
        </div>
      </div>

      <style>{`* { box-sizing: border-box; }`}</style>
    </>
  )
}
