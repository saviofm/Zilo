import { useState, useEffect } from 'react'
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Area, AreaChart,
} from 'recharts'
import ChartCard, { Spinner, Empty, PageHeader, ZILOR_COLORS } from '../components/ChartCard'
import KpiCard, { fmtCredits } from '../components/KpiCard'
import { fetchUsageByMonth, fetchUsageByOrchestration, fetchAdminLedger } from '../api/finops'

function fmtYM(ym) {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', boxShadow: 'var(--shadow-popover)', fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color }}>{p.name}: <strong>{fmtCredits(p.value)}</strong></div>)}
    </div>
  )
}

export default function ByMonthRoute({ onInsightsContext }) {
  const [loading, setLoading] = useState(true)
  const [months, setMonths]   = useState([])
  const [range, setRange]     = useState(12)

  useEffect(() => {
    setLoading(true)
    fetchUsageByMonth(Math.max(range, 12)).then(setMonths).finally(() => setLoading(false))
  }, [range])

  const displayed    = months.slice(-range)
  const totalCU      = displayed.reduce((s, m) => s + m.totalCU, 0)
  const totalCalls   = displayed.reduce((s, m) => s + m.totalCalls, 0)
  const avgCU        = displayed.length > 0 ? totalCU / displayed.length : 0
  const maxMonth     = displayed.reduce((max, m) => m.totalCU > (max?.totalCU ?? 0) ? m : max, null)
  const growthMonths = displayed.filter((_, i) => i > 0)
  const avgGrowth    = growthMonths.length > 1 ? (() => {
    const rates = displayed.slice(1).map((m, i) => {
      const prev = displayed[i].totalCU
      return prev > 0 ? ((m.totalCU - prev) / prev) * 100 : 0
    })
    return Math.round(rates.reduce((s, r) => s + r, 0) / rates.length)
  })() : null

  // Cumulative data
  const cumData = displayed.reduce((acc, m, i) => {
    const cumCU = (acc[i - 1]?.cumCU ?? 0) + m.totalCU
    acc.push({ ym: fmtYM(m.yearMonth), totalCU: m.totalCU, totalCalls: m.totalCalls, cumCU })
    return acc
  }, [])

  useEffect(() => {
    onInsightsContext?.({ label: 'Mês a Mês', data: { range, totalCU, totalCalls, avgCU, months: displayed } })
  }, [totalCU]) // eslint-disable-line

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-shell)' }}>
      <PageHeader title="Consumo Mês a Mês" controls={
        <div style={{ display: 'flex', gap: 6 }}>
          {[3, 6, 12].map(r => (
            <button key={r} onClick={() => setRange(r)}
              style={{ padding: '4px 12px', borderRadius: 6, border: `1.5px solid ${range === r ? 'var(--accent)' : 'var(--border)'}`, background: range === r ? 'var(--accent-light)' : '#fff', color: range === r ? 'var(--joule)' : 'var(--text-muted)', fontSize: 12, fontWeight: range === r ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>
              {r}m
            </button>
          ))}
        </div>
      } />

      <div style={{ padding: '24px 32px' }}>
        {loading ? <Spinner /> : (
          <>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
              <KpiCard label={`Total ${range} meses`} value={fmtCredits(totalCU)} sub="Créditos de IA" icon="💰" />
              <KpiCard label="Média mensal" value={fmtCredits(avgCU)} sub="Créditos de IA / mês" icon="📊" />
              <KpiCard label="Total de chats" value={totalCalls.toLocaleString('pt-BR')} sub={`em ${range} meses`} icon="💬" />
              {maxMonth && <KpiCard label="Pico de consumo" value={fmtYM(maxMonth.yearMonth)} sub={fmtCredits(maxMonth.totalCU) + ' Créditos'} icon="📈" />}
              {avgGrowth !== null && <KpiCard label="Crescimento médio" value={`${avgGrowth >= 0 ? '+' : ''}${avgGrowth}%`} sub="mês a mês" color={avgGrowth > 20 ? '#F05A22' : avgGrowth > 0 ? '#f59e0b' : '#01502D'} icon="📐" />}
            </div>

            <ChartCard title="Créditos consumidos por mês" subtitle="barras = mês; linha = acumulado no período">
              {displayed.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={cumData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="ym" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis yAxisId="left" tickFormatter={fmtCredits} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={60} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={fmtCredits} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={60} />
                    <Tooltip content={<TT />} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="totalCU" name="Créditos/mês" fill="#8CC63E" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="cumCU" name="Acumulado" stroke="#01502D" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Volume de chats por mês" subtitle="número de conversas com IA">
              {displayed.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={cumData}>
                    <defs>
                      <linearGradient id="callsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#01502D" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#01502D" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="ym" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="totalCalls" name="Chats" stroke="#01502D" fill="url(#callsGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Table */}
            <ChartCard title="Detalhes por mês">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                      {['Mês', 'Créditos consumidos', 'Nº de chats', 'Média Créditos/chat', 'Variação mês anterior'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Mês' ? 'left' : 'right', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...displayed].reverse().map((m, i, arr) => {
                      const prev = arr[i + 1]
                      const chg = prev?.totalCU > 0 ? Math.round(((m.totalCU - prev.totalCU) / prev.totalCU) * 100) : null
                      const avg = m.totalCalls > 0 ? m.totalCU / m.totalCalls : 0
                      return (
                        <tr key={m.yearMonth} style={{ borderBottom: '1px solid var(--border)' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{fmtYM(m.yearMonth)}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--joule)', fontVariantNumeric: 'tabular-nums' }}>{fmtCredits(m.totalCU)}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{m.totalCalls.toLocaleString('pt-BR')}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{fmtCredits(avg)}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: chg == null ? 'var(--text-disabled)' : chg > 0 ? '#F05A22' : '#01502D' }}>
                            {chg == null ? '—' : `${chg >= 0 ? '+' : ''}${chg}%`}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          </>
        )}
      </div>
    </div>
  )
}
