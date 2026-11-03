export const NAV_ITEMS = [
  { id: 'overview',   label: 'Visão Geral',     icon: '◉' },
  { id: 'byMonth',    label: 'Mês a Mês',        icon: '📅' },
  { id: 'byModel',    label: 'Por Modelo',        icon: '🤖' },
  { id: 'byPersona',  label: 'Por Perfil IA',     icon: '🎭' },
  { id: 'byJobRole',  label: 'Por Cargo',         icon: '👥' },
  { id: 'drilldown',  label: 'Drill-down',        icon: '🔍' },
  { id: 'simulator',  label: 'Simulador CU',      icon: '🧮' },
]

export default function Sidebar({ active, onSelect }) {
  return (
    <div style={{
      width: 220, flexShrink: 0, height: '100vh',
      background: 'var(--sidebar-bg)', display: 'flex', flexDirection: 'column',
      borderRight: '1px solid var(--sidebar-border)',
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--sidebar-border)' }}>
        <img src="/LOGO_COMPLETO.png" alt="Zilo" style={{ height: 36, objectFit: 'contain', display: 'block' }} />
        <div style={{ marginTop: 6, fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          FinOps Dashboard
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {NAV_ITEMS.map(item => {
          const isActive = active === item.id
          return (
            <button key={item.id} onClick={() => onSelect(item.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8, border: 'none',
                background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                fontSize: 13, fontWeight: isActive ? 600 : 400,
                cursor: 'pointer', textAlign: 'left', marginBottom: 2,
                transition: 'background 0.12s, color 0.12s',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--sidebar-hover-bg)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--sidebar-border)' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
          Zilo FinOps v0.1
        </div>
      </div>
    </div>
  )
}
