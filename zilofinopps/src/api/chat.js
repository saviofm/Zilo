export async function sendInsightChat({ message, orchestrationId, context, onDelta, onDone }) {
  const body = {
    message: context ? `[CONTEXTO DOS DADOS]\n${context}\n\n[PERGUNTA DO USUÁRIO]\n${message}` : message,
    orchestrationId,
    conversationId: null,
  }

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg || `HTTP ${res.status}`)
  }

  const ct = res.headers.get('content-type') ?? ''

  if (ct.includes('text/event-stream')) {
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
        const raw = line.slice(6).trim()
        if (raw === '[DONE]') { onDone?.(); return }
        try {
          const ev = JSON.parse(raw)
          if (ev.type === 'delta' && ev.text) onDelta(ev.text)
          else if (ev.type === 'done') { onDone?.(); return }
          else if (ev.error) throw new Error(ev.error)
        } catch {}
      }
    }
    onDone?.()
  } else {
    const data = await res.json()
    const text = data.response ?? data.message ?? JSON.stringify(data)
    onDelta(text)
    onDone?.()
  }
}

export async function fetchAvailableOrchestrations() {
  const res = await fetch('/api/admin/OrchestrationConfig?$filter=isActive eq true&$orderby=sortOrder&$top=1', {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data?.value) ? data.value : []
}
