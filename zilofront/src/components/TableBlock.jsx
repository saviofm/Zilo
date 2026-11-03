import { useState, useMemo } from 'react'

export default function TableBlock({ data }) {
  const { title, columns = [], rows = [], highlight_column } = data || {}
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    if (!filter) return rows
    const q = filter.toLowerCase()
    return rows.filter(row => row.some(cell => String(cell).toLowerCase().includes(q)))
  }, [rows, filter])

  const sorted = useMemo(() => {
    if (sortCol === null) return filtered
    return [...filtered].sort((a, b) => {
      const av = a[sortCol] ?? '', bv = b[sortCol] ?? ''
      const n = (v) => !isNaN(parseFloat(v.replace(/[^\d.,-]/g,''))) ? parseFloat(v.replace(',','.')) : null
      const an = n(String(av)), bn = n(String(bv))
      const cmp = an !== null && bn !== null ? an - bn : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortCol, sortDir])

  function toggleSort(i) {
    if (sortCol === i) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(i); setSortDir('asc') }
  }

  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 12, boxShadow: 'var(--shadow-card)' }}>
      <div style={{ padding: '14px 18px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
        {rows.length > 5 && (
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrar…"
            style={{ fontSize: 12, padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', outline: 'none', width: 140 }} />
        )}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              {columns.map((col, i) => (
                <th key={i} onClick={() => toggleSort(i)} style={{
                  padding: '9px 14px', textAlign: 'left', fontWeight: 600,
                  color: highlight_column === i ? 'var(--joule)' : 'var(--text-muted)',
                  fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em',
                  whiteSpace: 'nowrap', borderBottom: '2px solid var(--border)',
                  cursor: 'pointer', userSelect: 'none',
                  background: highlight_column === i ? 'var(--accent-light)' : undefined,
                }}>
                  {col} {sortCol === i ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, ri) => (
              <tr key={ri} style={{ borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{
                    padding: '9px 14px',
                    color: highlight_column === ci ? 'var(--joule)' : 'var(--text-primary)',
                    fontWeight: highlight_column === ci ? 600 : 400,
                    background: highlight_column === ci ? 'rgba(140,198,62,0.05)' : undefined,
                  }}>{cell}</td>
                ))}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={columns.length} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum resultado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {filter && <div style={{ padding: '6px 14px 10px', fontSize: 11, color: 'var(--text-muted)' }}>{sorted.length} de {rows.length} linhas</div>}
    </div>
  )
}
