import { useState, useRef, useLayoutEffect } from 'react'

export default function ConversationList({ conversations = [], activeId, onSelect, onNew, onDelete, onRename }) {
  const [sectionOpen, setSectionOpen] = useState(true)
  const [openMenu, setOpenMenu] = useState(null)
  const [renamingId, setRenamingId] = useState(null)

  function startRename(id) {
    setRenamingId(id)
    setOpenMenu(null)
  }

  function commitRename(id, title) {
    setRenamingId(null)
    if (title.trim()) onRename?.(id, title.trim())
  }

  return (
    <div style={{
      width: 320,
      minWidth: 320,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-shell)',
      borderRight: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      {openMenu !== null && (
        <div
          onClick={() => setOpenMenu(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 100 }}
        />
      )}

      {/* Header */}
      <div style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-shell)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
          Conversas
        </span>
        <button
          onClick={onNew}
          title="Nova conversa"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 12px',
            border: '1px solid var(--joule)',
            borderRadius: 8,
            background: 'transparent',
            color: 'var(--joule)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--joule-bg)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <svg viewBox="0 0 14 14" width="13" height="13" fill="currentColor">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Nova
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {conversations.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Nenhuma conversa ainda.
            <br />
            <span
              onClick={onNew}
              style={{ color: 'var(--joule)', cursor: 'pointer', marginTop: 8, display: 'inline-block', fontWeight: 600 }}
            >
              Iniciar nova conversa
            </span>
          </div>
        ) : (
          <>
            <button
              onClick={() => setSectionOpen(o => !o)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: 12,
                fontFamily: 'inherit',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span>{conversations.length} conversa{conversations.length !== 1 ? 's' : ''}</span>
              <svg
                viewBox="0 0 16 16" width="14" height="14" fill="currentColor"
                style={{ transform: sectionOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}
              >
                <path d="M2 5l6 6 6-6z"/>
              </svg>
            </button>

            {sectionOpen && (
              <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {conversations.map(conv => (
                  <ConvItem
                    key={conv.id}
                    conv={conv}
                    active={activeId === conv.id}
                    menuOpen={openMenu === conv.id}
                    renaming={renamingId === conv.id}
                    onSelect={() => { onSelect(conv.id); setOpenMenu(null) }}
                    onMenuToggle={e => { e.stopPropagation(); setOpenMenu(openMenu === conv.id ? null : conv.id) }}
                    onDelete={() => { onDelete?.(conv.id); setOpenMenu(null) }}
                    onRenameStart={() => startRename(conv.id)}
                    onRenameCommit={title => commitRename(conv.id, title)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ConvItem({ conv, active, menuOpen, renaming, onSelect, onMenuToggle, onDelete, onRenameStart, onRenameCommit }) {
  const inputRef = useRef(null)
  const [draftTitle, setDraftTitle] = useState(conv.title)

  useLayoutEffect(() => {
    if (renaming) inputRef.current?.select()
  }, [renaming])

  return (
    <div
      onClick={renaming ? undefined : onSelect}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px',
        borderRadius: 8,
        border: active ? '1px solid var(--joule)' : '1px solid var(--border)',
        background: active ? 'var(--joule-bg)' : 'var(--bg-page)',
        cursor: renaming ? 'default' : 'pointer',
        transition: 'box-shadow 0.12s, border-color 0.12s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
    >
      {renaming ? (
        <input
          ref={inputRef}
          value={draftTitle}
          onChange={e => setDraftTitle(e.target.value)}
          onBlur={() => onRenameCommit(draftTitle)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); onRenameCommit(draftTitle) }
            if (e.key === 'Escape') onRenameCommit(conv.title)
          }}
          onClick={e => e.stopPropagation()}
          style={{
            flex: 1,
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--joule)',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid var(--joule)',
            outline: 'none',
            fontFamily: 'inherit',
            paddingRight: 8,
          }}
        />
      ) : (
        <span style={{
          fontSize: 13,
          fontWeight: 500,
          color: active ? 'var(--joule)' : 'var(--text-primary)',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          paddingRight: 8,
        }}>
          {conv.title}
        </span>
      )}

      <button
        onClick={onMenuToggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 26, height: 26,
          border: '1px solid var(--border)',
          borderRadius: 6,
          background: 'transparent',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--joule)'; e.currentTarget.style.color = 'var(--joule)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
          <circle cx="8" cy="3" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="13" r="1.5"/>
        </svg>
      </button>

      {menuOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 36,
            zIndex: 200,
            background: 'var(--bg-page)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            minWidth: 150,
            overflow: 'hidden',
          }}
        >
          {[
            {
              icon: (
                <svg viewBox="0 0 14 14" width="13" height="13" fill="currentColor">
                  <path d="M1 7h12M7 1v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ),
              label: 'Renomear',
              action: onRenameStart,
              danger: false,
            },
            {
              icon: (
                <svg viewBox="0 0 14 14" width="13" height="13" fill="currentColor">
                  <path d="M2 4h10M5 4V2h4v2M5 6v5M9 6v5M3 4l.5 8h7l.5-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              ),
              label: 'Eliminar',
              action: onDelete,
              danger: true,
            },
          ].map(item => (
            <button
              key={item.label}
              onClick={e => { e.stopPropagation(); item.action?.() }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '10px 14px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                color: item.danger ? '#F05A22' : 'var(--text-primary)',
                fontFamily: 'inherit',
                textAlign: 'left',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
