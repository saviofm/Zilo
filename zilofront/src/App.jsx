import { useState, useRef, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import MessageInput from './components/MessageInput'
import ConversationList from './components/ConversationList'
import Markdown from './components/Markdown'
import ConsumptionRoute from './routes/ConsumptionRoute'
import { sendChat } from './api/chat'
import { fetchUser } from './api/user'
import { fetchMyOrchestrations, fetchBudgetStatus } from './api/orchestrations'
import {
  listConversations, createConversation, loadConversation,
  appendMessage, renameConversation, deleteConversation,
} from './api/conversations'

function UserMessage({ content }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
      <div style={{
        background: 'var(--bubble-user)', color: 'var(--text-primary)',
        padding: '12px 16px', borderRadius: '16px 16px 4px 16px',
        fontSize: 14, lineHeight: 1.6, maxWidth: '60%', wordBreak: 'break-word',
      }}>
        {content}
      </div>
    </div>
  )
}

function AssistantMessage({ content, streaming }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 24 }}>
      <div style={{ fontSize: 14, lineHeight: 1.7, maxWidth: '88%', wordBreak: 'break-word', color: 'var(--text-primary)' }}>
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
  const bottomRef = useRef(null)

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [streamingText, conversations])

  const activeConv = conversations.find(c => c.id === activeConvId) ?? null
  const messages = activeConv?.messages ?? []

  function patchConv(id, patch) {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  }

  async function handleSend(text) {
    if (!text.trim() || isStreaming) return

    let convId = activeConvId
    let convOrchId = activeConv?.orchestrationId ?? selectedOrchId

    if (!convId) {
      const title = text.slice(0, 60) || 'Nova conversa'
      try {
        const created = await createConversation(title, convOrchId)
        convId = created.id
        setConversations(prev => [makeConv(convId, title, convOrchId), ...prev])
        setActiveConvId(convId)
      } catch {
        convId = `local-${Date.now()}`
        setConversations(prev => [makeConv(convId, text.slice(0, 40), convOrchId), ...prev])
        setActiveConvId(convId)
      }
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

      if (!String(convId).startsWith('local-')) {
        const seq = messages.length
        appendMessage(convId, seq, 'user', [{ type: 'text', text }]).catch(() => {})
        appendMessage(convId, seq + 1, 'assistant', [{ type: 'text', text: fullText }]).catch(() => {})
      }
    } catch (err) {
      patchConv(convId, {
        messages: [...(conversations.find(c => c.id === convId)?.messages ?? []), userMsg,
          { role: 'assistant', content: `⚠️ ${err.message}` }],
        processing: false,
      })
    } finally {
      setIsStreaming(false)
      setStreamingText('')
      // Refresh budget after each message
      fetchBudgetStatus().then(setBudgetStatus).catch(() => {})
    }
  }

  async function handleSelectConversation(id) {
    setActiveConvId(id)
    const conv = conversations.find(c => c.id === id)
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
      <Sidebar
        activeItem={activeNav}
        user={currentUser}
        budgetStatus={budgetStatus}
        onSelect={setActiveNav}
      />

      {/* Conversation list panel */}
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

      {/* Chat view */}
      {activeNav === 'chat' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <Header
            title={activeConv?.title || 'Zilo'}
            onMenuClick={() => setShowConvList(s => !s)}
          />

          <div style={{ flex: 1, overflowY: 'auto', padding: '32px 48px 16px' }}>
            {messages.length === 0 && !isStreaming && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--joule)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="white">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                  </svg>
                </div>
                <p style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Como posso ajudar?</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 400 }}>
                  Assistente de IA da Zilor. Faça perguntas sobre documentos, políticas e dados da empresa.
                </p>
              </div>
            )}

            {messages.map((msg, i) =>
              msg.role === 'user'
                ? <UserMessage key={i} content={msg.content} />
                : <AssistantMessage key={i} content={msg.content} streaming={false} />
            )}

            {isStreaming && streamingText && (
              <AssistantMessage content={streamingText} streaming={true} />
            )}

            <div ref={bottomRef} />
          </div>

          <div style={{ padding: '12px 48px 4px', borderTop: '1px solid var(--border)', background: 'var(--bg-page)' }}>
            <MessageInput
              onSend={handleSend}
              loading={isStreaming}
              orchestrations={orchestrations}
              selectedOrchId={selectedOrchId}
              onOrchChange={setSelectedOrchId}
            />
          </div>
          <div style={{ textAlign: 'center', padding: '4px 0 8px', fontSize: 11, color: 'var(--text-disabled)' }}>
            O Zilo pode cometer erros. Verifique informações importantes.
          </div>
        </div>
      )}

      {/* Consumption view */}
      {activeNav === 'consumption' && (
        <ConsumptionRoute />
      )}
    </div>
  )
}
