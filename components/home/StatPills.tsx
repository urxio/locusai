'use client'

/* ── Progress bar ─────────────────────────────────────── */

export function Bar({ pct, warm }: { pct: number; warm?: boolean }) {
  return (
    <div style={{
      height: '3px', borderRadius: '2px',
      background: 'var(--progress-track)', overflow: 'hidden',
    }}>
      <div style={{
        height: '100%', borderRadius: '2px',
        width: `${Math.min(Math.max(pct, 0), 100)}%`,
        background: warm
          ? 'linear-gradient(to right, var(--sun, #f0dfa0), var(--sea-soft, #c8ddd7))'
          : 'linear-gradient(to right, var(--sea-soft, #c8ddd7), var(--sage))',
        transition: 'width 0.6s var(--ease)',
      }} />
    </div>
  )
}

/* ── Stat pill ────────────────────────────────────────── */

export function StatPill({
  href, label, mainVal, unit, sub, barPct, warm, moodDot, refreshing,
}: {
  href:       string
  label:      string
  mainVal:    string
  unit?:      string
  sub:        string
  barPct?:    number
  warm?:      boolean
  moodDot?:   boolean
  refreshing: boolean
}) {
  return (
    <a
      href={href}
      style={{
        display: 'flex', flexDirection: 'column',
        flex: 1, minWidth: 0,
        background: 'var(--bg-1)',
        borderRadius: '24px',
        padding: '20px 20px 18px',
        textDecoration: 'none',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
        transition: 'transform 0.18s var(--ease), box-shadow 0.25s var(--ease)',
        gap: 0,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)' }}
    >
      <div style={{
        position: 'absolute', top: '-20px', right: '-20px',
        width: '80px', height: '80px', borderRadius: '50%',
        background: warm ? 'rgba(240,223,160,0.16)' : 'rgba(200,221,215,0.16)',
        filter: 'blur(20px)', pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <span style={{
          fontSize: '9px', fontWeight: 700,
          color: 'var(--text-3)', letterSpacing: '0.20em',
          textTransform: 'uppercase',
        }}>
          {label}
        </span>
        {moodDot && (
          <div style={{
            width: '22px', height: '22px', borderRadius: '50%',
            border: '1px solid var(--border-md)',
            background: 'var(--surface-strong-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: '9px', height: '9px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--sun, #f0dfa0), var(--sea-soft, #c8ddd7))',
            }} />
          </div>
        )}
      </div>

      <div style={{
        display: 'flex', alignItems: 'baseline', gap: '3px', marginBottom: '8px',
        opacity: refreshing ? 0.55 : 1,
        transition: 'opacity 0.3s',
      }}>
        <span style={{
          fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em',
          color: 'var(--text-0)', lineHeight: 1,
        }}>
          {mainVal}
        </span>
        {unit && (
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-3)' }}>
            {unit}
          </span>
        )}
      </div>

      <div style={{
        fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.3,
        marginBottom: barPct != null ? '14px' : '0',
      }}>
        {sub}
      </div>

      {barPct != null && <Bar pct={barPct} warm={warm} />}
    </a>
  )
}

/* ── Live dot indicator ───────────────────────────────── */

export function LiveDot({ refreshing }: { refreshing: boolean }) {
  return (
    <div style={{
      width: '6px', height: '6px', borderRadius: '50%',
      background: refreshing ? 'var(--gold)' : 'var(--sage)',
      boxShadow: refreshing ? '0 0 6px var(--gold)' : '0 0 5px var(--sage)',
      transition: 'background 0.3s, box-shadow 0.3s',
      animation: refreshing ? 'homePulse 0.8s ease-in-out infinite' : 'none',
      flexShrink: 0,
    }} />
  )
}
