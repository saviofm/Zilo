import { Calculator } from 'lucide-react'

export default function CalculatorBlock({ data }) {
  const { expression, result, description } = data || {}

  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border)', borderRadius: 12,
      padding: '16px 18px', marginBottom: 12, boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Calculator size={16} color="var(--joule)" />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cálculo</span>
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 14, color: 'var(--text-secondary)', marginBottom: 6, background: '#f8f9fa', padding: '6px 10px', borderRadius: 6 }}>
        {expression}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--joule)' }}>{result}</div>
      {description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{description}</div>}
    </div>
  )
}
