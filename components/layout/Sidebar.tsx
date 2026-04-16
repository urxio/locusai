'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  {
    section: 'Today',
    items: [
      { href: '/brief',   label: 'Home', badge: null, icon: <BriefIcon /> },
      { href: '/checkin', label: 'Check-in',    badge: null, icon: <CheckinIcon /> },
      { href: '/habits',  label: 'Habits',      badge: null, icon: <HabitsIcon /> },
      { href: '/capture', label: 'Capture',     badge: null, icon: <CaptureIcon /> },
    ]
  },
  {
    section: 'System',
    items: [
      { href: '/goals',    label: 'Goals',          badge: null, icon: <GoalsIcon /> },
      { href: '/planner',  label: 'Planner',        badge: null, icon: <PlannerIcon /> },
      { href: '/review',   label: 'Weekly Review',  badge: null, icon: <ReviewIcon /> },
    ]
  },
  {
    section: 'Settings',
    items: [
      { href: '/settings', label: 'Settings', badge: null, icon: <SettingsIcon /> },
    ]
  }
]

export default function Sidebar({ userName, avatarUrl, overdueStepCount = 0 }: { userName: string; avatarUrl: string | null; overdueStepCount?: number }) {
  const pathname = usePathname()
  const now = new Date()
  const day = now.toLocaleDateString('en-US', { weekday: 'long' })
  const full = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const initial = userName.charAt(0).toUpperCase()

  return (
    <aside className="app-sidebar">
      {/* Fade bottom */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '100px', background: 'linear-gradient(to top, var(--bg-1), transparent)', pointerEvents: 'none', zIndex: 1 }} />

      {/* Brand */}
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--gold) 0%, #a07830 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 12px rgba(212,168,83,0.3)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="#131110"><circle cx="8" cy="8" r="3"/><circle cx="8" cy="2" r="1.2"/><circle cx="8" cy="14" r="1.2"/><circle cx="2" cy="8" r="1.2"/><circle cx="14" cy="8" r="1.2"/></svg>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: 500, color: 'var(--text-0)' }}>Locus</div>
            <div style={{ fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '1px' }}>Life OS</div>
          </div>
        </div>
      </div>

      {/* Date */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 300, color: 'var(--text-0)', lineHeight: 1 }}>{day}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '3px', letterSpacing: '0.04em' }}>{full}</div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 0', scrollbarWidth: 'none' }}>
        {NAV.map(group => (
          <div key={group.section}>
            <div style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', padding: '12px 20px 6px', fontWeight: 600 }}>{group.section}</div>
            {group.items.map(item => {
              const active = pathname === item.href
              return (
                <Link key={item.href} href={item.href} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 20px', background: active ? 'var(--bg-3)' : 'transparent', position: 'relative', transition: 'background 0.15s' }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-2)' }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  {active && <div style={{ position: 'absolute', left: 0, top: '4px', bottom: '4px', width: '2px', background: 'var(--gold)', borderRadius: '0 2px 2px 0' }} />}
                  <span style={{ color: active ? 'var(--gold)' : 'var(--text-2)', width: '18px', height: '18px', flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ fontSize: '13.5px', color: active ? 'var(--text-0)' : 'var(--text-2)', fontWeight: 500 }}>{item.label}</span>
                  {item.badge && <span style={{ marginLeft: 'auto', fontSize: '10px', background: 'var(--gold-dim)', color: 'var(--gold)', borderRadius: '10px', padding: '1px 7px', fontWeight: 600 }}>{item.badge}</span>}
                  {item.href === '/goals' && overdueStepCount > 0 && (
                    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e05c4a', flexShrink: 0, animation: 'pulse 2s ease-in-out infinite' }} />
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#e05c4a', letterSpacing: '0.02em' }}>{overdueStepCount}</span>
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User → Settings */}
      <Link href="/settings" style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, position: 'relative', zIndex: 2, textDecoration: 'none', transition: 'background 0.15s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-2)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={userName} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #4a6e5a 0%, #2a4a3a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600, color: '#a0d4b8', flexShrink: 0 }}>
            {initial}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '1px' }}>Settings</div>
        </div>
      </Link>
    </aside>
  )
}

function HabitsIcon() {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><circle cx="10" cy="10" r="7"/><path d="M7 10l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
function BriefIcon() {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><path d="M3 10h14M3 5h8M3 15h10" strokeLinecap="round"/></svg>
}
function CheckinIcon() {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><path d="M10 3v2M10 15v2M3 10h2M15 10h2" strokeLinecap="round"/><circle cx="10" cy="10" r="4"/></svg>
}
function GoalsIcon() {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><path d="M4 15l4-4 3 3 5-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
function ReviewIcon() {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><rect x="3" y="4" width="14" height="13" rx="2"/><path d="M7 4V2M13 4V2M3 8h14" strokeLinecap="round"/></svg>
}
function SettingsIcon() {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><circle cx="10" cy="10" r="2.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41" strokeLinecap="round"/></svg>
}
function PatternsIcon() {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><path d="M3 14l4-5 3 3 3-4 4 5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="7" cy="9" r="1" fill="currentColor" stroke="none"/><circle cx="10" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="13" cy="8" r="1" fill="currentColor" stroke="none"/></svg>
}
function CaptureIcon() {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18" strokeLinecap="round">
    <path d="M4 5h12M4 9h8M4 13h5"/><path d="M15 11l-2 5-2-2-2 1 1-3 4-4 1 3z" strokeLinejoin="round"/>
  </svg>
}
function WheelIcon() {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
    <circle cx="10" cy="10" r="7"/>
    <circle cx="10" cy="10" r="2.5"/>
    <path d="M10 3v4M10 13v4M3 10h4M13 10h4" strokeLinecap="round"/>
  </svg>
}
function PlannerIcon() {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18">
    <rect x="2" y="3" width="16" height="15" rx="2"/>
    <path d="M2 8h16M7 3v5M13 3v5M6 12h2M9 12h2M12 12h2M6 15h2M9 15h2M12 15h2" strokeLinecap="round"/>
  </svg>
}
