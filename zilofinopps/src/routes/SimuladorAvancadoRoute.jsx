import { useState, useEffect, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import ChartCard, { PageHeader, ZILOR_COLORS, Spinner } from '../components/ChartCard'
import KpiCard, { fmtCredits } from '../components/KpiCard'
import { fetchOrchestrations } from '../api/models'

const PRESETS = {
  light:  { label: 'Leve',    msgsDay: 5,  inputTokens: 500,  outputTokens: 200  },
  medium: { label: 'Médio',   msgsDay: 15, inputTokens: 1500, outputTokens: 600  },
  heavy:  { label: 'Intenso', msgsDay: 40, inputTokens: 4000, outputTokens: 1500 },
  custom: { label: 'Custom',  msgsDay: 10, inputTokens: 1000, outputTokens: 400  },
}

const WORKING_DAYS = 22

function cuPerToken(orch) {
  // prefer model-level pricing; fall back to orchestrationCUPerCall as proxy
  const m = orch?.model
  if (m?.inputCUPer1k && m?.outputCUPer1k) return { input: Number(m.inputCUPer1k) / 1000, output: Number(m.outputCUPer1k) / 1000 }
  // fallback: split orchCUPerCall evenly between input/output
  const half = Number(orch?.orchestrationCUPerCall ?? 0.0008) / 2
  return { input: half / 500, output: half / 500 }
}

export default function SimuladorAvancadoRoute() {
  const [loading, setLoading]       = useState(true)
  const [orchs, setOrchs]           = useState([])
  const [orchId, setOrchId]         = useState('')
  const [preset, setPreset]         = useState('medium')
  const [msgsDay, setMsgsDay]       = useState(15)
  const [inputTokens, setInputTokens]   = useState(1500)
  const [outputTokens, setOutputTokens] = useState(600)
  const [users, setUsers]           = useState(50)
  const [months, setMonths]         = useState(12)

  useEffect(() => {
    fetchOrchestrations().then(os => {
      setOrchs(os)
      if (os.length > 0) setOrchId(os[0].id)
    }).finally(() => setLoading(false))
  }, [])

  function applyPreset(key) {
    setPreset(key)
    if (key !== 'custom') {
      const p = PRESETS[key]
      setMsgsDay(p.msgsDay); setInputTokens(p.inputTokens); setOutputTokens(p.outputTokens)
    }
  }

  const selectedOrch = useMemo(() => orchs.find(o => o.id === orchId), [orchs, orchId])
  const { input: inputCU, output: outputCU } = useMemo(() => cuPerToken(selectedOrch), [selectedOrch])

  const cuPerMsg       = inputTokens * inputCU + outputTokens * outputCU
  const cuPerUserDay   = cuPerMsg * msgsDay
  const cuPerUserMonth = cuPerUserDay * WORKING_DAYS
  const cuTotal        = cuPerUserMonth * users

  const projData = useMemo(() => {
    const now = new Date()
    return Array.from({ length: months }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      return { month: label, projetado: Math.round(cuTotal * (1 + i * 0.02) * 100) / 100 }
    })
  }, [cuTotal, months])

  const totalProjected = projData.reduce((s, r) => s + r.projetado, 0)

  if (loading) return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-shell)' }}>
      <PageHeader title="Simulador Avançado" />
      <div style={{ padding: '24px 32px' }}><Spinner /></div>
    </div>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-shell)' }}>
      <PageHeader title="Simulador Avançado" subtitle="projeção detalhada por perfil de IA, tokens e volume de mensagens" />
      <div style={{ padding: '24px 32px' }}>

        {/* Config panel */}
        <div className="card" style={{ padding: '22px 24px', marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>

            {/* Perfil de IA */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Perfil de IA</label>
              <select value={orchId} onChange={e => setOrchId(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--accent)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: 'var(--text-primary)', background: '#fff', cursor: 'pointer' }}>
                {orchs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              {selectedOrch?.model && (
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Modelo: <strong>{selectedOrch.model.displayName}</strong><br />
                  Entrada: {inputCU.toFixed(8)} CU/token · Saída: {outputCU.toFixed(8)} CU/token
                </div>
              )}
            </div>

            {/* Perfil de uso */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Perfil de uso</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Object.entries(PRESETS).map(([k, v]) => (
                  <button key={k} onClick={() => applyPreset(k)}
                    style={{ padding: '5px 12px', fontSize: 11, borderRadius: 20, border: `1.5px solid ${preset === k ? 'var(--joule)' : 'var(--border)'}`, background: preset === k ? 'var(--joule)' : '#fff', color: preset === k ? '#fff' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: preset === k ? 700 : 400 }}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Usuários */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Usuários ativos</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="range" min={1} max={2000} value={users} onChange={e => setUsers(Number(e.target.value))} style={{ flex: 1 }} />
                <input type="number" min={1} max={9999} value={users} onChange={e => setUsers(Math.max(1, Number(e.target.value)))}
                  style={{ width: 70, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 6, textAlign: 'right', fontSize: 13, fontFamily: 'inherit' }} />
              </div>
            </div>
          </div>

          {/* Params */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 20, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            {[
              { label: 'Msgs/dia por usuário', value: msgsDay,       set: setMsgsDay,       min: 1,   max: 200   },
              { label: 'Tokens entrada (média)', value: inputTokens,  set: setInputTokens,   min: 100, max: 32000 },
              { label: 'Tokens saída (média)',   value: outputTokens, set: setOutputTokens,  min: 50,  max: 8000  },
              { label: 'Meses de projeção',      value: months,       set: setMonths,        min: 1,   max: 36    },
            ].map(({ label, value, set, min, max }) => (
              <div key={label}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>{label}</label>
                <input type="number" min={min} max={max} value={value}
                  onChange={e => { set(Math.max(min, Number(e.target.value))); setPreset('custom') }}
                  style={{ width: '100%', padding: '7px 10px', border: '1.5px solid var(--accent)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />
              </div>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
          <KpiCard label="Custo por mensagem"    value={fmtCredits(cuPerMsg)}       sub="Créditos de IA"                    icon="💬" color="var(--joule)" />
          <KpiCard label="Custo por usuário/dia" value={fmtCredits(cuPerUserDay)}   sub={`${msgsDay} msgs × ${WORKING_DAYS} dias`} icon="📅" />
          <KpiCard label="Custo por usuário/mês" value={fmtCredits(cuPerUserMonth)} sub="Créditos de IA"                    icon="📆" />
          <KpiCard label="Custo total/mês"       value={fmtCredits(cuTotal)}        sub={`${users} usuários`}               icon="💰" color="var(--joule)" />
          <KpiCard label={`Total ${months} meses`} value={fmtCredits(totalProjected)} sub="projeção acumulada"              icon="📈" />
        </div>

        {/* Projeção */}
        <ChartCard title="Projeção de consumo" subtitle={`crescimento estimado de 2%/mês · ${months} meses`}>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={projData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <YAxis tickFormatter={fmtCredits} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <Tooltip formatter={v => fmtCredits(v)} />
              <Legend iconType="circle" iconSize={9} formatter={v => <span style={{ fontSize: 11 }}>{v}</span>} />
              <Line type="monotone" dataKey="projetado" name="Créditos/mês" stroke={ZILOR_COLORS[0]} strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Comparação entre perfis */}
        <ChartCard title="Comparação entre todos os perfis de IA" subtitle="mesmo cenário de uso" style={{ marginTop: 20 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  {['Perfil de IA', 'Modelo', 'CU/mensagem', 'CU/usuário/mês', `Total/mês (${users} usr)`, 'vs. selecionado'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Perfil de IA' || h === 'Modelo' ? 'left' : 'right', fontWeight: 600, color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orchs.map(o => {
                  const { input: iCU, output: oCU } = cuPerToken(o)
                  const cu    = inputTokens * iCU + outputTokens * oCU
                  const total = cu * msgsDay * WORKING_DAYS * users
                  const diff  = cuTotal > 0 ? Math.round(((total / cuTotal) - 1) * 100) : 0
                  const isCurrent = o.id === orchId
                  return (
                    <tr key={o.id} style={{ borderBottom: '1px solid var(--border)', background: isCurrent ? 'var(--accent-light)' : undefined }}>
                      <td style={{ padding: '10px 14px', fontWeight: isCurrent ? 700 : 400, color: isCurrent ? 'var(--joule)' : 'var(--text-primary)' }}>
                        {o.name}{isCurrent && <span style={{ fontSize: 10, color: 'var(--joule)', marginLeft: 6 }}>← selecionado</span>}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)' }}>{o.model?.displayName ?? '—'}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtCredits(cu)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtCredits(cu * msgsDay * WORKING_DAYS)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtCredits(total)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        {isCurrent
                          ? <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>base</span>
                          : <span style={{ fontWeight: 700, color: diff > 0 ? '#dc3545' : '#198754', fontSize: 12 }}>{diff > 0 ? '+' : ''}{diff}%</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
