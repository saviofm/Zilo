const ADMIN = '/api/admin'

async function callFn(path) {
  const res = await fetch(path, { headers: { Accept: 'application/json' } })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data?.value) ? data.value : Array.isArray(data) ? data : []
}

async function callFnObj(path) {
  const res = await fetch(path, { headers: { Accept: 'application/json' } })
  if (!res.ok) return null
  return res.json()
}

export async function fetchUsageByMonth(months = 12) {
  return callFn(`${ADMIN}/AdminService.usageByMonth(months=${months})`)
}

export async function fetchUsageByModel(yearMonth) {
  const q = yearMonth ? `yearMonth='${yearMonth}'` : `yearMonth=null`
  return callFn(`${ADMIN}/AdminService.usageByModel(${q})`)
}

export async function fetchUsageByJobRole(yearMonth) {
  const q = yearMonth ? `yearMonth='${yearMonth}'` : `yearMonth=null`
  return callFn(`${ADMIN}/AdminService.usageByJobRole(${q})`)
}

export async function fetchUsageByUser(yearMonth) {
  const q = yearMonth ? `yearMonth='${yearMonth}'` : `yearMonth=null`
  return callFn(`${ADMIN}/AdminService.usageByUser(${q})`)
}

export async function fetchAdminLedger(yearMonth, top = 200) {
  const filter = yearMonth ? `&$filter=startswith(timestamp,'${yearMonth}')` : ''
  return callFn(`${ADMIN}/TokenLedger?$orderby=timestamp desc&$top=${top}&$expand=orchestration($select=name),model($select=displayName,provider)${filter}`)
}

export async function fetchAllMonthlySummary() {
  return callFn(`${ADMIN}/MonthlyUsageSummary?$orderby=yearMonth desc&$top=24`)
}

export async function fetchUsageByOrchestration(yearMonth) {
  const filter = yearMonth ? `&$filter=startswith(timestamp,'${yearMonth}')` : ''
  const rows = await callFn(`${ADMIN}/TokenLedger?$select=orchestration_id,totalCU&$top=5000${filter}&$expand=orchestration($select=name)`)
  const byId = {}
  for (const r of rows) {
    const id   = r.orchestration_id ?? '—'
    const name = r.orchestration?.name ?? id
    if (!byId[id]) byId[id] = { orchestrationId: id, orchestrationName: name, totalCU: 0, totalCalls: 0 }
    byId[id].totalCU    += Number(r.totalCU ?? 0)
    byId[id].totalCalls += 1
  }
  return Object.values(byId).sort((a, b) => b.totalCU - a.totalCU)
}
