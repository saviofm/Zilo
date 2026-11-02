import { useRef, useState } from 'react'

function OrchSelector({ orchestrations, selectedOrchId, conversationOrchId, onOrchChange }) {
  const [open, setOpen] = useState(false)
  const selected = orchestrations.find(o => o.id === selectedOrchId)

  if (!orchestrations || orchestrations.length <= 1) return null

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '4px 10px', border: '1.5px solid var(--accent)',
          borderRadius: 20,
          background: open ? 'var(--accent-light)' : 'transparent',
          color: 'var(--accent)', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
          transition: 'background 0.12s', whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'var(--accent-light)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent' }}
      >
        <svg viewBox="0 0 20 20" width="12" height="12" fill="currentColor">
          <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 2a6 6 0 110 12A6 6 0 0110 4zm0 2a4 4 0 100 8 4 4 0 000-8zm0 2a2 2 0 110 4 2 2 0 010-4z"/>
        </svg>
        {selected?.name ?? 'Perfil'}
        <svg viewBox="0 0 12 12" width="9" height="9" fill="currentColor"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <path d="M2 4l4 4 4-4z"/>
        </svg>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 100 }} />
          <div style={{
            position: 'absolute', bottom: '100%', left: 0, marginBottom: 6,
            background: '#fff', border: '1px solid var(--border)',
            borderRadius: 10, boxShadow: 'var(--shadow-popover)',
            minWidth: 200, zIndex: 200, overflow: 'hidden',
          }}>
            <div style={{ padding: '8px 12px 4px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Persona de IA
            </div>
            {orchestrations.map(orch => (
              <button key={orch.id} onClick={() => { onOrchChange(orch.id); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '9px 12px',
                  background: orch.id === selectedOrchId ? 'var(--accent-light)' : 'transparent',
                  border: 'none', cursor: 'pointer', fontSize: 13,
                  color: orch.id === selectedOrchId ? 'var(--joule)' : 'var(--text-primary)',
                  fontWeight: orch.id === selectedOrchId ? 600 : 400,
                  fontFamily: 'inherit', textAlign: 'left',
                }}
                onMouseEnter={e => { if (orch.id !== selectedOrchId) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                onMouseLeave={e => { if (orch.id !== selectedOrchId) e.currentTarget.style.background = 'transparent' }}
              >
                <svg viewBox="0 0 12 12" width="12" height="12" fill="transparent">
                  {orch.id === selectedOrchId && (
                    <path d="M1 6l4 4 6-7" stroke="var(--accent)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  )}
                </svg>
                <div>
                  <div>{orch.name}</div>
                  {orch.description && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{orch.description}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function MessageInput({ onSend, loading = false, orchestrations = [], selectedOrchId, onOrchChange, conversationOrchId }) {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const textareaRef = useRef(null)

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
  }

  function submit() {
    const text = value.trim()
    if (!text || loading) return
    onSend(text)
    setValue('')
  }

  const hasContent = value.trim().length > 0

  return (
    <div style={{
      width: '100%', background: '#fff',
      border: focused ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
      borderRadius: 14,
      boxShadow: focused ? '0 0 0 3px rgba(140,198,62,0.12)' : 'none',
      transition: 'border-color 0.15s, box-shadow 0.15s',
    }}>
      {orchestrations.length > 1 && (
        <div style={{ padding: '10px 14px 0', display: 'flex', alignItems: 'center' }}>
          <OrchSelector
            orchestrations={orchestrations}
            selectedOrchId={selectedOrchId}
            conversationOrchId={conversationOrchId}
            onOrchChange={onOrchChange}
          />
        </div>
      )}

      <textarea
        ref={textareaRef} rows={1} value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Envie uma mensagem ao Zilo…"
        style={{
          width: '100%', resize: 'none', background: 'transparent',
          padding: orchestrations.length > 1 ? '8px 16px 4px' : '14px 16px 4px',
          fontSize: 14, color: 'var(--text-primary)',
          fontFamily: 'inherit', border: 'none', outline: 'none',
          minHeight: 50, maxHeight: 160, display: 'block', lineHeight: 1.5,
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '4px 12px 10px' }}>
        <button
          onClick={submit}
          disabled={loading || !hasContent}
          style={{
            background: hasContent && !loading ? 'var(--accent)' : 'var(--border)',
            border: 'none', borderRadius: 8, padding: '6px 8px',
            cursor: hasContent && !loading ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { if (hasContent && !loading) e.currentTarget.style.background = 'var(--accent-hover)' }}
          onMouseLeave={e => { if (hasContent && !loading) e.currentTarget.style.background = 'var(--accent)' }}
        >
          {loading ? (
            <div className="animate-spin-custom" style={{
              width: 16, height: 16, borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: '#fff',
            }} />
          ) : (
            <svg viewBox="0 0 512 512" width="16" height="16" fill="white">
              <path d="M455 32q10 0 17.5 7.5T480 58q0 6-2 9L323 464q-7 16-24 16-8 0-14.5-4t-9.5-12l-64-164-163-65q-16-6-16-24 0-17 16-24L445 34q6-2 10-2z"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
