import { downloadAsExcel, downloadAsJSON } from '../api/files.js'

export default function DownloadChip({ att }) {
  if (!att) return null

  function handleDownload() {
    if (att.format === 'json') downloadAsJSON(att.data, att.filename)
    else downloadAsExcel(att.data, att.filename?.endsWith('.xlsx') ? att.filename : (att.filename?.replace(/\.(csv|tsv)$/, '') ?? 'dados') + '.xlsx')
  }

  const icons = { csv: '📊', json: '📋', xlsx: '📊', tsv: '📊' }

  return (
    <button onClick={handleDownload} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'var(--accent-light)', border: '1px solid var(--accent)',
      borderRadius: 8, padding: '5px 12px', cursor: 'pointer',
      fontSize: 12, fontWeight: 600, color: 'var(--joule)',
      fontFamily: 'inherit', transition: 'background 0.12s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = '#d4edb8'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--accent-light)'}
    >
      <span>{icons[att.format] ?? '📄'}</span>
      Baixar {att.filename}
    </button>
  )
}
