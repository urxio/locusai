'use client'

import { useState } from 'react'
import type { Person, PersonGroup } from '@/lib/types'
import PersonCard from './PersonCard'
import PersonModal from './PersonModal'

const GROUP_ORDER: PersonGroup[] = ['friends', 'family', 'work', 'acquaintances']
const GROUP_LABELS: Record<PersonGroup, string> = {
  friends:       'Friends',
  family:        'Family',
  work:          'Work',
  acquaintances: 'Acquaintances',
}

export default function NetworkList({ initialPeople }: { initialPeople: Person[] }) {
  const [people, setPeople] = useState<Person[]>(initialPeople)
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<Person | undefined>()

  const catchupPeople = people.filter(p => p.want_catchup)
  const grouped = GROUP_ORDER.reduce<Record<PersonGroup, Person[]>>((acc, g) => {
    acc[g] = people.filter(p => !p.want_catchup && p.group === g)
    return acc
  }, {} as Record<PersonGroup, Person[]>)

  const openAdd  = () => { setEditTarget(undefined); setModalMode('add') }
  const openEdit = (p: Person) => { setEditTarget(p); setModalMode('edit') }
  const closeModal = () => setModalMode(null)

  const handleSaved = (saved: Person, isNew: boolean) => {
    setPeople(prev =>
      isNew
        ? [...prev, saved]
        : prev.map(p => p.id === saved.id ? saved : p)
    )
    closeModal()
  }

  const handleDeleted = (id: string) =>
    setPeople(prev => prev.filter(p => p.id !== id))

  const handleCatchupToggled = (id: string, val: boolean) =>
    setPeople(prev => prev.map(p => p.id === id ? { ...p, want_catchup: val } : p))

  const totalCount = people.length

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 24px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', fontWeight: 400, color: 'var(--text-0)', margin: 0, lineHeight: 1.1 }}>
            My Network
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '6px 0 0' }}>
            {totalCount === 0 ? 'No people yet' : `${totalCount} ${totalCount === 1 ? 'person' : 'people'}`}
          </p>
        </div>
        <button
          onClick={openAdd}
          style={{
            background: 'var(--sage)', color: '#fff', border: 'none',
            borderRadius: '10px', padding: '10px 18px', fontSize: '14px',
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          + Add person
        </button>
      </div>

      {/* Catch-up shelf */}
      {catchupPeople.length > 0 && (
        <section style={{ marginBottom: '36px' }}>
          <SectionHeader
            label="Catch up"
            count={catchupPeople.length}
            accent="var(--sage)"
            dot
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
            {catchupPeople.map(p => (
              <PersonCard
                key={p.id}
                person={p}
                onEdit={openEdit}
                onDeleted={handleDeleted}
                onCatchupToggled={handleCatchupToggled}
              />
            ))}
          </div>
        </section>
      )}

      {/* Groups */}
      {totalCount === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : (
        GROUP_ORDER.map(g => {
          const items = grouped[g]
          if (items.length === 0) return null
          return (
            <section key={g} style={{ marginBottom: '32px' }}>
              <SectionHeader label={GROUP_LABELS[g]} count={items.length} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                {items.map(p => (
                  <PersonCard
                    key={p.id}
                    person={p}
                    onEdit={openEdit}
                    onDeleted={handleDeleted}
                    onCatchupToggled={handleCatchupToggled}
                  />
                ))}
              </div>
            </section>
          )
        })
      )}

      {/* Modal */}
      {modalMode && (
        <PersonModal
          mode={modalMode}
          person={editTarget}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

function SectionHeader({ label, count, accent = 'var(--text-3)', dot = false }: {
  label: string; count: number; accent?: string; dot?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
      {dot && (
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: accent, flexShrink: 0 }} />
      )}
      <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: accent }}>
        {label}
      </span>
      <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{count}</span>
      <div style={{ flex: 1, height: '1px', background: 'var(--border)', marginLeft: '4px' }} />
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{
      textAlign: 'center', padding: '64px 24px',
      background: 'var(--glass-card-bg)',
      border: '1px solid var(--glass-card-border)',
      borderRadius: '16px',
      backdropFilter: 'blur(20px)',
    }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>👥</div>
      <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '6px' }}>
        Your network is empty
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '20px', maxWidth: '300px', margin: '0 auto 20px' }}>
        Add people you care about. Locus will build notes from what you share in check-ins and journals.
      </div>
      <button
        onClick={onAdd}
        style={{ background: 'var(--sage)', color: '#fff', border: 'none', borderRadius: '9px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
      >
        Add your first person
      </button>
    </div>
  )
}
