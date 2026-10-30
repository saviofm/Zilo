const BASE = '/api/conversations'

export async function fetchMyOrchestrations() {
  const res = await fetch(`${BASE}/ConversationService.myOrchestrations()`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data?.value) ? data.value : Array.isArray(data) ? data : []
}

export async function fetchBudgetStatus() {
  const res = await fetch(`${BASE}/ConversationService.myBudgetStatus()`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) return null
  return res.json()
}
