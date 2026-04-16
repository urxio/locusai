'use client'

import { useContext } from 'react'
import { ToastContext, type Toast, type ToastType } from './ToastContext'

const TYPE_STYLES: Record<ToastType, { border: string; icon: React.ReactNode; accent: string }> = {
  error: {
    accent: '#e05c4a',
    border: 'rgba(224,92,74,0.25)',
    icon: (
      <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="#e05c4a" strokeWidth="1.6" strokeLinecap="round">
        <circle cx="8" cy="8" r="6"/>
        <path d="M8 5v3.5M8 11v.5"/>
      </svg>
    ),
  },
  success: {
    accent: '#7a9e8a',
    border: 'rgba(122,158,138,0.25)',
    icon: (
      <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="#7a9e8a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="6"/>
        <path d="M5.5 8.5l2 2 3-4"/>
      </svg>
    ),
  },
  info: {
    accent: '#d4a853',
    border: 'rgba(212,168,83,0.25)',
    icon: (
      <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="#d4a853" strokeWidth="1.6" strokeLinecap="round">
        <circle cx="8" cy="8" r="6"/>
        <path d="M8 7.5v4M8 5v.5"/>
      </svg>
    ),
  },
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const { accent, border, icon } = TYPE_STYLES[toast.type]
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        background: 'var(--bg-1)',
        border: `1px solid ${border}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: '12px',
        padding: '12px 14px',
        boxShadow: 'var(--shadow-card)',
        minWidth: '260px',
        maxWidth: '380px',
        animation: 'toastIn 0.2s var(--ease) both',
        pointerEvents: 'all',
      }}
    >
      <span style={{ flexShrink: 0, marginTop: '1px' }}>{icon}</span>
      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-0)', lineHeight: 1.5, flex: 1 }}>
        {toast.message}
      </p>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          flexShrink: 0,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-3)',
          padding: '0 0 0 4px',
          lineHeight: 1,
          fontSize: '16px',
        }}
      >
        ×
      </button>
    </div>
  )
}

export default function Toaster() {
  const ctx = useContext(ToastContext)
  if (!ctx || ctx.toasts.length === 0) return null

  return (
    <>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)  scale(1); }
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          bottom: '80px',   /* above bottom nav on mobile */
          right: '20px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          alignItems: 'flex-end',
          pointerEvents: 'none',
        }}
      >
        {ctx.toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={() => ctx.dismiss(t.id)} />
        ))}
      </div>
    </>
  )
}
