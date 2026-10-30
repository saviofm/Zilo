export default function Header({ title, onMenuClick }) {
  return (
    <div style={{
      height: 56, display: 'flex', alignItems: 'center', gap: 12,
      padding: '0 24px', borderBottom: '1px solid var(--border)',
      background: 'var(--bg-page)', flexShrink: 0,
    }}>
      {onMenuClick && (
        <button onClick={onMenuClick} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)', borderRadius: 6 }}>
          <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor">
            <path d="M2 4h16v2H2zm0 5h16v2H2zm0 5h16v2H2z"/>
          </svg>
        </button>
      )}
      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{title}</span>
    </div>
  )
}
