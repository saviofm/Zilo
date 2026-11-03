import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line,
} from 'recharts'
import ChartCard, { Spinner, Empty, PageHeader, ZILOR_COLORS } from '../components/ChartCard'
import KpiCard, { fmtCredits, pctColor } from '../components/KpiCard'
import { MonthNav } from '../components/ChartCard'
import { fetchUsageByUser, fetchAdminLedger, fetchUsageByMonth } from '../api/finops'

function fmtTs(ts) {
  if (!ts) return '—'
  try { return new Date(ts).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) }
  catch { return ts }
}

function UserDetailModal({ user, ym, onClose }) {
  const [ledger, setLedger] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchAdminLedger(ym, 100).then(rows => {
      setLedger(rows.filter(r => r.userId === user.userId))
    }).finally(() => setLoading(false))
  }, [user.userId, ym])

  const pct = user.budgetCU > 0 ? Math.min(100, Math.round((user.totalCU / user.budgetCU) * 100)) : 0
  const color = pctColor(pct)

  // Timeline: aggregate by day
  const byDay = ledger.reduce((acc, r) => {
    const day = r.timestamp?.slice(0, 10) ?? 'n/d'
    if (!acc[day]) acc[day] = { day, cu: 0, calls: 0 }
    acc[day].cu    += Number(r.totalCU ?? 0)
    acc[day].calls += 1
    return acc
  }, {})
  const timeline = Object.values(byDay).sort((a, b) => a.day.localeCompare(b.day))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: 860, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{user.displayName}</h2>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {user.email} · {user.jobRoleName} · {user.department}
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-muted)', padding: 4 }}>×</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: 24 }}>
          {/* KPIs */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            <KpiCard label="Créditos consumidos" value={fmtCredits(user.totalCU)} sub="no mês" />
            <KpiCard label="Budget mensal" value={user.budgetCU > 0 ? fmtCredits(user.budgetCU) : '—'} sub="Créditos de IA" />
            <KpiCard label="Utilização" value={`${pct}%`} sub={pct >= 90 ? '⚠️ próximo do limite' : 'do budget'} color={color} />
            <KpiCard label="Total de chats" value={user.totalCalls.toLocaleString('pt-BR')} sub="conversas" />
          </div>

          {/* Progress bar */}
          {user.budgetCU > 0 && (
            <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8, fontWeight: 600 }}>
                <span>Utilização do budget</span>
                <span style={{ color }}>{pct}%</span>
              </div>
              <div style={{ height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(to right, var(--accent), ${color})`, borderRadius: 99, transition: 'width 0.5s' }} />
              </div>
            </div>
          )}

          {/* Timeline chart */}
          {timeline.length > 1 && (
            <ChartCard title="Consumo diário no período">
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                  <YAxis tickFormatter={fmtCredits} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                  <Tooltip formatter={v => fmtCredits(v)} />
                  <Bar dataKey="cu" name="Créditos" fill="#8CC63E" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Ledger table */}
          {loading ? <Spinner /> : ledger.length === 0 ? <Empty msg="Nenhum registro neste período." /> : (
            <ChartCard title={`${ledger.length} entradas no período`}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                      {['Data/Hora', 'Perfil de IA', 'Modelo', 'Tokens', 'Créditos de IA'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: h.includes('Token') || h.includes('Crédito') ? 'right' : 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((e, i) => (
                      <tr key={e.id ?? i} style={{ borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={ev => ev.currentTarget.style.background = '#f8f9fa'}
                        onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtTs(e.timestamp)}</td>
                        <td style={{ padding: '8px 12px', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.orchestration?.name ?? '—'}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.model?.displayName ?? '—'}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{((e.inputTokens ?? 0) + (e.outputTokens ?? 0)).toLocaleString('pt-BR')}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--joule)', fontVariantNumeric: 'tabular-nums' }}>{fmtCredits(e.totalCU)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DrilldownRoute({ onInsightsContext }) {
  const currentYM = new Date().toISOString().slice(0, 7)
  const [ym, setYm]         = useState(currentYM)
  const [loading, setLoading] = useState(true)
  const [data, setData]     = useState([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('totalCU')
  const [selectedUser, setSelectedUser] = useState(null)

  useEffect(() => {
    setLoading(true)
    fetchUsageByUser(ym).then(setData).finally(() => setLoading(false))
  }, [ym])

  const filtered = data
    .filter(u => !search || u.displayName?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()) || u.jobRoleName?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'totalCU')    return Number(b.totalCU ?? 0) - Number(a.totalCU ?? 0)
      if (sortBy === 'totalCalls') return Number(b.totalCalls ?? 0) - Number(a.totalCalls ?? 0)
      if (sortBy === 'pct')        return Number(b.percentUsed ?? 0) - Number(a.percentUsed ?? 0)
      return (a.displayName ?? '').localeCompare(b.displayName ?? '')
    })

  const totalCU    = data.reduce((s, u) => s + Number(u.totalCU ?? 0), 0)
  const totalUsers = data.length
  const atRisk     = data.filter(u => Number(u.percentUsed ?? 0) >= 80).length

  useEffect(() => {
    onInsightsContext?.({ label: 'Drill-down Usuários', data: { yearMonth: ym, totalUsers, atRisk, topUsers: data.slice(0, 10) } })
  }, [totalUsers]) // eslint-disable-line

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-shell)' }}>
      <PageHeader title="Drill-down por Usuário" controls={<MonthNav value={ym} onChange={setYm} />} />

      <div style={{ padding: '24px 32px' }}>
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: 12, color: '#92400e' }}>
          ⚠️ <strong>Roadmap:</strong> autenticação e controle de acesso por role (ZiloAdmin) pendente de implementação. Atualmente sem restrição.
        </div>

        {loading ? <Spinner /> : (
          <>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
              <KpiCard label="Usuários ativos" value={totalUsers} sub="colaboradores" icon="👥" />
              <KpiCard label="Créditos totais" value={fmtCredits(totalCU)} sub="período selecionado" icon="💰" />
              <KpiCard label="Usuários em risco" value={atRisk} sub="≥ 80% do budget" icon="⚠️" color={atRisk > 0 ? '#F05A22' : '#01502D'} />
              <KpiCard label="Média por usuário" value={fmtCredits(totalUsers > 0 ? totalCU / totalUsers : 0)} sub="Créditos de IA" icon="📊" />
            </div>

            {/* Search + sort */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, email ou cargo…"
                style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: 'var(--text-primary)', background: '#fff' }} />
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: 'var(--text-primary)', background: '#fff', cursor: 'pointer' }}>
                <option value="totalCU">Ordenar por Créditos</option>
                <option value="totalCalls">Ordenar por Chats</option>
                <option value="pct">Ordenar por % do Budget</option>
                <option value="name">Ordenar por Nome</option>
              </select>
            </div>

            {/* Table */}
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
                {filtered.length} usuários {search ? `(filtrado de ${data.length})` : ''} — clique em um usuário para ver o drill-down completo
              </div>
              {filtered.length === 0 ? <Empty /> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa' }}>
                        {['Usuário', 'Cargo', 'Departamento', 'Créditos de IA', '% Budget', 'Chats', 'Status'].map(h => (
                          <th key={h} style={{ padding: '10px 16px', textAlign: ['Créditos de IA', '% Budget', 'Chats'].includes(h) ? 'right' : 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((u, i) => {
                        const pct   = Number(u.percentUsed ?? 0)
                        const color = pctColor(pct)
                        const statusLabel = pct >= 90 ? '🔴 Crítico' : pct >= 70 ? '🟡 Atenção' : '🟢 Normal'
                        return (
                          <tr key={u.userId} onClick={() => setSelectedUser(u)}
                            style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f0f8e8'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.displayName}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                            </td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{u.jobRoleName}</td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{u.department}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--joule)' }}>{fmtCredits(u.totalCU)}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              <span style={{ fontWeight: 700, color, background: `${color}18`, padding: '2px 8px', borderRadius: 20, fontSize: 12 }}>{pct}%</span>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>{Number(u.totalCalls ?? 0).toLocaleString('pt-BR')}</td>
                            <td style={{ padding: '12px 16px', fontSize: 12 }}>{statusLabel}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {selectedUser && (
        <UserDetailModal user={selectedUser} ym={ym} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  )
}
