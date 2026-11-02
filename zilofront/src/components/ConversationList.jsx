import { useState, useRef, useLayoutEffect } from 'react'

export default function ConversationList({ conversations = [], activeId, onSelect, onNew, onDelete, onRename }) {
  const [openMenu, setOpenMenu] = useState(null)
  const [renamingId, setRenamingId] = useState(null)

  return (
    <div style={{
      width: 300, minWidth: 300, height: '100%',
      display: 'flex', flexDirection: 'column',
      background: '#FAFAFA',
      borderRight: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      {openMenu !== null && (
        <div onClick={() => setOpenMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: 100 }} />
      )}

      {/* Header */}
      <div style={{
        height: 64, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 16px',
        borderBottom: '1px solid var(--border)',
        background: '#fff', flexShrink: 0,
      }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--joule)' }}>
          Conversas
        </span>
        <button className="btn-accent" onClick={onNew} style={{ padding: '5px 12px', fontSize: 12 }}>
          <svg viewBox="0 0 14 14" width="12" height="12" fill="none">
            <path d="M7 1v12M1 7h12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Nova
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {conversations.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Nenhuma conversa ainda.
            <br />
            <span onClick={onNew} style={{ color: 'var(--accent)', cursor: 'pointer', marginTop: 8, display: 'inline-block', fontWeight: 600 }}>
              Iniciar nova conversa
            </span>
          </div>
        ) : (
          conversations.map(conv => (
            <ConvItem
              key={conv.id}
              conv={conv}
              active={activeId === conv.id}
              menuOpen={openMenu === conv.id}
              renaming={renamingId === conv.id}
              onSelect={() => { onSelect(conv.id); setOpenMenu(null) }}
              onMenuToggle={e => { e.stopPropagation(); setOpenMenu(openMenu === conv.id ? null : conv.id) }}
              onDelete={() => { onDelete?.(conv.id); setOpenMenu(null) }}
              onRenameStart={() => { setRenamingId(conv.id); setOpenMenu(null) }}
              onRenameCommit={title => {
                setRenamingId(null)
                if (title.trim()) onRename?.(conv.id, title.trim())
              }}
            />
          ))
        )}
      </div>
    </div>
  )
}

function ConvItem({ conv, active, menuOpen, renaming, onSelect, onMenuToggle, onDelete, onRenameStart, onRenameCommit }) {
  const inputRef = useRef(null)
  const [draft, setDraft] = useState(conv.title)

  useLayoutEffect(() => { if (renaming) inputRef.current?.select() }, [renaming])

  return (
    <div
      onClick={renaming ? undefined : onSelect}
      style={{
        position: 'relative', display: 'flex', alignItems: 'center',
        padding: '10px 12px', borderRadius: 8,
        borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent',
        background: active ? 'var(--accent-light)' : '#fff',
        cursor: renaming ? 'default' : 'pointer',
        boxShadow: active ? 'none' : '0 1px 2px rgba(0,0,0,0.04)',
        border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
        transition: 'box-shadow 0.12s, border-color 0.12s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = active ? 'none' : '0 1px 2px rgba(0,0,0,0.04)' }}
    >
      {renaming ? (
        <input
          ref={inputRef} value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => onRenameCommit(draft)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); onRenameCommit(draft) }
            if (e.key === 'Escape') onRenameCommit(conv.title)
          }}
          onClick={e => e.stopPropagation()}
          style={{
            flex: 1, fontSize: 13, fontWeight: 500,
            color: 'var(--joule)', background: 'transparent',
            border: 'none', borderBottom: '1px solid var(--accent)',
            outline: 'none', fontFamily: 'inherit', paddingRight: 8,
          }}
        />
      ) : (
        <span style={{
          fontSize: 13, fontWeight: active ? 600 : 500,
          color: active ? 'var(--joule)' : 'var(--text-primary)',
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: 'nowrap', paddingRight: 8,
        }}>
          {conv.title}
        </span>
      )}

      <button
        onClick={onMenuToggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 24, height: 24, border: 'none', borderRadius: 5,
          background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--joule)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
          <circle cx="8" cy="3" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="13" r="1.5"/>
        </svg>
      </button>

      {menuOpen && (
        <div style={{
          position: 'absolute', right: 0, top: 36, zIndex: 200,
          background: '#fff', border: '1px solid var(--border)',
          borderRadius: 10, boxShadow: 'var(--shadow-popover)',
          minWidth: 148, overflow: 'hidden',
        }}>
          {[
            { label: 'Renomear', action: onRenameStart, danger: false, icon: <svg viewBox="0 0 14 14" width="12" height="12" fill="none"><path d="M9.5 1.5L12.5 4.5M1 13l1-4L10 1l3 3-8 8-4 1z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg> },
            { label: 'Eliminar', action: onDelete, danger: true, icon: <svg viewBox="0 0 14 14" width="12" height="12" fill="none"><path d="M2 4h10M5 4V2h4v2M5 6v5M9 6v5M3 4l.5 8h7l.5-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg> },
          ].map(item => (
            <button key={item.label} onClick={e => { e.stopPropagation(); item.action?.() }} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '9px 14px',
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 13, color: item.danger ? '#F05A22' : 'var(--text-primary)',
              fontFamily: 'inherit', textAlign: 'left',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {item.icon}{item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
