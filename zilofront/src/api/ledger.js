const BASE = '/api/ledger'

export async function fetchMonthlySummary() {
  const res = await fetch(`${BASE}/MonthlyUsageSummary?$orderby=yearMonth desc&$top=3`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data?.value) ? data.value : []
}

export async function fetchRecentLedger(top = 50) {
  const res = await fetch(`${BASE}/TokenLedger?$orderby=timestamp desc&$top=${top}&$expand=orchestration($select=name)`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data?.value) ? data.value : []
}

export async function fetchUsageByOrchestration(yearMonth) {
  const ym = yearMonth || new Date().toISOString().slice(0, 7)
  const res = await fetch(`${BASE}/LedgerService.myUsageByOrchestration(yearMonth='${ym}')`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data?.value) ? data.value : Array.isArray(data) ? data : []
}
