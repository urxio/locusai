'use client'

import { useState } from 'react'

type IconBtnProps = {
  onClick: () => void
  danger?: boolean
  disabled?: boolean
  title?: string
  children: React.ReactNode
}

export default function IconBtn({ children, onClick, title, danger, disabled }: IconBtnProps) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      title={title}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? (danger ? 'rgba(192,57,43,0.15)' : 'var(--bg-3)') : 'var(--bg-2)',
        border: '1px solid var(--border)',
        borderRadius: '7px',
        padding: '5px 7px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: danger ? '#e07060' : 'var(--text-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  )
}
