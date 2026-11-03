import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import * as LucideIcons from 'lucide-react'

function TrendIcon({ trend }) {
  if (trend === 'up')   return <TrendingUp size={14} color="var(--accent)" />
  if (trend === 'down') return <TrendingDown size={14} color="#F05A22" />
  return <Minus size={14} color="var(--text-muted)" />
}

function DynamicIcon({ name, size = 18 }) {
  if (!name) return null
  const Icon = LucideIcons[name]
  if (!Icon) return null
  return <Icon size={size} color="var(--joule)" />
}

export default function KpiBlock({ data }) {
  const { label, value, delta, trend, icon } = data || {}
  const trendColor = trend === 'up' ? 'var(--accent)' : trend === 'down' ? '#F05A22' : 'var(--text-muted)'

  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border)', borderRadius: 12,
      padding: '18px 20px', minWidth: 160, flex: '1 1 160px',
      boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <DynamicIcon name={icon} />
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: 6 }}>{value}</div>
      {delta && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: trendColor, fontWeight: 600 }}>
          <TrendIcon trend={trend} />
          {delta}
        </div>
      )}
    </div>
  )
}
