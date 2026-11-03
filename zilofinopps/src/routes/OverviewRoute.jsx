import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts'
import ChartCard, { Spinner, Empty, PageHeader, ZILOR_COLORS } from '../components/ChartCard'
import KpiCard, { fmtCredits, pctColor } from '../components/KpiCard'
import {
  fetchUsageByMonth, fetchUsageByOrchestration,
  fetchUsageByUser, fetchAllMonthlySummary,
} from '../api/finops'

function fmtYM(ym) {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', boxShadow: 'var(--shadow-popover)', fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: <strong>{fmtCredits(p.value)}</strong></div>
      ))}
    </div>
  )
}

export default function OverviewRoute({ onInsightsContext }) {
  const [loading, setLoading] = useState(true)
  const [months, setMonths]   = useState([])
  const [byOrch, setByOrch]   = useState([])
  const [byUser, setByUser]   = useState([])
  const [allSummary, setAllSummary] = useState([])

  useEffect(() => {
    setLoading(true)
    const currentYM = new Date().toISOString().slice(0, 7)
    Promise.all([
      fetchUsageByMonth(12),
      fetchUsageByOrchestration(currentYM),
      fetchUsageByUser(currentYM),
      fetchAllMonthlySummary(),
    ]).then(([m, o, u, s]) => {
      setMonths(m); setByOrch(o); setByUser(u); setAllSummary(s)
    }).finally(() => setLoading(false))
  }, [])

  const currentYM = new Date().toISOString().slice(0, 7)
  const currentMonth  = months.find(m => m.yearMonth === currentYM)
  const prevMonthData = months.find(m => m.yearMonth === (
    (() => { const [y, mo] = currentYM.split('-').map(Number); return mo === 1 ? `${y-1}-12` : `${y}-${String(mo-1).padStart(2,'0')}` })()
  ))

  const totalCU    = currentMonth?.totalCU ?? 0
  const prevCU     = prevMonthData?.totalCU ?? 0
  const trend      = prevCU > 0 ? Math.round(((totalCU - prevCU) / prevCU) * 100) : null
  const totalCalls = currentMonth?.totalCalls ?? 0
  const activeUsers = byUser.length
  const topUser     = byUser[0]

  const overallMax = Math.max(...allSummary.map(s => s.budgetCU ?? 0), 1)

  useEffect(() => {
    onInsightsContext?.({
      label: 'Visão Geral',
      data: { currentMonth: currentYM, totalCU, totalCalls, activeUsers, trend, top5Personas: byOrch.slice(0, 5), top5Users: byUser.slice(0, 5) }
    })
  }, [totalCU, totalCalls]) // eslint-disable-line

  if (loading) return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-shell)' }}>
      <PageHeader title="Visão Geral" />
      <div style={{ padding: '24px 32px' }}><Spinner /></div>
    </div>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-shell)' }}>
      <PageHeader title="Visão Geral" subtitle={`mês atual: ${currentYM}`} />

      <div style={{ padding: '24px 32px' }}>
        {/* KPIs */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
          <KpiCard label="Créditos consumidos (mês)" value={fmtCredits(totalCU)} sub="Créditos de IA" trend={trend} icon="💰" />
          <KpiCard label="Total de chats (mês)" value={totalCalls.toLocaleString('pt-BR')} sub="conversas com IA" icon="💬" />
          <KpiCard label="Usuários ativos (mês)" value={activeUsers} sub="colaboradores" icon="👥" />
          {topUser && (
            <KpiCard label="Maior consumidor" value={topUser.displayName?.split(' ')[0] ?? topUser.userId}
              sub={`${fmtCredits(topUser.totalCU)} Créditos`} icon="🏆" />
          )}
        </div>

        {/* Trend area chart */}
        <ChartCard title="Evolução mensal de consumo" subtitle="últimos 12 meses">
          {months.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={months.map(m => ({ ...m, ym: fmtYM(m.yearMonth) }))}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8CC63E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8CC63E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="ym" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis tickFormatter={fmtCredits} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={60} />
                <Tooltip content={<TT />} />
                <Area type="monotone" dataKey="totalCU" name="Créditos de IA" stroke="#8CC63E" fill="url(#areaGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 0 }}>
          {/* Top personas */}
          <ChartCard title="Top perfis de IA" subtitle="mês atual">
            {byOrch.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byOrch.slice(0, 6).map(o => ({ name: o.orchestrationName?.replace('Zilo ', ''), cu: o.totalCU }))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tickFormatter={fmtCredits} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                  <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip formatter={(v) => fmtCredits(v)} />
                  <Bar dataKey="cu" name="Créditos" radius={[0, 4, 4, 0]}>
                    {byOrch.slice(0, 6).map((_, i) => <Cell key={i} fill={ZILOR_COLORS[i % ZILOR_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Top users */}
          <ChartCard title="Top 5 usuários" subtitle="mês atual — por créditos">
            {byUser.length === 0 ? <Empty /> : (
              <div>
                {byUser.slice(0, 5).map((u, i) => {
                  const pct = u.budgetCU > 0 ? Math.min(100, Math.round((u.totalCU / u.budgetCU) * 100)) : 0
                  return (
                    <div key={u.userId} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 700, color: 'var(--accent)', width: 16, fontSize: 11 }}>#{i+1}</span>
                          <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{u.displayName}</span>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{u.jobRoleName}</span>
                        </div>
                        <span style={{ color: pctColor(pct), fontWeight: 600, flexShrink: 0 }}>{fmtCredits(u.totalCU)}</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(to right, var(--accent), ${pctColor(pct)})`, borderRadius: 99 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ChartCard>
        </div>

        {/* Budget utilization per month */}
        {allSummary.length > 0 && (
          <ChartCard title="Utilização vs Budget histórico" subtitle="% médio mensal por budget" style={{ marginTop: 20 }}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={allSummary.slice(0, 12).reverse().map(s => ({
                ym: fmtYM(s.yearMonth),
                pct: Number(s.percentUsed ?? 0),
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="ym" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis unit="%" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} domain={[0, 100]} />
                <Tooltip formatter={v => `${v}%`} />
                <Bar dataKey="pct" name="% utilizado" radius={[4, 4, 0, 0]}>
                  {allSummary.slice(0, 12).map((s, i) => (
                    <Cell key={i} fill={pctColor(Number(s.percentUsed ?? 0))} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>
    </div>
  )
}
