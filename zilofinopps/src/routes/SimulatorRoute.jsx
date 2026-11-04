import { useState, useEffect, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'
import ChartCard, { PageHeader, ZILOR_COLORS } from '../components/ChartCard'
import KpiCard, { fmtCredits, pctColor } from '../components/KpiCard'
import { fetchJobRoles, fetchOrchestrations } from '../api/models'

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 14, padding: '40px 0', justifyContent: 'center' }}>
      <div className="animate-spin-custom" style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--accent-light)', borderTopColor: 'var(--accent)' }} />
      Carregando dados…
    </div>
  )
}

function TabBar({ active, onChange }) {
  const tabs = [
    { id: 'volume', label: 'Por Volume de Mensagens', desc: 'informe quantas mensagens/mês por usuário' },
    { id: 'cota',   label: 'Por Cota',                desc: 'quantos chats cabem dentro do limite de cada cargo' },
  ]
  return (
    <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid var(--border)' }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          style={{
            padding: '10px 24px', border: 'none', background: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 13, fontWeight: active === t.id ? 700 : 500,
            color: active === t.id ? 'var(--joule)' : 'var(--text-muted)',
            borderBottom: active === t.id ? '2px solid var(--joule)' : '2px solid transparent',
            marginBottom: -2, transition: 'color 0.15s',
          }}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ─── Aba: Por Volume ──────────────────────────────────────────────────────────
function TabVolume({ orchs, scenario, updateRow, globalOrchId, setGlobalOrchId }) {
  const [msgsPerMonth, setMsgsPerMonth] = useState(110)

  const globalOrch = useMemo(() => orchs.find(o => o.id === globalOrchId), [orchs, globalOrchId])

  const results = useMemo(() => scenario.map(row => {
    const orch = orchs.find(o => o.id === (row.orchId || globalOrchId))
    const orchCU = Number(orch?.orchestrationCUPerCall ?? 0.0008)
    const cuPerUser = orchCU * msgsPerMonth
    const totalCU = cuPerUser * row.userCount
    const budgetUsedPct = row.budget > 0 ? Math.round((cuPerUser / row.budget) * 100) : null
    return { ...row, orchName: orch?.name ?? '—', orchCU, cuPerUser, totalCU, budgetUsedPct }
  }), [scenario, orchs, globalOrchId, msgsPerMonth])

  const grandTotal = results.reduce((s, r) => s + r.totalCU, 0)
  const grandUsers = results.reduce((s, r) => s + r.userCount, 0)
  const atRisk = results.filter(r => r.budgetUsedPct != null && r.budgetUsedPct > 100).length
  const pieData = results.filter(r => r.totalCU > 0).map(r => ({ name: r.jobRoleName, value: r.totalCU }))

  function exportCSV() {
    const rows = [
      ['Cargo', 'Usuários', 'Perfil de IA', 'CU/chamada', 'Msgs/mês', 'Créditos/usuário', 'Limite', '% Limite', 'Total/mês'],
      ...results.map(r => [r.jobRoleName, r.userCount, r.orchName, r.orchCU.toFixed(6), msgsPerMonth, r.cuPerUser.toFixed(4), r.budget, r.budgetUsedPct ?? '—', r.totalCU.toFixed(4)]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'simulacao_volume.csv'; a.click()
  }

  return (
    <>
      {/* Controles globais */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              Mensagens por usuário/mês:
            </label>
            <input type="number" min={1} max={9999} value={msgsPerMonth}
              onChange={e => setMsgsPerMonth(Math.max(1, Number(e.target.value)))}
              style={{ width: 80, padding: '7px 10px', border: '1.5px solid var(--joule)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', fontWeight: 700, textAlign: 'center' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>msgs/mês</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              Perfil de IA padrão:
            </label>
            <select value={globalOrchId} onChange={e => setGlobalOrchId(e.target.value)}
              style={{ padding: '7px 12px', border: '1.5px solid var(--accent)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: 'var(--text-primary)', background: '#fff', cursor: 'pointer', minWidth: 200 }}>
              {orchs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          {globalOrch && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Custo/chamada: <strong>{globalOrch.orchestrationCUPerCall} Créditos de IA</strong>
            </div>
          )}
          <button className="btn-accent" onClick={exportCSV} style={{ fontSize: 12, marginLeft: 'auto' }}>⬇ Exportar CSV</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
        <KpiCard label="Custo mensal estimado" value={fmtCredits(grandTotal)} sub="Créditos de IA" icon="💰" color="var(--joule)" />
        <KpiCard label="Total de usuários" value={grandUsers} sub="no cenário" icon="👥" />
        <KpiCard label="Custo médio por usuário" value={fmtCredits(grandUsers > 0 ? grandTotal / grandUsers : 0)} sub="Créditos/mês" icon="📊" />
        <KpiCard label="Cargos acima do limite" value={atRisk} sub={atRisk > 0 ? 'revisar budgets' : 'dentro do limite'} icon={atRisk > 0 ? '⚠️' : '✅'} color={atRisk > 0 ? '#F05A22' : '#01502D'} />
      </div>

      {/* Tabela */}
      <ChartCard title="Consumo por cargo" subtitle={`baseado em ${msgsPerMonth} mensagens/mês por usuário`}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {['Cargo', 'Usuários', 'Perfil de IA', 'CU/chamada', 'Créditos/usuário', '% Limite', 'Total/mês'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Cargo' || h === 'Perfil de IA' ? 'left' : 'right', fontWeight: 600, color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map(r => (
                <tr key={r.jobRoleId} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                    <div>{r.jobRoleName}</div>
                    {r.department && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>{r.department}</div>}
                  </td>
                  <td style={{ padding: '6px 12px', textAlign: 'right' }}>
                    <input type="number" min={0} max={9999} value={r.userCount}
                      onChange={e => updateRow(r.jobRoleId, 'userCount', Math.max(0, Number(e.target.value)))}
                      style={{ width: 60, textAlign: 'right', padding: '4px 6px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontFamily: 'inherit' }} />
                  </td>
                  <td style={{ padding: '6px 12px' }}>
                    <select value={r.orchId} onChange={e => updateRow(r.jobRoleId, 'orchId', e.target.value)}
                      style={{ padding: '4px 6px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, fontFamily: 'inherit', background: '#fff', maxWidth: 180, cursor: 'pointer' }}>
                      <option value="">Padrão</option>
                      {orchs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{r.orchCU.toFixed(6)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--joule)', fontVariantNumeric: 'tabular-nums' }}>{fmtCredits(r.cuPerUser)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    {r.budgetUsedPct != null ? (
                      <span style={{ fontWeight: 700, color: pctColor(r.budgetUsedPct), background: r.budgetUsedPct > 100 ? '#fff0eb' : r.budgetUsedPct > 80 ? '#fffbeb' : 'var(--accent-light)', padding: '2px 8px', borderRadius: 20, fontSize: 12 }}>
                        {r.budgetUsedPct}%
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtCredits(r.totalCU)}</td>
                </tr>
              ))}
              <tr style={{ background: 'var(--accent-light)', borderTop: '2px solid var(--accent)' }}>
                <td style={{ padding: '12px', fontWeight: 700, color: 'var(--joule)' }}>TOTAL</td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700 }}>{grandUsers}</td>
                <td colSpan={4} />
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, color: 'var(--joule)', fontSize: 15 }}>{fmtCredits(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* Gráficos */}
      {pieData.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
          <ChartCard title="Custo total por cargo">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={results.filter(r => r.totalCU > 0).map(r => ({ name: r.jobRoleName, cu: r.totalCU }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tickFormatter={fmtCredits} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <Tooltip formatter={v => fmtCredits(v)} />
                <Bar dataKey="cu" name="Créditos/mês" radius={[4, 4, 0, 0]}>
                  {results.map((_, i) => <Cell key={i} fill={ZILOR_COLORS[i % ZILOR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Distribuição por cargo">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {pieData.map((_, i) => <Cell key={i} fill={ZILOR_COLORS[i % ZILOR_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => fmtCredits(v)} />
                <Legend iconType="circle" iconSize={9} formatter={v => <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </>
  )
}

// ─── Aba: Por Cota ────────────────────────────────────────────────────────────
// Mostra alocação orçamentária: cota por cargo × nº de usuários = CU alocado total
// Não depende de volume de mensagens — é sobre quanto orçamento está comprometido
function TabCota({ scenario, updateRow }) {
  const results = useMemo(() => scenario.map(row => ({
    ...row,
    cotaTotal: row.budget * row.userCount,          // CU alocado para esse cargo
    sharePct:  0,                                    // preenchido abaixo
  })), [scenario])

  const grandTotal = results.reduce((s, r) => s + r.cotaTotal, 0)
  const grandUsers = results.reduce((s, r) => s + r.userCount, 0)
  const maxCota    = Math.max(...results.map(r => r.cotaTotal), 1)
  const withShare  = results.map(r => ({ ...r, sharePct: grandTotal > 0 ? (r.cotaTotal / grandTotal) * 100 : 0 }))

  const highestCargo = withShare.reduce((m, r) => r.cotaTotal > (m?.cotaTotal ?? 0) ? r : m, null)
  const lowestCargo  = withShare.filter(r => r.userCount > 0).reduce((m, r) => r.budget < (m?.budget ?? Infinity) ? r : m, null)

  function exportCSV() {
    const rows = [
      ['Cargo', 'Usuários', 'Cota/usuário (CU/mês)', 'CU alocado total', '% do total'],
      ...withShare.map(r => [r.jobRoleName, r.userCount, r.budget, r.cotaTotal.toFixed(4), r.sharePct.toFixed(1) + '%']),
      ['TOTAL', grandUsers, '', grandTotal.toFixed(4), '100%'],
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'simulacao_cotas.csv'; a.click()
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn-accent" onClick={exportCSV} style={{ fontSize: 12 }}>⬇ Exportar CSV</button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
        <KpiCard label="Cotas alocadas total" value={fmtCredits(grandTotal)} sub="CU comprometidos/mês" icon="💰" color="var(--joule)" />
        <KpiCard label="Total de usuários" value={grandUsers} sub="no cenário" icon="👥" />
        <KpiCard label="Média de cota/usuário" value={fmtCredits(grandUsers > 0 ? grandTotal / grandUsers : 0)} sub="CU por usuário/mês" icon="📊" />
        {highestCargo && <KpiCard label="Maior peso orçamentário" value={highestCargo.jobRoleName} sub={`${fmtCredits(highestCargo.cotaTotal)} CU (${highestCargo.sharePct.toFixed(1)}%)`} icon="📈" />}
      </div>

      {/* Tabela */}
      <ChartCard title="Alocação de cotas por cargo" subtitle="cota por usuário × número de usuários = CU orçado total">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {['Cargo', 'Usuários', 'Cota/usuário (CU/mês)', 'CU alocado total', '% do total', 'Distribuição'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Cargo' || h === 'Distribuição' ? 'left' : 'right', fontWeight: 600, color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {withShare.map((r, i) => (
                <tr key={r.jobRoleId} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                    <div>{r.jobRoleName}</div>
                    {r.department && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>{r.department}</div>}
                  </td>
                  <td style={{ padding: '6px 12px', textAlign: 'right' }}>
                    <input type="number" min={0} max={9999} value={r.userCount}
                      onChange={e => updateRow(r.jobRoleId, 'userCount', Math.max(0, Number(e.target.value)))}
                      style={{ width: 60, textAlign: 'right', padding: '4px 6px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontFamily: 'inherit' }} />
                  </td>
                  <td style={{ padding: '6px 12px', textAlign: 'right' }}>
                    <input type="number" min={0} value={r.budget}
                      onChange={e => updateRow(r.jobRoleId, 'budget', Math.max(0, Number(e.target.value)))}
                      style={{ width: 80, textAlign: 'right', padding: '4px 6px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontFamily: 'inherit' }} />
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--joule)', fontVariantNumeric: 'tabular-nums' }}>{fmtCredits(r.cotaTotal)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.sharePct.toFixed(1)}%</span>
                  </td>
                  <td style={{ padding: '10px 16px', minWidth: 120 }}>
                    <div style={{ height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${maxCota > 0 ? (r.cotaTotal / maxCota) * 100 : 0}%`, background: ZILOR_COLORS[i % ZILOR_COLORS.length], borderRadius: 99, transition: 'width 0.3s' }} />
                    </div>
                  </td>
                </tr>
              ))}
              <tr style={{ background: 'var(--accent-light)', borderTop: '2px solid var(--accent)' }}>
                <td style={{ padding: '12px', fontWeight: 700, color: 'var(--joule)' }}>TOTAL</td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700 }}>{grandUsers}</td>
                <td />
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, color: 'var(--joule)', fontSize: 15 }}>{fmtCredits(grandTotal)}</td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700 }}>100%</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* Gráfico */}
      {withShare.some(r => r.cotaTotal > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
          <ChartCard title="CU alocado por cargo">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={withShare.filter(r => r.cotaTotal > 0).map(r => ({ name: r.jobRoleName, cu: r.cotaTotal }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tickFormatter={fmtCredits} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <Tooltip formatter={v => fmtCredits(v)} />
                <Bar dataKey="cu" name="CU alocado" radius={[4, 4, 0, 0]}>
                  {withShare.map((_, i) => <Cell key={i} fill={ZILOR_COLORS[i % ZILOR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Share orçamentário por cargo">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={withShare.filter(r => r.cotaTotal > 0).map(r => ({ name: r.jobRoleName, value: r.cotaTotal }))}
                  dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {withShare.map((_, i) => <Cell key={i} fill={ZILOR_COLORS[i % ZILOR_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => fmtCredits(v)} />
                <Legend iconType="circle" iconSize={9} formatter={v => <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      <div className="card" style={{ padding: '12px 16px', marginTop: 16 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
          <strong>Como ler:</strong> CU alocado = cota mensal por usuário × número de usuários do cargo · É o orçamento total comprometido, independente do volume de uso real · Ajuste a cota ou o número de usuários para simular cenários de expansão ou corte
        </div>
      </div>
    </>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function SimulatorRoute() {
  const [tab, setTab] = useState('volume')
  const [loading, setLoading] = useState(true)
  const [orchs, setOrchs] = useState([])
  const [scenario, setScenario] = useState([])
  const [globalOrchId, setGlobalOrchId] = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchJobRoles(), fetchOrchestrations()])
      .then(([roles, os]) => {
        setOrchs(os)
        if (os.length > 0) setGlobalOrchId(os[0].id)
        if (roles.length > 0) {
          setScenario(roles.map(r => ({
            jobRoleId: r.id,
            jobRoleName: r.name,
            department: r.department ?? '',
            budget: Number(r.policy?.monthlyBudgetCU ?? 200),
            userCount: 1,
            orchId: '',
          })))
        }
      }).finally(() => setLoading(false))
  }, [])

  function updateRow(jobRoleId, field, value) {
    setScenario(prev => prev.map(r => r.jobRoleId === jobRoleId ? { ...r, [field]: value } : r))
  }

  const sharedProps = { orchs, scenario, updateRow, globalOrchId, setGlobalOrchId }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-shell)' }}>
      <PageHeader title="Simulador de Consumo" subtitle="estime o consumo por volume de uso ou por cota de cada cargo" />
      <div style={{ padding: '24px 32px' }}>
        {loading ? <Spinner /> : (
          <>
            <TabBar active={tab} onChange={setTab} />
            {tab === 'volume' && <TabVolume {...sharedProps} />}
            {tab === 'cota'   && <TabCota   scenario={scenario} updateRow={updateRow} />}
          </>
        )}
      </div>
    </div>
  )
}
