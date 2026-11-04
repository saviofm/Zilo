export default function SessionExpiredScreen() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'var(--joule)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 32,
    }}>
      <img src="/LOGO_COMPLETO.png" alt="Zilo"
        style={{ height: 120, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />

      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
          Sua sessão expirou
        </p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
          Clique abaixo para entrar novamente.
        </p>
      </div>

      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '12px 32px', borderRadius: 10,
          border: '2px solid rgba(255,255,255,0.4)',
          background: 'rgba(255,255,255,0.12)',
          color: '#fff', fontSize: 15, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
          transition: 'background 0.15s, border-color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.7)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)' }}
      >
        Entrar novamente
      </button>
    </div>
  )
}
