const BASE = '/api/conversations'

async function odata(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`)
  if (res.status === 204) return null
  return res.json()
}

export async function listConversations() {
  const data = await odata('GET', '/Conversations?$orderby=updatedAt%20desc')
  return Array.isArray(data?.value) ? data.value : Array.isArray(data) ? data : []
}

export async function createConversation(title, orchestrationId) {
  return odata('POST', '/Conversations', { title, orchestration_id: orchestrationId ?? null })
}

export async function loadConversation(id) {
  return odata('GET', `/Conversations('${encodeURIComponent(id)}')?$expand=messages($orderby=seq%20asc)`)
}

export async function appendMessage(conversationId, seq, role, blocks) {
  return odata('POST', '/Messages', {
    conversation_id: conversationId,
    seq,
    role,
    content: JSON.stringify(blocks),
  })
}

export async function renameConversation(id, title) {
  return odata('POST', `/Conversations('${encodeURIComponent(id)}')/ConversationService.rename`, { title })
}

export async function deleteConversation(id) {
  return odata('DELETE', `/Conversations('${encodeURIComponent(id)}')`)
}
