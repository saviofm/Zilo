const CONVERSATIONS_BASE = '/api/conversations'

// Creates a conversation on first message, reuses on subsequent messages.
export async function sendInsightChat({ message, orchestrationId, context, conversationId, onDelta, onDone, onConversationCreated }) {
  let convId = conversationId

  if (!convId) {
    const title = 'Insights: ' + message.slice(0, 50)
    const convRes = await fetch(`${CONVERSATIONS_BASE}/Conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, orchestration_id: orchestrationId }),
    })
    if (!convRes.ok) throw new Error(`Erro ao criar conversa: ${await convRes.text()}`)
    const conv = await convRes.json()
    convId = conv.id
    onConversationCreated?.(convId)
  }

  const fullMessage = context
    ? `[CONTEXTO DOS DADOS]\n${context}\n\n[PERGUNTA DO USUÁRIO]\n${message}`
    : message

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId: convId, message: fullMessage, orchestrationId, stream: true }),
  })

  if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`)

  const reader  = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop()
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const ev = JSON.parse(line.slice(6).trim())
        if (ev.type === 'delta' && ev.text) onDelta(ev.text)
        else if (ev.type === 'done') { onDone?.(); return }
      } catch {}
    }
  }
  onDone?.()
}

export async function fetchAvailableOrchestrations() {
  const res = await fetch('/api/conversations/ConversationService.myOrchestrations()', {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data?.value) ? data.value : []
}
