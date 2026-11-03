import { useState, useEffect, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'
import ChartCard, { Empty, PageHeader, ZILOR_COLORS } from '../components/ChartCard'
import KpiCard, { fmtCredits } from '../components/KpiCard'
import { fetchJobRoles, fetchModelCatalog, fetchOrchestrations } from '../api/models'

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 14, padding: '40px 0', justifyContent: 'center' }}>
      <div className="animate-spin-custom" style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--accent-light)', borderTopColor: 'var(--accent)' }} />
      Carregando dados…
    </div>
  )
}

const DEFAULT_MSGS_PER_DAY   = 5
const DEFAULT_TOKENS_IN      = 800
const DEFAULT_TOKENS_OUT      = 400
const WORKING_DAYS_PER_MONTH = 22

export default function SimulatorRoute() {
  const [loading, setLoading]       = useState(true)
  const [jobRoles, setJobRoles]     = useState([])
  const [models, setModels]         = useState([])
  const [orchs, setOrchs]           = useState([])
  const [scenario, setScenario]     = useState([])
  const [globalModel, setGlobalModel] = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchJobRoles(), fetchModelCatalog(), fetchOrchestrations()])
      .then(([roles, mods, os]) => {
        setJobRoles(roles)
        setModels(mods)
        setOrchs(os)
        if (mods.length > 0) setGlobalModel(mods[0].id)
        if (roles.length > 0) {
          setScenario(roles.map(r => ({
            jobRoleId: r.id,
            jobRoleName: r.name,
            department: r.department ?? '',
            budget: Number(r.policy?.monthlyBudgetCU ?? 200),
            userCount: 1,
            msgsPerDay: DEFAULT_MSGS_PER_DAY,
            tokensIn: DEFAULT_TOKENS_IN,
            tokensOut: DEFAULT_TOKENS_OUT,
            modelId: '',
          })))
        }
      }).finally(() => setLoading(false))
  }, [])

  function updateRow(jobRoleId, field, value) {
    setScenario(prev => prev.map(r => r.jobRoleId === jobRoleId ? { ...r, [field]: value } : r))
  }

  const selectedModel = useMemo(() => models.find(m => m.id === globalModel), [globalModel, models])

  const results = useMemo(() => {
    return scenario.map(row => {
      const model = models.find(m => m.id === (row.modelId || globalModel)) ?? selectedModel
      if (!model) return { ...row, cuPerUser: 0, totalCU: 0, callsPerMonth: 0 }

      const inPer1k  = Number(model.inputCUPer1k  ?? 0)
      const outPer1k = Number(model.outputCUPer1k ?? 0)

      const cuPerMsg     = (row.tokensIn / 1000) * inPer1k + (row.tokensOut / 1000) * outPer1k
      const callsPerMonth = row.msgsPerDay * WORKING_DAYS_PER_MONTH
      const cuPerUser     = cuPerMsg * callsPerMonth
      const totalCU       = cuPerUser * row.userCount

      return {
        ...row,
        modelUsed: model.displayName,
        cuPerMsg,
        cuPerUser,
        totalCU,
        callsPerMonth,
        budgetUsedPct: row.budget > 0 ? Math.round((cuPerUser / row.budget) * 100) : null,
      }
    })
  }, [scenario, models, globalModel, selectedModel])

  const grandTotal = results.reduce((s, r) => s + r.totalCU, 0)
  const grandUsers = results.reduce((s, r) => s + r.userCount, 0)
  const atRisk     = results.filter(r => r.budgetUsedPct != null && r.budgetUsedPct > 100).length

  const pieData = results
    .filter(r => r.totalCU > 0)
    .map(r => ({ name: r.jobRoleName, value: r.totalCU }))

  function exportCSV() {
    const rows = [
      ['Cargo', 'Depto', 'Usuários', 'Modelo', 'Msgs/dia', 'Tokens entrada', 'Tokens saída', 'CU/msg', 'Chats/mês', 'CU/usuário', 'Budget', '% Budget', 'Total CU'],
      ...results.map(r => [
        r.jobRoleName, r.department, r.userCount, r.modelUsed ?? '—',
        r.msgsPerDay, r.tokensIn, r.tokensOut,
        (r.cuPerMsg ?? 0).toFixed(6), r.callsPerMonth, (r.cuPerUser ?? 0).toFixed(4),
        r.budget, r.budgetUsedPct ?? '—', (r.totalCU ?? 0).toFixed(4),
      ]),
      ['', '', grandUsers, '', '', '', '', '', '', '', '', '', grandTotal.toFixed(4)],
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'simulacao_cu_zilo.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-shell)' }}>
      <PageHeader title="Simulador de Capacity Units"
        subtitle="estime o consumo mensal por cargo e perfil de usuários"
        controls={
          <button className="btn-accent" onClick={exportCSV} style={{ fontSize: 12 }}>⬇ Exportar CSV</button>
        }
      />

      <div style={{ padding: '24px 32px' }}>
        {loading ? <Spinner /> : (
          <>
            {/* Global model selector */}
            <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Modelo padrão da simulação:</div>
                <select value={globalModel} onChange={e => setGlobalModel(e.target.value)}
                  style={{ padding: '7px 12px', border: '1.5px solid var(--accent)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: 'var(--text-primary)', background: '#fff', cursor: 'pointer', minWidth: 240 }}>
                  {models.map(m => (
                    <option key={m.id} value={m.id}>{m.displayName} ({m.provider})</option>
                  ))}
                </select>
                {selectedModel && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Entrada: <strong>{selectedModel.inputCUPer1k} CU/1k tokens</strong> · Saída: <strong>{selectedModel.outputCUPer1k} CU/1k tokens</strong>
                  </div>
                )}
              </div>
            </div>

            {/* KPIs */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
              <KpiCard label="Custo mensal estimado" value={fmtCredits(grandTotal)} sub="Créditos de IA" icon="💰" color="var(--joule)" />
              <KpiCard label="Total de usuários" value={grandUsers} sub="no cenário" icon="👥" />
              <KpiCard label="Custo por usuário" value={fmtCredits(grandUsers > 0 ? grandTotal / grandUsers : 0)} sub="CU médio/mês" icon="📊" />
              <KpiCard label="Cargos acima do budget" value={atRisk} sub={atRisk > 0 ? 'revisar budgets' : 'todos dentro do limite'} icon={atRisk > 0 ? '⚠️' : '✅'} color={atRisk > 0 ? '#F05A22' : '#01502D'} />
            </div>

            {/* Scenario table */}
            <ChartCard title="Configuração do cenário" subtitle="ajuste os parâmetros por cargo">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                      {['Cargo', 'Usuários', 'Msgs/dia', 'Tokens entrada', 'Tokens saída', 'Modelo', 'Budget (CU)', 'CU/usuário/mês', '% Budget', 'Total CU/mês'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: ['Usuários', 'Msgs/dia', 'Tokens entrada', 'Tokens saída', 'Budget (CU)', 'CU/usuário/mês', '% Budget', 'Total CU/mês'].includes(h) ? 'right' : 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={r.jobRoleId} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                          <div>{r.jobRoleName}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>{r.department}</div>
                        </td>
                        {/* Editable: userCount */}
                        <td style={{ padding: '6px 12px', textAlign: 'right' }}>
                          <input type="number" min={0} max={9999} value={r.userCount}
                            onChange={e => updateRow(r.jobRoleId, 'userCount', Math.max(0, Number(e.target.value)))}
                            style={{ width: 60, textAlign: 'right', padding: '4px 6px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontFamily: 'inherit' }} />
                        </td>
                        {/* Editable: msgsPerDay */}
                        <td style={{ padding: '6px 12px', textAlign: 'right' }}>
                          <input type="number" min={1} max={100} value={r.msgsPerDay}
                            onChange={e => updateRow(r.jobRoleId, 'msgsPerDay', Math.max(1, Number(e.target.value)))}
                            style={{ width: 56, textAlign: 'right', padding: '4px 6px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontFamily: 'inherit' }} />
                        </td>
                        {/* Editable: tokensIn */}
                        <td style={{ padding: '6px 12px', textAlign: 'right' }}>
                          <input type="number" min={100} max={128000} step={100} value={r.tokensIn}
                            onChange={e => updateRow(r.jobRoleId, 'tokensIn', Math.max(100, Number(e.target.value)))}
                            style={{ width: 80, textAlign: 'right', padding: '4px 6px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontFamily: 'inherit' }} />
                        </td>
                        {/* Editable: tokensOut */}
                        <td style={{ padding: '6px 12px', textAlign: 'right' }}>
                          <input type="number" min={50} max={32000} step={50} value={r.tokensOut}
                            onChange={e => updateRow(r.jobRoleId, 'tokensOut', Math.max(50, Number(e.target.value)))}
                            style={{ width: 80, textAlign: 'right', padding: '4px 6px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontFamily: 'inherit' }} />
                        </td>
                        {/* Model override */}
                        <td style={{ padding: '6px 12px' }}>
                          <select value={r.modelId} onChange={e => updateRow(r.jobRoleId, 'modelId', e.target.value)}
                            style={{ padding: '4px 6px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, fontFamily: 'inherit', background: '#fff', maxWidth: 160, cursor: 'pointer' }}>
                            <option value="">Padrão</option>
                            {models.map(m => <option key={m.id} value={m.id}>{m.displayName}</option>)}
                          </select>
                        </td>
                        {/* Editable: budget */}
                        <td style={{ padding: '6px 12px', textAlign: 'right' }}>
                          <input type="number" min={0} value={r.budget}
                            onChange={e => updateRow(r.jobRoleId, 'budget', Math.max(0, Number(e.target.value)))}
                            style={{ width: 80, textAlign: 'right', padding: '4px 6px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontFamily: 'inherit' }} />
                        </td>
                        {/* Results */}
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--joule)', fontVariantNumeric: 'tabular-nums' }}>{fmtCredits(r.cuPerUser)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          {r.budgetUsedPct != null ? (
                            <span style={{ fontWeight: 700, color: r.budgetUsedPct > 100 ? '#F05A22' : r.budgetUsedPct > 80 ? '#f59e0b' : '#01502D', background: r.budgetUsedPct > 100 ? '#fff0eb' : r.budgetUsedPct > 80 ? '#fffbeb' : 'var(--accent-light)', padding: '2px 8px', borderRadius: 20, fontSize: 12 }}>
                              {r.budgetUsedPct}%
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{fmtCredits(r.totalCU)}</td>
                      </tr>
                    ))}
                    {/* Totals */}
                    <tr style={{ background: 'var(--accent-light)', borderTop: '2px solid var(--accent)' }}>
                      <td style={{ padding: '12px', fontWeight: 700, color: 'var(--joule)' }}>TOTAL</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700 }}>{grandUsers}</td>
                      <td colSpan={5} />
                      <td colSpan={2} />
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, color: 'var(--joule)', fontSize: 15 }}>{fmtCredits(grandTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </ChartCard>

            {/* Chart */}
            {pieData.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <ChartCard title="Distribuição de custo por cargo">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={results.filter(r => r.totalCU > 0).map(r => ({ name: r.jobRoleName, cu: r.totalCU }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                      <YAxis tickFormatter={fmtCredits} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                      <Tooltip formatter={v => fmtCredits(v)} />
                      <Bar dataKey="cu" name="CU mensal" radius={[4, 4, 0, 0]}>
                        {results.map((_, i) => <Cell key={i} fill={ZILOR_COLORS[i % ZILOR_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Share de custo por cargo">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                        {pieData.map((_, i) => <Cell key={i} fill={ZILOR_COLORS[i % ZILOR_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => fmtCredits(v)} />
                      <Legend iconType="circle" iconSize={9} formatter={v => <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
            )}

            {/* Assumptions note */}
            <div className="card" style={{ padding: '14px 18px', marginTop: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                <strong>Premissas do simulador:</strong><br />
                · {WORKING_DAYS_PER_MONTH} dias úteis por mês · Custo = (tokens_entrada/1000 × CU_entrada) + (tokens_saída/1000 × CU_saída) · Budget vem das políticas associadas ao cargo · Cada cargo pode ter modelo individual ou usar o modelo padrão selecionado acima
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
