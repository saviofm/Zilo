import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Treemap,
} from 'recharts'
import ChartCard, { Spinner, Empty, PageHeader, ZILOR_COLORS } from '../components/ChartCard'
import KpiCard, { fmtCredits } from '../components/KpiCard'
import { MonthNav } from '../components/ChartCard'
import { fetchUsageByModel } from '../api/finops'

export default function ByModelRoute({ onInsightsContext }) {
  const currentYM = new Date().toISOString().slice(0, 7)
  const [ym, setYm]         = useState(currentYM)
  const [loading, setLoading] = useState(true)
  const [data, setData]     = useState([])

  useEffect(() => {
    setLoading(true)
    fetchUsageByModel(ym).then(setData).finally(() => setLoading(false))
  }, [ym])

  const totalCU    = data.reduce((s, d) => s + d.totalCU, 0)
  const totalCalls = data.reduce((s, d) => s + d.totalCalls, 0)
  const topModel   = data[0]

  const byProvider = data.reduce((acc, d) => {
    const key = d.provider ?? 'Outro'
    if (!acc[key]) acc[key] = { provider: key, totalCU: 0, totalCalls: 0, count: 0 }
    acc[key].totalCU    += d.totalCU
    acc[key].totalCalls += d.totalCalls
    acc[key].count      += 1
    return acc
  }, {})
  const providerData = Object.values(byProvider).sort((a, b) => b.totalCU - a.totalCU)

  useEffect(() => {
    onInsightsContext?.({ label: 'Por Modelo', data: { yearMonth: ym, totalCU, topModel: topModel?.modelName, models: data } })
  }, [totalCU]) // eslint-disable-line

  const TT = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', boxShadow: 'var(--shadow-popover)', fontSize: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
        {payload.map((p, i) => <div key={i} style={{ color: p.color }}>{p.name}: <strong>{fmtCredits(p.value)}</strong></div>)}
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-shell)' }}>
      <PageHeader title="Consumo por Modelo LLM" controls={<MonthNav value={ym} onChange={setYm} />} />

      <div style={{ padding: '24px 32px' }}>
        {loading ? <Spinner /> : (
          <>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
              <KpiCard label="Créditos no período" value={fmtCredits(totalCU)} sub="Créditos de IA" icon="💰" />
              <KpiCard label="Modelos utilizados" value={data.length} sub="modelos distintos" icon="🤖" />
              <KpiCard label="Total de chats" value={totalCalls.toLocaleString('pt-BR')} sub="conversas" icon="💬" />
              {topModel && <KpiCard label="Modelo dominante" value={topModel.modelName?.split(' ').slice(0, 2).join(' ')} sub={`${topModel.sharePct}% dos créditos`} icon="🥇" />}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 0 }}>
              {/* Bar ranking */}
              <ChartCard title="Ranking por Créditos" subtitle="modelos com mais consumo">
                {data.length === 0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36)}>
                    <BarChart data={data.map(d => ({ ...d, name: d.modelName }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={fmtCredits} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                      <Tooltip formatter={v => fmtCredits(v)} />
                      <Bar dataKey="totalCU" name="Créditos" radius={[0, 4, 4, 0]}>
                        {data.map((_, i) => <Cell key={i} fill={ZILOR_COLORS[i % ZILOR_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              {/* Pie provider */}
              <ChartCard title="Share por Provider" subtitle="% de créditos por empresa de modelo">
                {providerData.length === 0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={providerData} dataKey="totalCU" nameKey="provider" cx="50%" cy="50%" outerRadius={90} label={({ provider, percent }) => `${provider} ${(percent * 100).toFixed(1)}%`} labelLine>
                        {providerData.map((_, i) => <Cell key={i} fill={ZILOR_COLORS[i % ZILOR_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => fmtCredits(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            {/* Detail table */}
            <ChartCard title="Detalhes por modelo">
              {data.length === 0 ? <Empty /> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa' }}>
                        {['Modelo', 'Provider', 'Créditos de IA', '% do total', 'Nº de chats', 'Média Créditos/chat'].map(h => (
                          <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Modelo' || h === 'Provider' ? 'left' : 'right', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((d, i) => (
                        <tr key={d.modelId} style={{ borderBottom: '1px solid var(--border)' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '10px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ width: 10, height: 10, borderRadius: '50%', background: ZILOR_COLORS[i % ZILOR_COLORS.length], flexShrink: 0 }} />
                              <span style={{ fontWeight: 500 }}>{d.modelName}</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>{d.provider}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--joule)', fontVariantNumeric: 'tabular-nums' }}>{fmtCredits(d.totalCU)}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{d.sharePct}%</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{d.totalCalls.toLocaleString('pt-BR')}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{fmtCredits(d.totalCalls > 0 ? d.totalCU / d.totalCalls : 0)}</td>
                        </tr>
                      ))}
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
