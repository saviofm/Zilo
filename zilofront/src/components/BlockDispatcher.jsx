// Dispatches SSE block events to the correct React component.
// Handles grouping of consecutive KPI blocks into a flex row.
import ChartBlock from './ChartBlock'
import TableBlock from './TableBlock'
import KpiBlock from './KpiBlock'
import CalculatorBlock from './CalculatorBlock'
import CodeBlock from './CodeBlock'
import DownloadChip from './DownloadChip'

export default function BlockDispatcher({ blocks = [] }) {
  if (!blocks.length) return null

  // Group consecutive KPIs into rows
  const grouped = []
  let kpiRun = []

  function flushKpis() {
    if (kpiRun.length) {
      grouped.push({ type: '_kpi_row', items: [...kpiRun] })
      kpiRun = []
    }
  }

  for (const block of blocks) {
    if (block.kind === 'kpi') {
      kpiRun.push(block)
    } else {
      flushKpis()
      grouped.push(block)
    }
  }
  flushKpis()

  return (
    <div style={{ marginLeft: 40, marginBottom: 8 }}>
      {grouped.map((block, i) => {
        if (block.type === '_kpi_row') {
          return (
            <div key={i} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
              {block.items.map((kpi, j) => <KpiBlock key={j} data={kpi.data} />)}
            </div>
          )
        }
        switch (block.kind) {
          case 'chart':      return <ChartBlock key={i} data={block.data} />
          case 'table':      return <TableBlock key={i} data={block.data} />
          case 'calculator': return <CalculatorBlock key={i} data={block.data} />
          case 'code':       return <CodeBlock key={i} data={block.data} />
          case 'attachment': return (
            <div key={i} style={{ marginBottom: 8 }}>
              <DownloadChip att={{ format: block.data?.format, filename: block.data?.filename, data: block.data?.data }} />
            </div>
          )
          default: return null
        }
      })}
    </div>
  )
}
