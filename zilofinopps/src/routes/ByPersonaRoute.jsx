import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts'
import ChartCard, { Spinner, Empty, PageHeader, ZILOR_COLORS } from '../components/ChartCard'
import KpiCard, { fmtCredits } from '../components/KpiCard'
import { MonthNav } from '../components/ChartCard'
import { fetchUsageByOrchestration, fetchUsageByMonth } from '../api/finops'

export default function ByPersonaRoute({ onInsightsContext }) {
  const currentYM = new Date().toISOString().slice(0, 7)
  const [ym, setYm]         = useState(currentYM)
  const [loading, setLoading] = useState(true)
  const [data, setData]     = useState([])

  useEffect(() => {
    setLoading(true)
    fetchUsageByOrchestration(ym).then(setData).finally(() => setLoading(false))
  }, [ym])

  const totalCU    = data.reduce((s, d) => s + Number(d.totalCU ?? 0), 0)
  const totalCalls = data.reduce((s, d) => s + Number(d.totalCalls ?? 0), 0)
  const topPersona = data[0]

  const pieData = data.map(d => ({
    name: d.orchestrationName?.replace('Zilo ', ''),
    value: Number(d.totalCU ?? 0),
  }))

  const radarData = data.slice(0, 6).map(d => ({
    persona: d.orchestrationName?.replace('Zilo ', ''),
    cu: Number(d.totalCU ?? 0),
    calls: Number(d.totalCalls ?? 0),
  }))

  useEffect(() => {
    onInsightsContext?.({ label: 'Por Perfil IA', data: { yearMonth: ym, totalCU, topPersona: topPersona?.orchestrationName, personas: data } })
  }, [totalCU]) // eslint-disable-line

  const TT = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', boxShadow: 'var(--shadow-popover)', fontSize: 12 }}>
        {payload.map((p, i) => <div key={i} style={{ color: p.color }}>{p.name}: <strong>{fmtCredits(p.value)}</strong></div>)}
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-shell)' }}>
      <PageHeader title="Consumo por Perfil de IA" controls={<MonthNav value={ym} onChange={setYm} />} />

      <div style={{ padding: '24px 32px' }}>
        {loading ? <Spinner /> : (
          <>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
              <KpiCard label="Créditos no período" value={fmtCredits(totalCU)} sub="Créditos de IA" icon="💰" />
              <KpiCard label="Perfis utilizados" value={data.length} sub="personas ativas" icon="🎭" />
              <KpiCard label="Total de chats" value={totalCalls.toLocaleString('pt-BR')} sub="conversas" icon="💬" />
              {topPersona && <KpiCard label="Perfil dominante" value={topPersona.orchestrationName?.replace('Zilo ', '')} sub={`${fmtCredits(topPersona.totalCU)} Créditos`} icon="🥇" />}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 0 }}>
              {/* Horizontal bar */}
              <ChartCard title="Créditos por Perfil" subtitle="total no período">
                {data.length === 0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={Math.max(200, data.length * 44)}>
                    <BarChart data={data.map(d => ({ name: d.orchestrationName?.replace('Zilo ', ''), cu: Number(d.totalCU ?? 0), calls: Number(d.totalCalls ?? 0) }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={fmtCredits} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                      <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                      <Tooltip content={<TT />} />
                      <Bar dataKey="cu" name="Créditos" radius={[0, 4, 4, 0]}>
                        {data.map((_, i) => <Cell key={i} fill={ZILOR_COLORS[i % ZILOR_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              {/* Pie */}
              <ChartCard title="Distribuição de créditos" subtitle="share por perfil">
                {pieData.length === 0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}>
                        {pieData.map((_, i) => <Cell key={i} fill={ZILOR_COLORS[i % ZILOR_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => fmtCredits(v)} />
                      <Legend iconType="circle" iconSize={10} formatter={(v) => <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            {/* Grouped bar: credits vs calls */}
            <ChartCard title="Créditos vs Volume de chats" subtitle="comparativo por perfil">
              {data.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.map(d => ({
                    name: d.orchestrationName?.replace('Zilo ', '').split(' ').slice(0, 2).join(' '),
                    cu: Number(d.totalCU ?? 0),
                    calls: Number(d.totalCalls ?? 0),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <YAxis yAxisId="left" tickFormatter={fmtCredits} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="cu" name="Créditos" fill="#8CC63E" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="calls" name="Chats" fill="#01502D" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Detail table */}
            <ChartCard title="Tabela de detalhes">
              {data.length === 0 ? <Empty /> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa' }}>
                        {['Perfil de IA', 'Créditos de IA', '% do total', 'Nº chats', 'Média CU/chat'].map(h => (
                          <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Perfil de IA' ? 'left' : 'right', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid var(--border)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((d, i) => {
                        const sharePct = totalCU > 0 ? ((Number(d.totalCU ?? 0) / totalCU) * 100).toFixed(1) : '0'
                        const avg = Number(d.totalCalls ?? 0) > 0 ? Number(d.totalCU ?? 0) / Number(d.totalCalls) : 0
                        return (
                          <tr key={d.orchestrationId ?? i} style={{ borderBottom: '1px solid var(--border)' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '10px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: ZILOR_COLORS[i % ZILOR_COLORS.length], flexShrink: 0 }} />
                                {d.orchestrationName}
                              </div>
                            </td>
                            <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--joule)' }}>{fmtCredits(d.totalCU)}</td>
                            <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-muted)' }}>{sharePct}%</td>
                            <td style={{ padding: '10px 16px', textAlign: 'right' }}>{Number(d.totalCalls ?? 0).toLocaleString('pt-BR')}</td>
                            <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-muted)' }}>{fmtCredits(avg)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </ChartCard>
          </>
        )}
      </div>
    </div>
  )
}
