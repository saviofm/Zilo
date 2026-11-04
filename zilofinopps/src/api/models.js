const ADMIN = '/api/admin'

export async function fetchModelCatalog() {
  const res = await fetch(`${ADMIN}/ModelCatalog?$filter=isActive eq true&$orderby=provider,displayName`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data?.value) ? data.value : []
}

export async function fetchJobRoles() {
  const res = await fetch(`${ADMIN}/JobRole?$filter=isActive eq true&$expand=policy($select=id,name,monthlyBudgetCU)&$orderby=name`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data?.value) ? data.value : []
}

export async function fetchOrchestrations() {
  const res = await fetch(`${ADMIN}/OrchestrationConfig?$filter=isActive eq true&$orderby=sortOrder&$select=id,name,orchestrationCUPerCall,sortOrder&$expand=model($select=id,displayName,inputCUPer1k,outputCUPer1k)`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data?.value) ? data.value : []
}
