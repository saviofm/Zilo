// Inline chart rendered from model tool_call data.
// Wraps Recharts — same pattern as DemoJouleWork but with Zilor palette.
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const PALETTE = ['#01502D', '#8CC63E', '#f59e0b', '#3b82f6', '#8b5cf6', '#F05A22']

export default function ChartBlock({ data }) {
  const { type, title, subtitle, categories = [], series = [] } = data || {}

  const rows = categories.map((cat, i) => {
    const row = { name: cat }
    series.forEach(s => { row[s.name] = s.values?.[i] ?? null })
    return row
  })

  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border)', borderRadius: 12,
      padding: '16px 18px', boxShadow: 'var(--shadow-card)', marginBottom: 12,
    }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      <div style={{ width: '100%', height: 240 }}>
        <ResponsiveContainer>{renderChart(type, rows, series)}</ResponsiveContainer>
      </div>
    </div>
  )
}

function renderChart(type, rows, series) {
  const tick = { fontSize: 11, fill: '#6B7280' }
  const tooltipStyle = { fontSize: 12, borderRadius: 8, border: '1px solid var(--border)' }
  const legendStyle = { fontSize: 11 }
  const grid = <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />

  switch (type) {
    case 'line':
      return (
        <LineChart data={rows} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          {grid}
          <XAxis dataKey="name" tick={tick} />
          <YAxis tick={tick} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={legendStyle} />
          {series.map((s, i) => (
            <Line key={s.name} type="monotone" dataKey={s.name}
              stroke={PALETTE[i % PALETTE.length]} strokeWidth={2}
              dot={{ r: 3 }} activeDot={{ r: 5 }} />
          ))}
        </LineChart>
      )

    case 'bar':
      return (
        <BarChart data={rows} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          {grid}
          <XAxis dataKey="name" tick={tick} />
          <YAxis tick={tick} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={legendStyle} />
          {series.map((s, i) => (
            <Bar key={s.name} dataKey={s.name} fill={PALETTE[i % PALETTE.length]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      )

    case 'stacked-bar':
      return (
        <BarChart data={rows} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          {grid}
          <XAxis dataKey="name" tick={tick} />
          <YAxis tick={tick} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={legendStyle} />
          {series.map((s, i) => (
            <Bar key={s.name} dataKey={s.name} stackId="a" fill={PALETTE[i % PALETTE.length]} />
          ))}
        </BarChart>
      )

    case 'pie': {
      const pieData = (rows[0] ? Object.keys(rows[0]).filter(k => k !== 'name').length > 0 ? rows : [] : [])
      const pd = rows.map(r => ({ name: r.name, value: Number(Object.values(r).find((v, i) => i > 0)) || 0 }))
      return (
        <PieChart>
          <Pie data={pd} dataKey="value" nameKey="name" outerRadius={90} label>
            {pd.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={legendStyle} />
        </PieChart>
      )
    }

    default:
      return <BarChart data={rows} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        {grid}<XAxis dataKey="name" tick={tick} /><YAxis tick={tick} />
        <Tooltip contentStyle={tooltipStyle} /><Legend wrapperStyle={legendStyle} />
        {series.map((s, i) => <Bar key={s.name} dataKey={s.name} fill={PALETTE[i % PALETTE.length]} radius={[4,4,0,0]} />)}
      </BarChart>
  }
}
