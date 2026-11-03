import { useRef, useState, useCallback } from 'react'
import { processFile, isImage, ACCEPTED_TYPES, getModelFileSupport } from '../api/files.js'

// ── File chip preview ─────────────────────────────────────────────────────────

function FileChip({ attachment, onRemove, processing }) {
  const isImg = attachment.type === 'image'
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: isImg ? '#f0f8e8' : '#f3f4f6',
      border: `1px solid ${isImg ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 8, padding: '3px 8px 3px 6px',
      fontSize: 12, maxWidth: 160,
    }}>
      {processing ? (
        <div className="animate-spin-custom" style={{ width: 11, height: 11, borderRadius: '50%', border: '1.5px solid var(--accent-light)', borderTopColor: 'var(--accent)', flexShrink: 0 }} />
      ) : isImg ? (
        <svg viewBox="0 0 16 16" width="11" height="11" fill="none" style={{ flexShrink: 0 }}>
          <rect x="1" y="1" width="14" height="14" rx="2" stroke="var(--accent)" strokeWidth="1.5"/>
          <circle cx="5.5" cy="5.5" r="1.5" fill="var(--accent)"/>
          <path d="M1 11l4-4 3 3 2-2 5 5" stroke="var(--accent)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" width="11" height="11" fill="none" style={{ flexShrink: 0 }}>
          <path d="M3 1h7l3 3v11H3V1z" stroke="var(--text-muted)" strokeWidth="1.3" strokeLinejoin="round"/>
          <path d="M10 1v3h3" stroke="var(--text-muted)" strokeWidth="1.3" strokeLinejoin="round"/>
          <path d="M5 7h6M5 9.5h4" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      )}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)', fontWeight: 500 }}>
        {attachment.name}
      </span>
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', lineHeight: 1, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 1 }}>
        <svg viewBox="0 0 12 12" width="11" height="11" fill="currentColor">
          <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )
}

// ── Perfil de IA selector ─────────────────────────────────────────────────────

function OrchSelector({ orchestrations, selectedOrchId, onOrchChange }) {
  const [open, setOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState(null)
  const btnRef = useRef(null)
  const selected = orchestrations.find(o => o.id === selectedOrchId)

  function handleOpen() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setDropdownPos({
        left: rect.left,
        ...(rect.top > window.innerHeight - rect.bottom
          ? { bottom: window.innerHeight - rect.top + 6 }
          : { top: rect.bottom + 6 })
      })
    }
    setOpen(o => !o)
  }

  if (!orchestrations || orchestrations.length <= 1) return null

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button ref={btnRef} onClick={handleOpen}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', border: '1.5px solid var(--accent)', borderRadius: 20, background: open ? 'var(--accent-light)' : 'transparent', color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'var(--accent-light)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent' }}>
        <svg viewBox="0 0 20 20" width="12" height="12" fill="currentColor">
          <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 2a6 6 0 110 12A6 6 0 0110 4zm0 2a4 4 0 100 8 4 4 0 000-8zm0 2a2 2 0 110 4 2 2 0 010-4z"/>
        </svg>
        {selected?.name ?? 'Perfil'}
        <svg viewBox="0 0 12 12" width="9" height="9" fill="currentColor" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <path d="M2 4l4 4 4-4z"/>
        </svg>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 100 }} />
          <div style={{ position: 'fixed', ...dropdownPos, zIndex: 200, background: '#fff', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-popover)', minWidth: 220, maxWidth: 320, maxHeight: '60vh', overflowY: 'auto' }}>
            <div style={{ padding: '8px 12px 4px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', position: 'sticky', top: 0, background: '#fff', borderBottom: '1px solid var(--border)', zIndex: 1 }}>
              Perfil de IA
            </div>
            {orchestrations.map(orch => (
              <button key={orch.id} onClick={() => { onOrchChange(orch.id); setOpen(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', background: orch.id === selectedOrchId ? 'var(--accent-light)' : 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, color: orch.id === selectedOrchId ? 'var(--joule)' : 'var(--text-primary)', fontWeight: orch.id === selectedOrchId ? 600 : 400, fontFamily: 'inherit', textAlign: 'left' }}
                onMouseEnter={e => { if (orch.id !== selectedOrchId) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                onMouseLeave={e => { if (orch.id !== selectedOrchId) e.currentTarget.style.background = 'transparent' }}>
                <svg viewBox="0 0 12 12" width="12" height="12" fill="transparent">
                  {orch.id === selectedOrchId && <path d="M1 6l4 4 6-7" stroke="var(--accent)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>}
                </svg>
                <div>
                  <div>{orch.name}</div>
                  {orch.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{orch.description}</div>}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MessageInput({ onSend, loading = false, orchestrations = [], selectedOrchId, onOrchChange, conversationOrchId }) {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [attachments, setAttachments] = useState([])  // processed file objects
  const [processing, setProcessing] = useState(false)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  const selectedOrch = orchestrations.find(o => o.id === selectedOrchId)
  const { supportsImages, note } = getModelFileSupport(selectedOrch?.name ?? '')

  // ── File handling ────────────────────────────────────────────────────────

  const addFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList)
    if (!files.length) return
    setProcessing(true)
    try {
      const processed = await Promise.all(files.map(f => processFile(f)))
      // Filter images if model doesn't support them
      const filtered = processed.filter(a => {
        if (a.type === 'image' && !supportsImages) return false
        return true
      })
      setAttachments(prev => [...prev, ...filtered])
    } catch (err) {
      console.error('File processing error:', err)
    } finally {
      setProcessing(false)
    }
  }, [supportsImages])

  function handleFileChange(e) {
    addFiles(e.target.files)
    e.target.value = ''
  }

  function removeAttachment(idx) {
    setAttachments(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Drag & drop ──────────────────────────────────────────────────────────

  function handleDragOver(e) {
    e.preventDefault()
    setDragging(true)
  }
  function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false)
  }
  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
  }

  function submit() {
    const text = value.trim()
    if ((!text && attachments.length === 0) || loading) return
    onSend(text, attachments)
    setValue('')
    setAttachments([])
  }

  const hasContent = value.trim().length > 0 || attachments.length > 0

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        width: '100%', background: '#fff',
        border: dragging
          ? '1.5px dashed var(--accent)'
          : focused ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
        borderRadius: 14,
        boxShadow: focused ? '0 0 0 3px rgba(140,198,62,0.12)' : dragging ? '0 0 0 3px rgba(140,198,62,0.2)' : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        position: 'relative',
      }}
    >
      {/* Drag overlay */}
      {dragging && (
        <div style={{ position: 'absolute', inset: 0, borderRadius: 14, background: 'rgba(140,198,62,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, pointerEvents: 'none' }}>
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>Solte os arquivos aqui</div>
        </div>
      )}

      {/* Top row: Perfil selector */}
      {orchestrations.length > 1 && (
        <div style={{ padding: '10px 14px 0', display: 'flex', alignItems: 'center' }}>
          <OrchSelector orchestrations={orchestrations} selectedOrchId={selectedOrchId} onOrchChange={onOrchChange} />
        </div>
      )}

      {/* File chips */}
      {attachments.length > 0 && (
        <div style={{ padding: '8px 14px 0', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {attachments.map((a, i) => (
            <FileChip key={i} attachment={a} onRemove={() => removeAttachment(i)} processing={false} />
          ))}
          {processing && <FileChip attachment={{ name: 'Processando…', type: 'text' }} onRemove={() => {}} processing={true} />}
        </div>
      )}

      {/* Warning when images not supported */}
      {note && attachments.some(a => a.type === 'image') && (
        <div style={{ padding: '6px 14px 0', fontSize: 11, color: '#f59e0b' }}>⚠️ {note}</div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef} rows={1} value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={attachments.length > 0 ? 'Adicione uma pergunta sobre os arquivos…' : 'Envie uma mensagem ao Zilo…'}
        style={{
          width: '100%', resize: 'none', background: 'transparent',
          padding: (orchestrations.length > 1 || attachments.length > 0) ? '8px 16px 4px' : '14px 16px 4px',
          fontSize: 14, color: 'var(--text-primary)',
          fontFamily: 'inherit', border: 'none', outline: 'none',
          minHeight: 50, maxHeight: 160, display: 'block', lineHeight: 1.5,
        }}
      />

      {/* Bottom row: attach + send */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 12px 10px' }}>
        {/* Attach button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          title="Anexar arquivo (PDF, Word, Excel, imagem…)"
          style={{
            background: 'none', border: '1px solid var(--border)', borderRadius: 8,
            padding: '5px 8px', cursor: loading ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)',
            fontSize: 12, fontFamily: 'inherit', transition: 'border-color 0.12s',
          }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
            <path d="M13.5 8.5l-6 6a4 4 0 01-5.66-5.66l6.5-6.5a2.5 2.5 0 013.54 3.54l-6.5 6.5a1 1 0 01-1.42-1.42l5.5-5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Anexar
        </button>

        {/* Send button */}
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
            <div className="animate-spin-custom" style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
          ) : (
            <svg viewBox="0 0 512 512" width="16" height="16" fill="white">
              <path d="M455 32q10 0 17.5 7.5T480 58q0 6-2 9L323 464q-7 16-24 16-8 0-14.5-4t-9.5-12l-64-164-163-65q-16-6-16-24 0-17 16-24L445 34q6-2 10-2z"/>
            </svg>
          )}
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  )
}
