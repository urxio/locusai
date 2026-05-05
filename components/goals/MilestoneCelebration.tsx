'use client'

import { useEffect } from 'react'

export default function MilestoneCelebration({ goalTitle, milestone, onClose }: {
  goalTitle: string
  milestone: 25 | 50 | 75 | 100
  onClose: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3200)
    return () => clearTimeout(t)
  }, [onClose])

  const is100 = milestone === 100
  const SPARKS = ['✦', '✧', '★', '✦', '✧', '✦'] as const

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        background: is100 ? 'rgba(0,0,0,0.65)' : 'transparent',
        display: 'flex',
        alignItems: is100 ? 'center' : 'flex-end',
        justifyContent: 'center',
        padding: is100 ? '20px' : '0 20px calc(80px + env(safe-area-inset-bottom, 0px))',
        backdropFilter: is100 ? 'blur(6px)' : 'none',
        animation: 'fadeIn 0.2s ease both',
        cursor: 'default',
      }}
    >
      {is100 ? (
        /* ── 100%: full dramatic card ── */
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: 'linear-gradient(135deg, var(--bg-1) 0%, var(--bg-2) 100%)',
            border: '1px solid var(--border-bright)',
            borderRadius: 'var(--radius-xl)',
            padding: '40px 36px',
            maxWidth: '420px',
            width: '100%',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            animation: 'scaleIn 0.38s cubic-bezier(0.34, 1.56, 0.64, 1) both',
            boxShadow: '0 20px 80px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{ position: 'absolute', top: '-60px', left: '50%', transform: 'translateX(-50%)', width: '240px', height: '240px', background: 'radial-gradient(circle, rgba(212,168,83,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            {SPARKS.map((s, i) => (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  fontSize: '16px',
                  color: 'var(--gold)',
                  left: `${15 + i * 14}%`,
                  top: `${20 + (i % 3) * 20}%`,
                  animation: `sparkleOut 1.2s cubic-bezier(0.22,1,0.36,1) ${i * 0.12}s both`,
                }}
              >
                {s}
              </span>
            ))}
          </div>
          <div style={{ fontSize: '48px', marginBottom: '16px', position: 'relative', zIndex: 1 }}>🎯</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 400, color: 'var(--text-0)', marginBottom: '6px', lineHeight: 1.2, position: 'relative', zIndex: 1 }}>
            Goal complete.
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '17px', fontWeight: 300, color: 'var(--gold)', fontStyle: 'italic', marginBottom: '20px', lineHeight: 1.4, position: 'relative', zIndex: 1 }}>
            {goalTitle}
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--gold-dim)', border: '1px solid rgba(212,168,83,0.25)', borderRadius: '20px', padding: '5px 14px', position: 'relative', zIndex: 1 }}>
            <span style={{ fontSize: '12px', color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.05em' }}>100% · Outstanding</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '20px', position: 'relative', zIndex: 1 }}>Click anywhere to dismiss</div>
        </div>
      ) : (
        /* ── 25 / 50 / 75%: toast ── */
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: 'var(--bg-1)',
            border: '1px solid var(--border-bright)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 22px',
            maxWidth: '360px',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            animation: 'slideUp 0.32s cubic-bezier(0.22, 1, 0.36, 1) both',
            boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--gold-dim)', border: '1px solid rgba(212,168,83,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '18px' }}>
            ✦
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '2px' }}>
              Milestone · {milestone}%
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-1)', fontWeight: 500, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {goalTitle}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
