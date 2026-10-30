import { useState, useEffect } from 'react'
import { fetchMonthlySummary, fetchRecentLedger, fetchUsageByOrchestration } from '../api/ledger'

function KpiCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '20px 24px',
      flex: 1,
      minWidth: 160,
      boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || 'var(--text-primary)', lineHeight: 1.1, marginBottom: 4 }}>
        {value ?? '—'}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}

function UsageBar({ name, cu, maxCu }) {
  const pct = maxCu > 0 ? Math.max(2, Math.round((cu / maxCu) * 100)) : 2
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{name}</span>
        <span style={{ color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>{cu.toLocaleString('pt-BR')} CU</span>
      </div>
      <div style={{ height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: 'var(--progress-grad)',
          borderRadius: 99,
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  )
}

function fmtTs(ts) {
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  } catch { return ts }
}

function pctColor(pct) {
  if (pct >= 90) return '#F05A22'
  if (pct >= 70) return '#f59e0b'
  return '#01502D'
}

export default function ConsumptionRoute() {
  const [summary, setSummary] = useState([])
  const [byOrch, setByOrch] = useState([])
  const [ledger, setLedger] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const currentYM = new Date().toISOString().slice(0, 7)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      fetchMonthlySummary(),
      fetchUsageByOrchestration(currentYM),
      fetchRecentLedger(50),
    ]).then(([s, o, l]) => {
      setSummary(s)
      setByOrch(o)
      setLedger(l)
    }).catch(err => {
      setError(err.message)
    }).finally(() => setLoading(false))
  }, [])

  const thisMonth = summary.find(s => s.yearMonth === currentYM) ?? summary[0] ?? null
  const totalCU = thisMonth?.totalCU ?? 0
  const budgetCU = thisMonth?.budgetCU ?? 0
  const remainingCU = budgetCU > 0 ? Math.max(0, budgetCU - totalCU) : null
  const pct = budgetCU > 0 ? Math.min(100, Math.round((totalCU / budgetCU) * 100)) : null

  const maxOrchCU = byOrch.length > 0 ? Math.max(...byOrch.map(o => o.totalCU ?? 0)) : 1

  return (
    <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', background: 'var(--bg-shell)' }}>
      {/* Header */}
      <div style={{
        height: 56, display: 'flex', alignItems: 'center', padding: '0 32px',
        borderBottom: '1px solid var(--border)', background: '#FFFFFF', flexShrink: 0,
      }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Consumo</span>
        <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: 6, padding: '2px 8px' }}>
          {currentYM}
        </span>
      </div>

      <div style={{ padding: '32px' }}>
        {error && (
          <div style={{ background: '#fff3f0', border: '1px solid #F05A22', borderRadius: 10, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: '#F05A22' }}>
            Erro ao carregar dados: {error}
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 14 }}>
            <div className="animate-spin-custom" style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--joule-bg)', borderTopColor: 'var(--joule)' }} />
            Carregando dados de consumo…
          </div>
        )}

        {!loading && (
          <>
            {/* KPI Cards */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
              <KpiCard
                label="CU consumido este mês"
                value={totalCU.toLocaleString('pt-BR')}
                sub="Unidades de Consumo"
              />
              {budgetCU > 0 && (
                <KpiCard
                  label="Budget mensal"
                  value={budgetCU.toLocaleString('pt-BR')}
                  sub="CU disponíveis"
                />
              )}
              {remainingCU !== null && (
                <KpiCard
                  label="Restante"
                  value={remainingCU.toLocaleString('pt-BR')}
                  sub="CU disponíveis"
                  color={remainingCU === 0 ? '#F05A22' : '#01502D'}
                />
              )}
              {pct !== null && (
                <KpiCard
                  label="Utilização"
                  value={`${pct}%`}
                  sub={pct >= 90 ? 'Atenção: próximo do limite' : pct >= 70 ? 'Moderado' : 'Normal'}
                  color={pctColor(pct)}
                />
              )}
            </div>

            {/* Usage by orchestration */}
            {byOrch.length > 0 && (
              <div style={{ background: '#FFFFFF', border: '1px solid var(--border)', borderRadius: 12, padding: '24px', marginBottom: 24, boxShadow: 'var(--shadow-card)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>
                  Consumo por orquestração — {currentYM}
                </h3>
                {byOrch.map((o, i) => (
                  <UsageBar
                    key={o.orchestrationId ?? i}
                    name={o.orchestrationName ?? o.orchestrationId ?? `Orquestração ${i + 1}`}
                    cu={o.totalCU ?? 0}
                    maxCu={maxOrchCU}
                  />
                ))}
              </div>
            )}

            {/* Recent ledger entries */}
            {ledger.length > 0 && (
              <div style={{ background: '#FFFFFF', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    Entradas recentes
                  </h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-shell)' }}>
                        {['Data/Hora', 'Orquestração', 'Tokens entrada', 'Tokens saída', 'CU'].map(h => (
                          <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.map((entry, i) => (
                        <tr
                          key={entry.id ?? i}
                          style={{ borderBottom: '1px solid var(--border)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-shell)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '10px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {fmtTs(entry.timestamp)}
                          </td>
                          <td style={{ padding: '10px 16px', color: 'var(--text-primary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.orchestration?.name ?? entry.orchestration_id ?? '—'}
                          </td>
                          <td style={{ padding: '10px 16px', color: 'var(--text-primary)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {(entry.inputTokens ?? 0).toLocaleString('pt-BR')}
                          </td>
                          <td style={{ padding: '10px 16px', color: 'var(--text-primary)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {(entry.outputTokens ?? 0).toLocaleString('pt-BR')}
                          </td>
                          <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--joule)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {(entry.totalCU ?? 0).toLocaleString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!loading && !error && byOrch.length === 0 && ledger.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                Nenhum dado de consumo encontrado para este período.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
