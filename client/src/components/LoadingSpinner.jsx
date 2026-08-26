export default function LoadingSpinner({ size = 32, message }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-3xl)' }}>
      <div
        style={{
          width: size,
          height: size,
          border: '3px solid var(--color-divider)',
          borderTopColor: 'var(--color-accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      {message && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{message}</p>}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="skeleton skeleton-image" />
      <div style={{ padding: 'var(--space-lg)' }}>
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-text" style={{ width: '40%' }} />
        <div className="skeleton skeleton-text" style={{ width: '30%' }} />
      </div>
    </div>
  );
}
