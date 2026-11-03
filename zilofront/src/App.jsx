import { useState, useRef, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import MessageInput from './components/MessageInput'
import ConversationList from './components/ConversationList'
import Markdown from './components/Markdown'
import ConsumptionRoute from './routes/ConsumptionRoute'
import SessionExpiredScreen from './components/SessionExpiredScreen'
import { sendChat } from './api/chat'
import { fetchUser } from './api/user'
import { fetchMyOrchestrations, fetchBudgetStatus } from './api/orchestrations'
import {
  listConversations, createConversation, loadConversation,
  renameConversation, deleteConversation,
} from './api/conversations'

function UserMessage({ content }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
      <div style={{
        background: 'var(--bubble-user)',
        border: '1px solid #c8e8b0',
        color: 'var(--text-primary)',
        padding: '12px 16px', borderRadius: '16px 16px 4px 16px',
        fontSize: 14, lineHeight: 1.6, maxWidth: '65%', wordBreak: 'break-word',
      }}>
        {content}
      </div>
    </div>
  )
}

function ThinkingMessage() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 20, gap: 10 }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0, marginTop: 2,
        background: '#fff', border: '1.5px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 2,
      }}>
        <img src="/logo_simples.png" alt="Zilo" style={{ width: 22, height: 22, objectFit: 'contain' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '10px 0' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--joule)', opacity: 0.5,
            animation: `thinkingPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  )
}

function AssistantMessage({ content, streaming }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 20, gap: 10 }}>
      {/* Zilo avatar */}
      <div style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0, marginTop: 2,
        background: '#fff', border: '1.5px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 2,
      }}>
        <img src="/logo_simples.png" alt="Zilo" style={{ width: 22, height: 22, objectFit: 'contain' }} />
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.7, maxWidth: '80%', wordBreak: 'break-word', color: 'var(--text-primary)' }}>
        <Markdown text={content} />
        {streaming && <span className="streaming-cursor" />}
      </div>
    </div>
  )
}

function makeConv(id, title, orchestrationId = null) {
  return { id, title, orchestrationId, messages: [], loaded: false, processing: false }
}

export default function App() {
  const [activeNav, setActiveNav] = useState('chat')
  const [showConvList, setShowConvList] = useState(true)
  const [conversations, setConversations] = useState([])
  const [activeConvId, setActiveConvId] = useState(null)
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [orchestrations, setOrchestrations] = useState([])
  const [selectedOrchId, setSelectedOrchId] = useState(null)
  const [budgetStatus, setBudgetStatus] = useState(null)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [consumptionRefresh, setConsumptionRefresh] = useState(0)
  const bottomRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const lastAssistantRef = useRef(null)

  useEffect(() => {
    const handler = () => setSessionExpired(true)
    window.addEventListener('session-expired', handler)
    return () => window.removeEventListener('session-expired', handler)
  }, [])

  useEffect(() => { fetchUser().then(setCurrentUser) }, [])

  useEffect(() => {
    fetchMyOrchestrations().then(list => {
      setOrchestrations(list)
      if (list.length > 0 && !selectedOrchId) setSelectedOrchId(list[0].id)
    }).catch(() => {})
    fetchBudgetStatus().then(setBudgetStatus).catch(() => {})
  }, [])

  useEffect(() => {
    listConversations().then(list => {
      setConversations(list.map(c => makeConv(c.id, c.title, c.orchestration_id)))
    }).catch(() => {})
  }, [])

  const activeConv = conversations.find(c => c.id === activeConvId) ?? null
  const messages = activeConv?.messages ?? []

  // True when user is near the bottom (within 150px)
  function isNearBottom() {
    const el = scrollContainerRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 150
  }

  // During streaming: follow bottom only if user was already near it
  useEffect(() => {
    if (isStreaming && isNearBottom()) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [streamingText]) // eslint-disable-line

  // When response completes: scroll to start of last assistant message
  useEffect(() => {
    if (!isStreaming && messages.length > 0) {
      setTimeout(() => {
        lastAssistantRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
    }
  }, [messages.length]) // eslint-disable-line

  // The orchestration for a given send: use active conv's orchId or fallback to selector
  const activeOrchId = activeConv?.orchestrationId ?? selectedOrchId

  function patchConv(id, patch) {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  }

  async function handleSend(text) {
    if (!text.trim() || isStreaming) return

    let convId = activeConvId
    const orchId = selectedOrchId  // always use the selector's current choice

    if (!convId) {
      const title = text.slice(0, 60) || 'Nova conversa'
      try {
        const created = await createConversation(title, orchId)
        convId = created.id
        setConversations(prev => [makeConv(convId, title, orchId), ...prev])
        setActiveConvId(convId)
      } catch {
        convId = `local-${Date.now()}`
        setConversations(prev => [makeConv(convId, text.slice(0, 40), orchId), ...prev])
        setActiveConvId(convId)
      }
    } else if (orchId && orchId !== activeConv?.orchestrationId) {
      // User switched persona mid-conversation — update locally
      patchConv(convId, { orchestrationId: orchId })
    }

    const userMsg = { role: 'user', content: text }
    patchConv(convId, {
      messages: [...(conversations.find(c => c.id === convId)?.messages ?? []), userMsg],
      processing: true,
    })

    setIsStreaming(true)
    setStreamingText('')

    let fullText = ''
    try {
      await sendChat({
        conversationId: convId,
        message: text,
        orchestrationId: orchId,  // send current persona selection per message
        onDelta: (chunk) => {
          fullText += chunk
          setStreamingText(fullText)
        },
        onDone: () => {},
      })

      const assistantMsg = { role: 'assistant', content: fullText }
      patchConv(convId, {
        messages: [...(conversations.find(c => c.id === convId)?.messages ?? []), userMsg, assistantMsg],
        processing: false,
      })
      // Backend (server.js) already persists both messages — no appendMessage needed here.
    } catch (err) {
      patchConv(convId, {
        messages: [...(conversations.find(c => c.id === convId)?.messages ?? []), userMsg,
          { role: 'assistant', content: `⚠️ ${err.message}` }],
        processing: false,
      })
    } finally {
      setIsStreaming(false)
      setStreamingText('')
      fetchBudgetStatus().then(setBudgetStatus).catch(() => {})
      setConsumptionRefresh(r => r + 1)
    }
  }

  async function handleSelectConversation(id) {
    setActiveConvId(id)
    const conv = conversations.find(c => c.id === id)
    // Sync selector to the conversation's persona
    if (conv?.orchestrationId) setSelectedOrchId(conv.orchestrationId)
    if (!conv || conv.loaded) return
    try {
      const data = await loadConversation(id)
      const rawMsgs = Array.isArray(data.messages) ? data.messages : data.messages?.value ?? []
      const msgs = rawMsgs.map(m => {
        let blocks
        try { blocks = JSON.parse(m.content) } catch { blocks = [{ type: 'text', text: m.content }] }
        const text = Array.isArray(blocks) ? blocks.filter(b => b.type === 'text').map(b => b.text).join('\n') : m.content
        return { role: m.role, content: text }
      })
      patchConv(id, { messages: msgs, loaded: true })
    } catch { patchConv(id, { loaded: true }) }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg-page)' }}>
      <Sidebar activeItem={activeNav} user={currentUser} budgetStatus={budgetStatus} onSelect={setActiveNav} />

      {activeNav === 'chat' && showConvList && (
        <ConversationList
          conversations={conversations}
          activeId={activeConvId}
          onSelect={handleSelectConversation}
          onNew={() => setActiveConvId(null)}
          onDelete={(id) => {
            setConversations(prev => prev.filter(c => c.id !== id))
            if (activeConvId === id) setActiveConvId(null)
            if (!String(id).startsWith('local-')) deleteConversation(id).catch(() => {})
          }}
          onRename={(id, title) => {
            patchConv(id, { title })
            if (!String(id).startsWith('local-')) renameConversation(id, title).catch(() => {})
          }}
        />
      )}

      {activeNav === 'chat' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, background: '#fff' }}>
          <Header
            title={activeConv?.title || 'Zilo'}
            onMenuClick={() => setShowConvList(s => !s)}
          />

          {/* Messages */}
          <div ref={scrollContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '32px 56px 16px' }}>
            {messages.length === 0 && !isStreaming && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 20 }}>
                <img src="/LOGO_COMPLETO.png" alt="Zilo" style={{ height: 110, objectFit: 'contain' }} />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--joule)', marginBottom: 8 }}>
                    Como posso ajudar?
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 380 }}>
                    Assistente de IA da Zilor. Faça perguntas sobre documentos, políticas e dados da empresa.
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg, i) => {
              const isLastAssistant = msg.role === 'assistant' && i === messages.length - 1
              return msg.role === 'user'
                ? <UserMessage key={i} content={msg.content} />
                : <div key={i} ref={isLastAssistant ? lastAssistantRef : null}>
                    <AssistantMessage content={msg.content} streaming={false} />
                  </div>
            })}

            {isStreaming && !streamingText && <ThinkingMessage />}
            {isStreaming && streamingText && (
              <AssistantMessage content={streamingText} streaming={true} />
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px 56px 4px', borderTop: '1px solid var(--border)', background: '#fff' }}>
            <MessageInput
              onSend={handleSend}
              loading={isStreaming}
              orchestrations={orchestrations}
              selectedOrchId={selectedOrchId}
              conversationOrchId={activeConv?.orchestrationId}
              onOrchChange={setSelectedOrchId}
            />
          </div>
          <div style={{ textAlign: 'center', padding: '4px 0 10px', fontSize: 11, color: 'var(--text-disabled)' }}>
            O Zilo pode cometer erros. Verifique informações importantes.
          </div>
        </div>
      )}

      {activeNav === 'consumption' && <ConsumptionRoute refreshTrigger={consumptionRefresh} />}

      {sessionExpired && <SessionExpiredScreen />}
    </div>
  )
}
