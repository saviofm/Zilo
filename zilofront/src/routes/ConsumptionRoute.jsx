import { useState, useEffect, useCallback } from 'react'
import { fetchMonthlySummary, fetchRecentLedger, fetchUsageByOrchestration } from '../api/ledger'
import { fetchBudgetStatus } from '../api/orchestrations'

function fmtTs(ts) {
  if (!ts) return '—'
  try { return new Date(ts).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) }
  catch { return ts }
}
function fmtCredits(n) {
  if (n == null) return '—'
  const v = Number(n)
  if (v >= 1000) return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 4 })
}
function pctColor(pct) {
  if (pct >= 90) return '#F05A22'
  if (pct >= 70) return '#f59e0b'
  return '#01502D'
}
function prevMonth(ym) {
  const [y, m] = ym.split('-').map(Number)
  return m === 1 ? `${y-1}-12` : `${y}-${String(m-1).padStart(2,'0')}`
}
function nextMonth(ym) {
  const [y, m] = ym.split('-').map(Number)
  return m === 12 ? `${y+1}-01` : `${y}-${String(m+1).padStart(2,'0')}`
}
function fmtYM(ym) {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m)-1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

function KpiCard({ label, value, sub, color }) {
  return (
    <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:12, padding:'20px 24px', flex:1, minWidth:150, boxShadow:'var(--shadow-card)' }}>
      <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:700, color:color||'var(--text-primary)', lineHeight:1.1, marginBottom:4 }}>{value??'—'}</div>
      {sub && <div style={{ fontSize:12, color:'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}

function ProgressBar({ pct }) {
  const color = pctColor(pct)
  return (
    <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:12, padding:'20px 24px', boxShadow:'var(--shadow-card)', marginBottom:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:10 }}>
        <span style={{ fontWeight:600, color:'var(--text-primary)' }}>Utilização do budget</span>
        <span style={{ fontWeight:700, color }}>{pct}%</span>
      </div>
      <div style={{ height:10, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, background:`linear-gradient(to right, var(--accent), ${color})`, borderRadius:99, transition:'width 0.6s ease' }} />
      </div>
      {pct >= 90 && <div style={{ marginTop:8, fontSize:12, color:'#F05A22', fontWeight:600 }}>⚠️ Atenção: próximo do limite mensal</div>}
    </div>
  )
}

function PersonaBar({ name, credits, calls, maxCredits }) {
  const pct = maxCredits > 0 ? Math.max(3, Math.round((credits/maxCredits)*100)) : 3
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:5 }}>
        <span style={{ color:'var(--text-primary)', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'65%' }}>{name}</span>
        <span style={{ color:'var(--text-muted)', flexShrink:0, marginLeft:8 }}>{fmtCredits(credits)} créditos · {calls} {calls===1?'chat':'chats'}</span>
      </div>
      <div style={{ height:7, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:'var(--progress-grad)', borderRadius:99, transition:'width 0.5s ease' }} />
      </div>
    </div>
  )
}

function DetailModal({ entries, onClose }) {
  const [filterOrch, setFilterOrch] = useState('')
  const [sortBy, setSortBy] = useState('timestamp')
  const orchNames = [...new Set(entries.map(e => e.orchestration?.name ?? '—'))]
  const filtered = entries
    .filter(e => !filterOrch || (e.orchestration?.name??'—') === filterOrch)
    .sort((a,b) => {
      if (sortBy==='credits') return (b.totalCU??0)-(a.totalCU??0)
      if (sortBy==='tokens') return ((b.inputTokens??0)+(b.outputTokens??0))-((a.inputTokens??0)+(a.outputTokens??0))
      return new Date(b.timestamp)-new Date(a.timestamp)
    })
  const totalCredits = filtered.reduce((s,e) => s+(e.totalCU??0), 0)
  const totalTokens  = filtered.reduce((s,e) => s+(e.inputTokens??0)+(e.outputTokens??0), 0)
  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}
      onClick={e => { if (e.target===e.currentTarget) onClose() }}>
      <div style={{ background:'#fff', borderRadius:16, boxShadow:'0 20px 60px rgba(0,0,0,0.2)', width:'100%', maxWidth:800, maxHeight:'85vh', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <h2 style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', margin:0 }}>Detalhes do consumo</h2>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{filtered.length} entradas · {fmtCredits(totalCredits)} créditos · {totalTokens.toLocaleString('pt-BR')} tokens</div>
          </div>
          <button onClick={onClose} style={{ border:'none', background:'none', cursor:'pointer', fontSize:22, color:'var(--text-muted)', lineHeight:1, padding:4 }}>×</button>
        </div>
        <div style={{ padding:'12px 24px', borderBottom:'1px solid var(--border)', display:'flex', gap:12, flexShrink:0, flexWrap:'wrap' }}>
          <select value={filterOrch} onChange={e => setFilterOrch(e.target.value)}
            style={{ padding:'6px 10px', borderRadius:8, border:'1px solid var(--border)', fontSize:13, background:'#fff', fontFamily:'inherit', color:'var(--text-primary)', cursor:'pointer' }}>
            <option value="">Todas as personas</option>
            {orchNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ padding:'6px 10px', borderRadius:8, border:'1px solid var(--border)', fontSize:13, background:'#fff', fontFamily:'inherit', color:'var(--text-primary)', cursor:'pointer' }}>
            <option value="timestamp">Ordenar por data</option>
            <option value="credits">Ordenar por créditos</option>
            <option value="tokens">Ordenar por tokens</option>
          </select>
        </div>
        <div style={{ overflowY:'auto', flex:1 }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead style={{ position:'sticky', top:0, background:'#f8f9fa', zIndex:1 }}>
              <tr>
                {['Data/Hora','Persona','Tokens entrada','Tokens saída','Créditos de IA'].map(h => (
                  <th key={h} style={{ padding:'10px 16px', textAlign:h.includes('Token')||h.includes('Crédito')?'right':'left', fontWeight:600, color:'var(--text-muted)', fontSize:11, textTransform:'uppercase', letterSpacing:'0.04em', whiteSpace:'nowrap', borderBottom:'2px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e,i) => (
                <tr key={e.id??i} style={{ borderBottom:'1px solid var(--border)' }}
                  onMouseEnter={ev => ev.currentTarget.style.background='#f8f9fa'}
                  onMouseLeave={ev => ev.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'10px 16px', color:'var(--text-muted)', whiteSpace:'nowrap' }}>{fmtTs(e.timestamp)}</td>
                  <td style={{ padding:'10px 16px', color:'var(--text-primary)', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.orchestration?.name??'—'}</td>
                  <td style={{ padding:'10px 16px', color:'var(--text-primary)', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{(e.inputTokens??0).toLocaleString('pt-BR')}</td>
                  <td style={{ padding:'10px 16px', color:'var(--text-primary)', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{(e.outputTokens??0).toLocaleString('pt-BR')}</td>
                  <td style={{ padding:'10px 16px', fontWeight:600, color:'var(--joule)', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{fmtCredits(e.totalCU)}</td>
                </tr>
              ))}
              {filtered.length===0 && <tr><td colSpan={5} style={{ padding:'32px', textAlign:'center', color:'var(--text-muted)' }}>Nenhuma entrada encontrada.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function ConsumptionRoute({ refreshTrigger=0 }) {
  const currentYM = new Date().toISOString().slice(0,7)
  const [selectedYM, setSelectedYM] = useState(currentYM)
  const [budget, setBudget] = useState(null)
  const [byOrch, setByOrch] = useState([])
  const [ledger, setLedger] = useState([])
  const [summary, setSummary] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const load = useCallback(() => {
    setLoading(true); setError(null)
    Promise.all([fetchBudgetStatus(), fetchUsageByOrchestration(selectedYM), fetchRecentLedger(100), fetchMonthlySummary()])
      .then(([b,o,l,s]) => { setBudget(b); setByOrch(o); setLedger(l); setSummary(s) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [selectedYM])

  useEffect(() => { load() }, [load, refreshTrigger])

  const isCurrentMonth = selectedYM === currentYM
  const summaryMonth = summary.find(s => s.yearMonth === selectedYM)
  const totalCredits  = isCurrentMonth ? (budget?.usedCU??0) : (summaryMonth?.totalCU??0)
  const budgetCredits = isCurrentMonth ? (budget?.budgetCU??0) : (summaryMonth?.budgetCU??0)
  const remaining     = budgetCredits > 0 ? Math.max(0, budgetCredits-totalCredits) : null
  const pct           = budgetCredits > 0 ? Math.min(100, Math.round((totalCredits/budgetCredits)*100)) : null
  const maxOrch       = byOrch.length > 0 ? Math.max(...byOrch.map(o => o.totalCU??0), 1) : 1
  const ledgerMonth   = ledger.filter(e => e.timestamp?.startsWith(selectedYM))

  return (
    <div style={{ flex:1, minWidth:0, overflowY:'auto', background:'var(--bg-shell)' }}>
      <div style={{ height:56, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 32px', borderBottom:'1px solid var(--border)', background:'#fff', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)' }}>Consumo</span>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <button onClick={() => setSelectedYM(prevMonth(selectedYM))}
              style={{ border:'1px solid var(--border)', background:'#fff', borderRadius:6, padding:'3px 8px', cursor:'pointer', fontSize:13, color:'var(--text-muted)' }}>←</button>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--joule)', minWidth:130, textAlign:'center' }}>{fmtYM(selectedYM)}</span>
            {selectedYM < currentYM && (
              <button onClick={() => { const n=nextMonth(selectedYM); setSelectedYM(n>currentYM?currentYM:n) }}
                style={{ border:'1px solid var(--border)', background:'#fff', borderRadius:6, padding:'3px 8px', cursor:'pointer', fontSize:13, color:'var(--text-muted)' }}>→</button>
            )}
          </div>
        </div>
        <button onClick={load} style={{ border:'1px solid var(--border)', background:'#fff', borderRadius:8, padding:'5px 12px', cursor:'pointer', fontSize:12, color:'var(--text-muted)', fontFamily:'inherit' }}>↻ Atualizar</button>
      </div>

      <div style={{ padding:'24px 32px' }}>
        {error && <div style={{ background:'#fff3f0', border:'1px solid #F05A22', borderRadius:10, padding:'12px 16px', marginBottom:20, fontSize:13, color:'#F05A22' }}>Erro: {error}</div>}

        {loading ? (
          <div style={{ display:'flex', alignItems:'center', gap:10, color:'var(--text-muted)', fontSize:14, padding:'32px 0' }}>
            <div className="animate-spin-custom" style={{ width:18, height:18, borderRadius:'50%', border:'2px solid var(--accent-light)', borderTopColor:'var(--accent)' }} />
            Carregando dados de consumo…
          </div>
        ) : (
          <>
            <div style={{ display:'flex', gap:14, flexWrap:'wrap', marginBottom:20 }}>
              <KpiCard label="Créditos consumidos" value={fmtCredits(totalCredits)} sub="Créditos de IA" />
              {budgetCredits>0 && <KpiCard label="Budget mensal" value={fmtCredits(budgetCredits)} sub="Créditos de IA disponíveis" />}
              {remaining!==null && <KpiCard label="Créditos restantes" value={fmtCredits(remaining)} sub={remaining===0?'Limite atingido':'disponíveis'} color={remaining===0?'#F05A22':'#01502D'} />}
              {pct!==null && <KpiCard label="Utilização" value={`${pct}%`} sub={pct>=90?'Próximo do limite':pct>=70?'Moderado':'Normal'} color={pctColor(pct)} />}
            </div>

            {pct!==null && <ProgressBar pct={pct} />}

            {byOrch.length>0 && (
              <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:12, padding:'20px 24px', marginBottom:20, boxShadow:'var(--shadow-card)' }}>
                <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', marginBottom:16 }}>Por persona</h3>
                {byOrch.map((o,i) => <PersonaBar key={o.orchestrationId??i} name={o.orchestrationName??o.orchestrationId??`Persona ${i+1}`} credits={o.totalCU??0} calls={o.totalCalls??0} maxCredits={maxOrch} />)}
              </div>
            )}

            <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:12, boxShadow:'var(--shadow-card)', overflow:'hidden' }}>
              <div style={{ padding:'16px 24px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', margin:0 }}>
                  Entradas recentes {ledgerMonth.length>0 && <span style={{ fontSize:12, fontWeight:400, color:'var(--text-muted)' }}>({ledgerMonth.length})</span>}
                </h3>
                {ledgerMonth.length>0 && <button onClick={() => setShowModal(true)} className="btn-outline-accent" style={{ fontSize:12, padding:'4px 12px' }}>Ver detalhes e filtros</button>}
              </div>
              {ledgerMonth.length===0 ? (
                <div style={{ padding:'32px', textAlign:'center', color:'var(--text-muted)', fontSize:14 }}>Nenhum registro em {fmtYM(selectedYM)}.</div>
              ) : (
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                    <thead>
                      <tr style={{ background:'#f8f9fa' }}>
                        {['Data/Hora','Persona','Tokens','Créditos de IA'].map(h => (
                          <th key={h} style={{ padding:'10px 16px', textAlign:h==='Tokens'||h==='Créditos de IA'?'right':'left', fontWeight:600, color:'var(--text-muted)', fontSize:11, textTransform:'uppercase', letterSpacing:'0.04em', whiteSpace:'nowrap', borderBottom:'1px solid var(--border)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerMonth.slice(0,10).map((e,i) => (
                        <tr key={e.id??i} style={{ borderBottom:'1px solid var(--border)' }}
                          onMouseEnter={ev => ev.currentTarget.style.background='#f8f9fa'}
                          onMouseLeave={ev => ev.currentTarget.style.background='transparent'}>
                          <td style={{ padding:'10px 16px', color:'var(--text-muted)', whiteSpace:'nowrap' }}>{fmtTs(e.timestamp)}</td>
                          <td style={{ padding:'10px 16px', color:'var(--text-primary)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.orchestration?.name??'—'}</td>
                          <td style={{ padding:'10px 16px', color:'var(--text-muted)', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{((e.inputTokens??0)+(e.outputTokens??0)).toLocaleString('pt-BR')}</td>
                          <td style={{ padding:'10px 16px', fontWeight:600, color:'var(--joule)', textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{fmtCredits(e.totalCU)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {ledgerMonth.length>10 && (
                    <div style={{ padding:'12px 16px', textAlign:'center', borderTop:'1px solid var(--border)' }}>
                      <button onClick={() => setShowModal(true)} style={{ border:'none', background:'none', color:'var(--joule)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                        Ver todas as {ledgerMonth.length} entradas →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      {showModal && <DetailModal entries={ledgerMonth} onClose={() => setShowModal(false)} />}
    </div>
  )
}
