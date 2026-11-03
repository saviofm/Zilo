import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import ChartCard, { Spinner, Empty, PageHeader, ZILOR_COLORS } from '../components/ChartCard'
import KpiCard, { fmtCredits } from '../components/KpiCard'
import { MonthNav } from '../components/ChartCard'
import { fetchUsageByJobRole } from '../api/finops'

export default function ByJobRoleRoute({ onInsightsContext }) {
  const currentYM = new Date().toISOString().slice(0, 7)
  const [ym, setYm]       = useState(currentYM)
  const [loading, setLoading] = useState(true)
  const [data, setData]   = useState([])

  useEffect(() => {
    setLoading(true)
    fetchUsageByJobRole(ym).then(setData).finally(() => setLoading(false))
  }, [ym])

  const totalCU    = data.reduce((s, d) => s + Number(d.totalCU ?? 0), 0)
  const totalUsers = data.reduce((s, d) => s + Number(d.userCount ?? 0), 0)
  const topRole    = data[0]

  // Group by department
  const byDept = data.reduce((acc, d) => {
    const k = d.department ?? 'Outros'
    if (!acc[k]) acc[k] = { department: k, totalCU: 0, userCount: 0, roles: [] }
    acc[k].totalCU   += Number(d.totalCU ?? 0)
    acc[k].userCount += Number(d.userCount ?? 0)
    acc[k].roles.push(d.jobRoleName)
    return acc
  }, {})
  const deptData = Object.values(byDept).sort((a, b) => b.totalCU - a.totalCU)

  // Group by directorate
  const byDir = data.reduce((acc, d) => {
    const k = d.directorate ?? 'Outros'
    if (!acc[k]) acc[k] = { directorate: k, totalCU: 0 }
    acc[k].totalCU += Number(d.totalCU ?? 0)
    return acc
  }, {})
  const dirData = Object.values(byDir).sort((a, b) => b.totalCU - a.totalCU)

  useEffect(() => {
    onInsightsContext?.({ label: 'Por Cargo', data: { yearMonth: ym, totalCU, topRole: topRole?.jobRoleName, roles: data } })
  }, [totalCU]) // eslint-disable-line

  const TT = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', boxShadow: 'var(--shadow-popover)', fontSize: 12 }}>
        {payload.map((p, i) => <div key={i} style={{ color: p.color }}>{p.name}: <strong>{p.name === 'Créditos' ? fmtCredits(p.value) : p.value}</strong></div>)}
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-shell)' }}>
      <PageHeader title="Consumo por Cargo" controls={<MonthNav value={ym} onChange={setYm} />} />

      <div style={{ padding: '24px 32px' }}>
        {loading ? <Spinner /> : (
          <>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
              <KpiCard label="Créditos no período" value={fmtCredits(totalCU)} sub="Créditos de IA" icon="💰" />
              <KpiCard label="Cargos ativos" value={data.length} sub="funções distintas" icon="💼" />
              <KpiCard label="Departamentos" value={deptData.length} sub="áreas utilizando" icon="🏢" />
              {topRole && <KpiCard label="Cargo de maior consumo" value={topRole.jobRoleName} sub={`${fmtCredits(topRole.totalCU)} Créditos`} icon="🏆" />}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 0 }}>
              {/* Bar por cargo */}
              <ChartCard title="Créditos por Cargo" subtitle="ranking de consumo">
                {data.length === 0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={Math.max(200, data.length * 44)}>
                    <BarChart data={data.map(d => ({ name: d.jobRoleName, cu: Number(d.totalCU ?? 0), users: Number(d.userCount ?? 0) }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={fmtCredits} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                      <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                      <Tooltip content={<TT />} />
                      <Bar dataKey="cu" name="Créditos" radius={[0, 4, 4, 0]}>
                        {data.map((_, i) => <Cell key={i} fill={ZILOR_COLORS[i % ZILOR_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              {/* Pie por departamento */}
              <ChartCard title="Share por Departamento">
                {deptData.length === 0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={deptData.map(d => ({ name: d.department, value: d.totalCU }))} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2}>
                        {deptData.map((_, i) => <Cell key={i} fill={ZILOR_COLORS[i % ZILOR_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => fmtCredits(v)} />
                      <Legend iconType="circle" iconSize={9} formatter={v => <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            {/* Grouped: CU per user per dept */}
            <ChartCard title="Crédito médio por usuário" subtitle="CU total ÷ usuários ativos no cargo">
              {data.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.map(d => ({
                    name: d.jobRoleName,
                    cuPerUser: d.userCount > 0 ? Math.round((Number(d.totalCU ?? 0) / Number(d.userCount)) * 100) / 100 : 0,
                    users: Number(d.userCount ?? 0),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <YAxis tickFormatter={fmtCredits} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <Tooltip formatter={v => fmtCredits(v)} />
                    <Bar dataKey="cuPerUser" name="CU médio/usuário" radius={[4, 4, 0, 0]}>
                      {data.map((_, i) => <Cell key={i} fill={ZILOR_COLORS[i % ZILOR_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Diretoria table */}
            {dirData.length > 1 && (
              <ChartCard title="Consolidado por Diretoria">
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa' }}>
                        {['Diretoria', 'Créditos de IA', '% do total'].map(h => (
                          <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Diretoria' ? 'left' : 'right', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid var(--border)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dirData.map((d, i) => (
                        <tr key={d.directorate} style={{ borderBottom: '1px solid var(--border)' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '10px 16px', fontWeight: 500 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ width: 10, height: 10, borderRadius: '50%', background: ZILOR_COLORS[i % ZILOR_COLORS.length], flexShrink: 0 }} />
                              {d.directorate}
                            </div>
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--joule)' }}>{fmtCredits(d.totalCU)}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-muted)' }}>{totalCU > 0 ? ((d.totalCU / totalCU) * 100).toFixed(1) : '0'}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ChartCard>
            )}
          </>
        )}
      </div>
    </div>
  )
}
