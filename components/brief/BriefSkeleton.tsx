export default function BriefSkeleton() {
  return (
    <div style={{ padding: '36px 40px 60px', maxWidth: '860px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ width: '160px', height: '12px', background: 'var(--bg-3)', borderRadius: '4px', marginBottom: '10px', animation: 'shimmer 1.5s ease-in-out infinite' }} />
        <div style={{ width: '280px', height: '34px', background: 'var(--bg-3)', borderRadius: '6px', marginBottom: '8px', animation: 'shimmer 1.5s ease-in-out infinite 0.1s' }} />
        <div style={{ width: '240px', height: '14px', background: 'var(--bg-2)', borderRadius: '4px', animation: 'shimmer 1.5s ease-in-out infinite 0.2s' }} />
      </div>

      {/* AI Card skeleton */}
      <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-md)', borderRadius: 'var(--radius-xl)', padding: '26px 28px', marginBottom: '20px' }}>
        <div style={{ width: '140px', height: '22px', background: 'var(--bg-3)', borderRadius: '20px', marginBottom: '16px', animation: 'shimmer 1.5s ease-in-out infinite 0.1s' }} />
        <div style={{ width: '100%', height: '18px', background: 'var(--bg-2)', borderRadius: '4px', marginBottom: '8px', animation: 'shimmer 1.5s ease-in-out infinite 0.15s' }} />
        <div style={{ width: '90%', height: '18px', background: 'var(--bg-2)', borderRadius: '4px', marginBottom: '8px', animation: 'shimmer 1.5s ease-in-out infinite 0.2s' }} />
        <div style={{ width: '70%', height: '18px', background: 'var(--bg-2)', borderRadius: '4px', animation: 'shimmer 1.5s ease-in-out infinite 0.25s' }} />
        <div style={{ marginTop: '16px', width: '220px', height: '12px', background: 'var(--bg-3)', borderRadius: '4px', animation: 'shimmer 1.5s ease-in-out infinite 0.3s' }} />
      </div>

      {/* Energy bar skeleton */}
      <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ width: '100px', height: '12px', background: 'var(--bg-3)', borderRadius: '4px', animation: 'shimmer 1.5s ease-in-out infinite 0.2s' }} />
          <div style={{ width: '60px', height: '22px', background: 'var(--bg-3)', borderRadius: '4px', animation: 'shimmer 1.5s ease-in-out infinite 0.25s' }} />
        </div>
        <div style={{ height: '4px', background: 'var(--bg-4)', borderRadius: '4px' }} />
      </div>

      {/* Priority cards skeleton */}
      {[0, 1, 2].map(i => (
        <div key={i} style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px 18px', marginBottom: '10px', display: 'flex', gap: '14px', overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: 'var(--bg-4)' }} />
          <div style={{ width: '22px', height: '22px', background: 'var(--bg-3)', borderRadius: '4px', flexShrink: 0, animation: `shimmer 1.5s ease-in-out infinite ${0.1 * i}s` }} />
          <div style={{ flex: 1 }}>
            <div style={{ width: '70%', height: '14px', background: 'var(--bg-3)', borderRadius: '4px', marginBottom: '8px', animation: `shimmer 1.5s ease-in-out infinite ${0.15 + 0.1 * i}s` }} />
            <div style={{ width: '120px', height: '12px', background: 'var(--bg-2)', borderRadius: '4px', animation: `shimmer 1.5s ease-in-out infinite ${0.2 + 0.1 * i}s` }} />
          </div>
        </div>
      ))}

      {/* Stats skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '12px' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px 18px' }}>
            <div style={{ width: '50px', height: '28px', background: 'var(--bg-3)', borderRadius: '6px', marginBottom: '6px', animation: `shimmer 1.5s ease-in-out infinite ${0.1 * i}s` }} />
            <div style={{ width: '80px', height: '11px', background: 'var(--bg-2)', borderRadius: '4px', animation: `shimmer 1.5s ease-in-out infinite ${0.15 + 0.1 * i}s` }} />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
