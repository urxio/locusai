'use client'

import { useEffect, useState } from 'react'
import type { Brief } from '@/lib/types'

type Props = {
  onBriefReady: (brief: Brief, questions: string[]) => void
  onError: (detail: string) => void
  force?: boolean
}

export default function BriefLoader({ onBriefReady, onError, force = false }: Props) {
  const [dots, setDots] = useState('.')

  useEffect(() => {
    const id = setInterval(() => {
      setDots(d => (d.length >= 3 ? '.' : d + '.'))
    }, 500)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/brief/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force }),
        })
        if (cancelled) return
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          const detail = json?.detail ?? json?.error ?? `HTTP ${res.status}`
          onError(detail)
          return
        }
        if (!cancelled) onBriefReady(json.brief, json.clarifying_questions ?? [])
      } catch (err) {
        if (!cancelled) onError(err instanceof Error ? err.message : 'Network error')
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
