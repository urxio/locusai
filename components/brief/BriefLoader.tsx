'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Brief } from '@/lib/types'

type Props = {
  onBriefReady: (brief: Brief) => void
  onError: () => void
}

export default function BriefLoader({ onBriefReady, onError }: Props) {
  const [dots, setDots] = useState('.')
  const router = useRouter()

  // Animate dots
  useEffect(() => {
    const id = setInterval(() => {
      setDots(d => (d.length >= 3 ? '.' : d + '.'))
    }, 500)
    return () => clearInterval(id)
  }, [])

  // Trigger generation
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/brief/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force: false }),
        })
        if (cancelled) return
        if (!res.ok) { onError(); return }
        const { brief } = await res.json()
        if (!cancelled) onBriefReady(brief)
      } catch {
        if (!cancelled) onError()
      }
    })()
    return () => { cancelled = true }
  }, [onBriefReady, onError])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '260px', gap: '16px' }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: '50%',
        border: '2px solid var(--bg-4)',
        borderTopColor: 'var(--gold)',
        animation: 'spin 0.9s linear infinite',
      }} />
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 300, color: 'var(--text-1)', letterSpacing: '0.02em' }}>
        Generating your brief{dots}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-3)', maxWidth: '260px', textAlign: 'center', lineHeight: 1.6 }}>
        Claude is analyzing your goals, energy, and habit patterns.
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
