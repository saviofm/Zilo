export function fmtCredits(n) {
  if (n == null) return '—'
  const v = Number(n)
  if (v >= 1_000_000) return `${(v/1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}M`
  if (v >= 1000)       return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 4 })
}

export function fmtPct(n) {
  if (n == null) return '—'
  return `${Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}

export function pctColor(pct) {
  if (pct >= 90) return '#F05A22'
  if (pct >= 70) return '#f59e0b'
  return '#01502D'
}

export default function KpiCard({ label, value, sub, color, trend, icon }) {
  return (
    <div className="card" style={{ padding: '20px 24px', flex: 1, minWidth: 160 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || 'var(--text-primary)', lineHeight: 1.1, marginBottom: 4 }}>{value ?? '—'}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</div>}
        {trend != null && (
          <div style={{ fontSize: 11, fontWeight: 600, color: trend >= 0 ? '#F05A22' : '#01502D', marginLeft: 'auto' }}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
          </div>
        )}
      </div>
    </div>
  )
}
