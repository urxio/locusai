'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LEFT_ITEMS = [
  { href: '/brief',    label: 'Brief',    icon: <BriefIcon /> },
  { href: '/checkin',  label: 'Check-in', icon: <CheckinIcon /> },
]

const RIGHT_ITEMS = [
  { href: '/goals',    label: 'Goals',    icon: <GoalsIcon /> },
  { href: '/review',   label: 'Review',   icon: <ReviewIcon /> },
]

export default function BottomNav({ overdueStepCount = 0 }: { overdueStepCount?: number }) {
  const pathname = usePathname()

  function NavItem({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
    const active = pathname === href
    const showBadge = href === '/goals' && overdueStepCount > 0
    return (
      <Link href={href} className={`bottom-nav-item${active ? ' active' : ''}`}>
        <span style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          {icon}
          {showBadge && (
            <span style={{
              position: 'absolute',
              top: '-1px',
              right: '-2px',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#e05c4a',
              border: '1.5px solid var(--bg-0)',
              animation: 'pulse 2s ease-in-out infinite',
            }} />
          )}
        </span>
        <span className="bottom-nav-label">{label}</span>
      </Link>
    )
  }

  return (
    <nav className="bottom-nav">
      {LEFT_ITEMS.map(item => <NavItem key={item.href} {...item} />)}

      {/* Center FAB */}
      <Link
        href="/capture"
        aria-label="Capture"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--gold) 0%, #a07830 100%)',
          boxShadow: '0 4px 14px rgba(212,168,83,0.45)',
          marginBottom: '8px',
          flexShrink: 0,
          color: '#131110',
          transition: 'transform 0.15s var(--ease), box-shadow 0.15s var(--ease)',
          ...(pathname === '/capture' ? {
            transform: 'scale(0.93)',
            boxShadow: '0 2px 8px rgba(212,168,83,0.3)',
          } : {}),
        }}
      >
        <svg viewBox="0 0 20 20" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M10 4v12M4 10h12" />
        </svg>
      </Link>

      {RIGHT_ITEMS.map(item => <NavItem key={item.href} {...item} />)}
    </nav>
  )
}

function BriefIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" width="20" height="20">
      <path d="M3 10h14M3 5h8M3 15h10" strokeLinecap="round" />
    </svg>
  )
}

function CheckinIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" width="20" height="20">
      <path d="M10 3v2M10 15v2M3 10h2M15 10h2" strokeLinecap="round" />
      <circle cx="10" cy="10" r="4" />
    </svg>
  )
}

function GoalsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" width="20" height="20">
      <path d="M4 15l4-4 3 3 5-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ReviewIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" width="20" height="20">
      <rect x="3" y="4" width="14" height="13" rx="2" />
      <path d="M7 4V2M13 4V2M3 8h14" strokeLinecap="round" />
    </svg>
  )
}
