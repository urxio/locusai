'use client'

import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const stored = localStorage.getItem('locus-theme') as 'dark' | 'light' | null
    const initial = stored ?? 'dark'
    setTheme(initial)
    document.documentElement.setAttribute('data-theme', initial)
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('locus-theme', next)
  }

  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        background: 'var(--bg-3)',
        border: '1px solid var(--border-md)',
        borderRadius: '20px',
        padding: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        width: '48px',
        height: '26px',
        position: 'relative',
        transition: 'background 0.2s var(--ease)',
        flexShrink: 0,
      }}
      aria-label="Toggle theme"
    >
      {/* Track icons */}
      <span style={{ position: 'absolute', left: '6px', fontSize: '11px', opacity: isDark ? 0.4 : 0 , transition: 'opacity 0.2s' }}>☀️</span>
      <span style={{ position: 'absolute', right: '6px', fontSize: '11px', opacity: isDark ? 0 : 0.5, transition: 'opacity 0.2s' }}>🌙</span>
      {/* Thumb */}
      <span style={{
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        background: 'var(--gold)',
        display: 'block',
        position: 'absolute',
        top: '3px',
        left: isDark ? '3px' : '27px',
        transition: 'left 0.22s var(--ease)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </button>
  )
}
