// POST /api/chat — streaming SSE
// attachments: array of processed file objects from api/files.js
// onAttachment: called when server detects a downloadable block { format, data, filename }
export async function sendChat({ conversationId, message, orchestrationId, attachments = [], onDelta, onDone, onAttachment }) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId, message, orchestrationId, attachments, stream: true }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    if (res.status === 402) throw new Error('Budget mensal esgotado. Entre em contato com o administrador.')
    throw new Error(body.error || `HTTP ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const raw = line.slice(6).trim()
      try {
        const parsed = JSON.parse(raw)
        if (parsed.type === 'delta' && parsed.text) onDelta(parsed.text)
        if (parsed.type === 'attachment') onAttachment?.(parsed)
        if (parsed.type === 'chart') onAttachment?.({ ...parsed, isChart: true })
        if (parsed.type === 'done') onDone(parsed)
      } catch { /* SSE comment */ }
    }
  }
}
