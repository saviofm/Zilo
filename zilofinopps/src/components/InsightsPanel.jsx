import { useState, useRef, useEffect } from 'react'
import { sendInsightChat, fetchAvailableOrchestrations } from '../api/chat'

function ThinkingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '10px 0' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: 'var(--joule)', opacity: 0.5,
          animation: `thinkingPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  )
}

function Message({ role, content, streaming }) {
  const isUser = role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
      <div style={{
        maxWidth: '88%', padding: '10px 14px', borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
        background: isUser ? 'var(--bubble-user)' : '#f7f8fa',
        border: `1px solid ${isUser ? '#c8e8b0' : 'var(--border)'}`,
        fontSize: 13, lineHeight: 1.55, color: 'var(--text-primary)',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {content}
        {streaming && <span className="streaming-cursor" />}
      </div>
    </div>
  )
}

export default function InsightsPanel({ open, onClose, contextData, contextLabel }) {
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [orchId, setOrchId]     = useState(null)
  const [streamingText, setStreamingText] = useState('')
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    fetchAvailableOrchestrations().then(list => {
      if (list.length > 0) setOrchId(list[0].id)
    })
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 100)
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)
    setStreamingText('')

    const ctx = contextData ? JSON.stringify(contextData, null, 2).slice(0, 3000) : null

    let full = ''
    try {
      await sendInsightChat({
        message: text,
        orchestrationId: orchId,
        context: ctx,
        onDelta: chunk => { full += chunk; setStreamingText(full) },
        onDone: () => {},
      })
      setMessages(prev => [...prev, { role: 'assistant', content: full }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${err.message}` }])
    } finally {
      setLoading(false)
      setStreamingText('')
    }
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.15)' }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 400,
        width: 400, background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.14)',
        display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.18s ease',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-light)', border: '1.5px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💡</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Agente de Insights</div>
            {contextLabel && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Contexto: {contextLabel}</div>}
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-muted)', lineHeight: 1, padding: 4 }}>×</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
          {messages.length === 0 && !loading && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 32 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>💡</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Pergunte sobre os dados</div>
              <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                Faça perguntas sobre consumo, tendências, modelos com maior custo, usuários mais ativos, etc.
              </div>
              {contextLabel && (
                <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--accent-light)', borderRadius: 8, fontSize: 12, color: 'var(--joule)' }}>
                  Dados de "{contextLabel}" carregados como contexto
                </div>
              )}
            </div>
          )}

          {messages.map((m, i) => <Message key={i} role={m.role} content={m.content} />)}

          {loading && !streamingText && <ThinkingDots />}
          {loading && streamingText && <Message role="assistant" content={streamingText} streaming />}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', flexShrink: 0, background: '#fff' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Pergunte sobre os dados…"
              disabled={loading}
              style={{
                flex: 1, resize: 'none', border: '1.5px solid var(--border)', borderRadius: 10,
                padding: '9px 12px', fontSize: 13, lineHeight: 1.5, maxHeight: 120, overflowY: 'auto',
                background: '#fff', color: 'var(--text-primary)', fontFamily: 'inherit',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
              rows={2}
            />
            <button onClick={handleSend} disabled={!input.trim() || loading} className="btn-accent"
              style={{ padding: '9px 14px', borderRadius: 10, flexShrink: 0 }}>
              ↑
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 6, textAlign: 'center' }}>
            Enter para enviar · Shift+Enter nova linha
          </div>
        </div>
      </div>
    </>
  )
}
