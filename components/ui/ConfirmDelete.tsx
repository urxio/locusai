type ConfirmDeleteProps = {
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDelete({ onConfirm, onCancel }: ConfirmDeleteProps) {
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>Delete?</span>
      <button
        onClick={onConfirm}
        style={{ background: '#c0392b', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
      >
        Yes
      </button>
      <button
        onClick={onCancel}
        style={{ background: 'var(--bg-3)', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer' }}
      >
        No
      </button>
    </div>
  )
}
