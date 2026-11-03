export const ZILOR_COLORS = [
  '#8CC63E', '#01502D', '#F05A22', '#f59e0b', '#6366f1',
  '#ec4899', '#14b8a6', '#8b5cf6', '#06b6d4', '#d97706',
]

export default function ChartCard({ title, subtitle, children, action }) {
  return (
    <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
          {subtitle && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  )
}

export function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 14, padding: '40px 0', justifyContent: 'center' }}>
      <div className="animate-spin-custom" style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--accent-light)', borderTopColor: 'var(--accent)' }} />
      Carregando…
    </div>
  )
}

export function Empty({ msg = 'Nenhum dado encontrado.' }) {
  return (
    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>{msg}</div>
  )
}

export function PageHeader({ title, subtitle, controls }) {
  return (
    <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', borderBottom: '1px solid var(--border)', background: '#fff', flexShrink: 0 }}>
      <div>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</span>
        {subtitle && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 10 }}>{subtitle}</span>}
      </div>
      {controls && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{controls}</div>}
    </div>
  )
}

export function MonthNav({ value, onChange }) {
  const currentYM = new Date().toISOString().slice(0, 7)
  function fmt(ym) {
    if (!ym) return ''
    const [y, m] = ym.split('-')
    return new Date(Number(y), Number(m) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }
  function prev(ym) {
    const [y, m] = ym.split('-').map(Number)
    return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
  }
  function next(ym) {
    const [y, m] = ym.split('-').map(Number)
    const n = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
    return n > currentYM ? currentYM : n
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button className="btn-ghost" onClick={() => onChange(prev(value))} style={{ padding: '3px 8px' }}>←</button>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--joule)', minWidth: 140, textAlign: 'center' }}>{fmt(value)}</span>
      {value < currentYM && (
        <button className="btn-ghost" onClick={() => onChange(next(value))} style={{ padding: '3px 8px' }}>→</button>
      )}
    </div>
  )
}
