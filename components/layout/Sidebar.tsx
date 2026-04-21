'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  {
    section: 'Rhythm',
    items: [
      { href: '/brief',   label: 'Home' },
      { href: '/checkin', label: 'Check-in' },
      { href: '/habits',  label: 'Habits' },
      { href: '/capture', label: 'Capture' },
    ]
  },
  {
    section: 'Direction',
    items: [
      { href: '/goals',   label: 'Goals' },
      { href: '/planner', label: 'Planner' },
      { href: '/review',  label: 'Weekly Review' },
    ]
  },
  {
    section: 'Settings',
    items: [
      { href: '/settings', label: 'Settings' },
    ]
  }
]

export default function Sidebar({ userName, avatarUrl, overdueStepCount = 0 }: { userName: string; avatarUrl: string | null; overdueStepCount?: number }) {
  const pathname = usePathname()
  const initial = userName.charAt(0).toUpperCase()

  return (
    <aside className="app-sidebar">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', height: '100%', padding: '24px' }}>

        {/* ── Brand ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px' }}>
          {/* White card logo with gradient dot — matches Lovable exactly */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '40px', height: '40px', borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.9)',
            background: 'rgba(255,255,255,0.92)',
            boxShadow: '0 2px 12px rgba(110,158,145,0.15)',
            flexShrink: 0,
          }}>
            <div style={{
              width: '16px', height: '16px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--sea-soft, #c8ddd7) 0%, var(--sage) 100%)',
            }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-0)' }}>Locus</span>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-3)', marginTop: '1px' }}>Life OS</span>
          </div>
        </div>

        {/* ── Nav ── */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', scrollbarWidth: 'none' }}>
          {NAV.map(group => (
            <div key={group.section} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {/* Section label */}
              <div style={{
                padding: '0 12px 4px',
                fontSize: '10px', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.20em',
                color: 'var(--text-3)',
              }}>
                {group.section}
              </div>

              {/* Items */}
              {group.items.map(item => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      borderRadius: '16px',
                      border: active ? '1px solid rgba(255,255,255,0.85)' : '1px solid transparent',
                      background: active ? 'rgba(255,255,255,0.70)' : 'transparent',
                      padding: '10px 16px',
                      fontSize: '14px',
                      fontWeight: active ? 600 : 500,
                      color: active ? 'var(--text-0)' : 'var(--text-2)',
                      textDecoration: 'none',
                      boxShadow: active ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
                      transition: 'background 0.15s, color 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.40)'
                        ;(e.currentTarget as HTMLElement).style.color = 'var(--text-0)'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.background = 'transparent'
                        ;(e.currentTarget as HTMLElement).style.color = 'var(--text-2)'
                      }
                    }}
                  >
                    <span>{item.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {active && (
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--sage)', flexShrink: 0 }} />
                      )}
                      {item.href === '/goals' && overdueStepCount > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e05c4a', animation: 'pulse 2s ease-in-out infinite' }} />
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#e05c4a' }}>{overdueStepCount}</span>
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* ── User footer ── */}
        <Link
          href="/settings"
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            borderRadius: '16px', border: '1px solid transparent',
            padding: '12px',
            textDecoration: 'none',
            transition: 'background 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.40)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={userName} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
              background: 'var(--sun, #f0dfa0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', fontWeight: 600, color: 'var(--text-0)',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6)',
            }}>
              {initial}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '1px' }}>Settings</div>
          </div>
        </Link>

      </div>
    </aside>
  )
}
