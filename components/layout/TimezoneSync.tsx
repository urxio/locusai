'use client'

import { useEffect } from 'react'

/**
 * Silently syncs the browser's IANA timezone to the server on mount.
 * Runs once per session. Only sends if timezone has changed (checked via localStorage).
 */
export default function TimezoneSync() {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!tz) return

    const stored = localStorage.getItem('locus-tz')
    if (stored === tz) return // already synced this timezone

    fetch('/api/user/timezone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timezone: tz }),
    })
      .then(r => { if (r.ok) localStorage.setItem('locus-tz', tz) })
      .catch(() => {}) // silent — never break the app
  }, [])

  return null
}
