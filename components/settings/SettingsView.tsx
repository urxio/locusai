'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateProfile } from '@/app/actions/settings'
import { signOut } from '@/app/actions/auth'
import ThemeToggle from '@/components/layout/ThemeToggle'
import { useToast } from '@/components/ui/ToastContext'

// ── Cover presets ─────────────────────────────────────────────────────────────

const COVER_PRESETS = [
  { id: 'fog-mountains',   url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1400&q=80', label: 'Fog & peaks' },
  { id: 'night-sky',       url: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1400&q=80', label: 'Night sky' },
  { id: 'dark-forest',     url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1400&q=80', label: 'Forest' },
  { id: 'desert-dunes',    url: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1400&q=80', label: 'Desert' },
  { id: 'ocean-horizon',   url: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1400&q=80', label: 'Ocean' },
  { id: 'mountain-lake',   url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&q=80', label: 'Mountain lake' },
  { id: 'dark-water',      url: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1400&q=80', label: 'Still water' },
  { id: 'minimal-arch',    url: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1400&q=80', label: 'Architecture' },
  { id: 'golden-field',    url: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1400&q=80', label: 'Golden field' },
  { id: 'dark-canyon',     url: 'https://images.unsplash.com/photo-1512273222628-4daea6a6a6b5?w=1400&q=80', label: 'Canyon' },
]

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '12px' }}>
        {title}
      </div>
      <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '16px', padding: '14px 18px',
      borderBottom: last ? 'none' : '1px solid var(--border)',
    }}>
      <span style={{ fontSize: '13.5px', color: 'var(--text-1)', fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        {children}
      </div>
    </div>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ url, name }: { url: string | null; name: string }) {
  const initial = name.charAt(0).toUpperCase() || '?'
  if (url) {
    return <img src={url} alt={name} style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  }
  return (
    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #4a6e5a 0%, #2a4a3a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', fontWeight: 600, color: '#a0d4b8', flexShrink: 0 }}>
      {initial}
    </div>
  )
}

// ── Profile editor ────────────────────────────────────────────────────────────

function ProfileSection({ name: initialName, avatarUrl: initialUrl, coverUrl: initialCover }: { name: string; avatarUrl: string | null; coverUrl: string | null }) {
  const toast = useToast()
  const [name, setName] = useState(initialName)
  const [avatarUrl, setAvatarUrl] = useState(initialUrl ?? '')
  const [coverUrl, setCoverUrl] = useState(initialCover ?? '')
  const [editing, setEditing] = useState(false)
  const [saving, startSave] = useTransition()

  const dirty = name !== initialName || (avatarUrl || null) !== initialUrl || (coverUrl || null) !== initialCover

  function handleSave() {
    startSave(async () => {
      try {
        await updateProfile(name, avatarUrl || null, coverUrl || null)
        toast.success('Profile updated')
        setEditing(false)
      } catch {
        toast.error('Failed to save profile')
      }
    })
  }

  return (
    <Section title="Profile">
      {/* Cover image preview */}
      <div style={{
        height: '100px', background: coverUrl
          ? `url(${coverUrl}) center/cover no-repeat`
          : 'linear-gradient(135deg, var(--bg-3) 0%, var(--bg-2) 100%)',
        position: 'relative', borderRadius: '14px 14px 0 0',
      }}>
        {!coverUrl && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>No cover image</span>
          </div>
        )}
      </div>

      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Avatar url={avatarUrl || null} name={name} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-0)' }}>{name || '—'}</div>
          <button
            onClick={() => setEditing(e => !e)}
            style={{ fontSize: '12px', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '2px' }}
          >
            {editing ? 'Cancel' : 'Edit profile'}
          </button>
        </div>
      </div>

      {editing && (
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Name</span>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ background: 'var(--bg-2)', border: '1px solid var(--border-md)', borderRadius: '8px', padding: '9px 12px', fontSize: '14px', color: 'var(--text-0)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
            />
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cover image</span>
            {/* Preset grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
              {COVER_PRESETS.map(preset => {
                const selected = coverUrl === preset.url
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setCoverUrl(preset.url)}
                    title={preset.label}
                    style={{
                      aspectRatio: '16/9',
                      borderRadius: '6px',
                      border: selected ? '2px solid var(--gold)' : '2px solid transparent',
                      background: `url(${preset.url}) center/cover no-repeat`,
                      cursor: 'pointer',
                      padding: 0,
                      outline: 'none',
                      boxShadow: selected ? '0 0 0 1px var(--gold)' : 'none',
                      transition: 'border-color 0.12s, box-shadow 0.12s',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {selected && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(212,168,83,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg viewBox="0 0 12 12" width="14" height="14" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 6l3 3 5-5" />
                        </svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            {/* Custom URL fallback */}
            <input
              value={COVER_PRESETS.some(p => p.url === coverUrl) ? '' : coverUrl}
              onChange={e => setCoverUrl(e.target.value)}
              placeholder="Or paste a custom URL…"
              style={{ background: 'var(--bg-2)', border: '1px solid var(--border-md)', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: 'var(--text-0)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Avatar URL</span>
            <input
              value={avatarUrl}
              onChange={e => setAvatarUrl(e.target.value)}
              placeholder="https://…"
              style={{ background: 'var(--bg-2)', border: '1px solid var(--border-md)', borderRadius: '8px', padding: '9px 12px', fontSize: '14px', color: 'var(--text-0)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
            />
          </label>
          <button
            onClick={handleSave}
            disabled={!dirty || saving || !name.trim()}
            style={{
              padding: '9px 18px', borderRadius: '9px', border: 'none', fontSize: '13px', fontWeight: 600,
              background: dirty && name.trim() ? 'var(--gold)' : 'var(--bg-3)',
              color: dirty && name.trim() ? 'var(--bg-0)' : 'var(--text-3)',
              cursor: dirty && name.trim() ? 'pointer' : 'not-allowed',
              alignSelf: 'flex-start', transition: 'all 0.15s',
            }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      )}
    </Section>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

export default function SettingsView({
  name, avatarUrl, coverUrl, timezone, email,
}: {
  name: string
  avatarUrl: string | null
  coverUrl: string | null
  timezone: string
  email: string
}) {
  const toast = useToast()
  const router = useRouter()
  const [signingOut, startSignOut] = useTransition()

  return (
    <div className="page-pad" style={{ maxWidth: '560px', animation: 'fadeUp 0.3s var(--ease) both' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '30px', fontWeight: 400, color: 'var(--text-0)', margin: '0 0 4px' }}>
          Settings
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: 0 }}>Manage your profile and preferences.</p>
      </div>

      {/* Profile */}
      <ProfileSection name={name} avatarUrl={avatarUrl} coverUrl={coverUrl} />

      {/* Account info */}
      <Section title="Account">
        <Row label="Email">
          <span style={{ fontSize: '13px', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</span>
        </Row>
        <Row label="Timezone" last>
          <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>{timezone}</span>
          <span style={{ fontSize: '10px', color: 'var(--text-3)', background: 'var(--bg-3)', borderRadius: '5px', padding: '2px 7px' }}>auto</span>
        </Row>
      </Section>

      {/* Appearance */}
      <Section title="Appearance">
        <Row label="Theme" last>
          <ThemeToggle />
        </Row>
      </Section>

      {/* System */}
      <Section title="System">
        <Row label="Onboarding">
          <a
            href="/onboarding?redo=true"
            style={{ fontSize: '13px', color: 'var(--gold)', textDecoration: 'none', fontWeight: 500 }}
          >
            Redo setup →
          </a>
        </Row>
        <Row label="Sign out" last>
          <button
            onClick={() => startSignOut(() => signOut())}
            disabled={signingOut}
            style={{
              padding: '7px 16px', borderRadius: '8px', border: '1px solid rgba(224,92,74,0.3)',
              background: 'rgba(224,92,74,0.07)', color: signingOut ? 'var(--text-3)' : '#e05c4a',
              fontSize: '13px', fontWeight: 500, cursor: signingOut ? 'default' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </Row>
      </Section>

      <div style={{ fontSize: '11px', color: 'var(--text-3)', textAlign: 'center', marginTop: '12px' }}>
        Locus · AI Life OS
      </div>
    </div>
  )
}
