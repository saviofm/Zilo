import { useState } from 'react'

function IconChat({ active }) {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
      <path d="M16 2H4C2.9 2 2 2.9 2 4v10c0 1.1.9 2 2 2h2v3l4-3h6c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"
        fill={active ? 'rgba(255,255,255,0.2)' : 'none'}
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M6 8h8M6 11h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function IconConsumption() {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
      <rect x="2" y="10" width="3" height="8" rx="1" fill="currentColor" opacity="0.7"/>
      <rect x="7" y="6" width="3" height="12" rx="1" fill="currentColor"/>
      <rect x="12" y="3" width="3" height="15" rx="1" fill="currentColor" opacity="0.7"/>
      <path d="M2 19h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function IconExpand({ flipped }) {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor"
      style={{ transform: flipped ? 'scaleX(-1)' : 'none', transition: 'transform 0.3s' }}>
      <path d="M16.5625 1.25C18.461 1.25 20 2.78902 20 4.6875V15.3125C20 17.211 18.461 18.75 16.5625 18.75C12.179 18.75 7.8143 18.75 3.4375 18.75C1.53902 18.75 0 17.211 0 15.3125V4.6875C2.21466e-07 2.78902 1.53902 1.25 3.4375 1.25H16.5625ZM6.875 16.875H16.5625C17.4254 16.875 18.125 16.1754 18.125 15.3125V4.6875C18.125 3.82456 17.4254 3.125 16.5625 3.125H6.875V16.875ZM3.4375 3.125C2.57456 3.125 1.875 3.82456 1.875 4.6875V15.3125C1.875 16.1754 2.57456 16.875 3.4375 16.875H5V3.125H3.4375Z"/>
    </svg>
  )
}

const NAV_ITEMS = [
  { id: 'chat',        label: 'Conversas', Icon: IconChat },
  { id: 'consumption', label: 'Consumo',   Icon: IconConsumption },
]

function Tooltip({ label }) {
  return (
    <div className="animate-tooltip" style={{
      position: 'absolute', left: '100%', top: '50%', transform: 'translateY(-50%)',
      marginLeft: 8, whiteSpace: 'nowrap',
      background: '#1a1a2e', color: '#fff',
      padding: '5px 10px', borderRadius: 6,
      fontSize: 12, fontWeight: 500,
      pointerEvents: 'none', zIndex: 200,
    }}>
      {label}
    </div>
  )
}

function NavItem({ item, active, collapsed, onSelect }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(item.id)}
    >
      <div style={{
        display: 'flex', alignItems: 'center',
        gap: collapsed ? 0 : 12,
        padding: '10px 12px',
        borderRadius: 8,
        cursor: 'pointer',
        color: active ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
        background: active ? 'var(--sidebar-active-bg)' : hovered ? 'var(--sidebar-hover-bg)' : 'transparent',
        transition: 'background 0.15s',
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <item.Icon active={active} />
        {!collapsed && (
          <span style={{ fontSize: 14, fontWeight: active ? 600 : 500 }}>{item.label}</span>
        )}
      </div>
      {collapsed && hovered && <Tooltip label={item.label} />}
    </div>
  )
}

function BudgetBar({ budgetStatus, collapsed }) {
  if (!budgetStatus) return null
  const used = budgetStatus.usedCU ?? 0
  const budget = budgetStatus.budgetCU ?? 0
  if (budget <= 0) return null
  const pct = Math.min(100, Math.round((used / budget) * 100))
  const color = pct >= 90 ? '#F05A22' : pct >= 70 ? '#f59e0b' : '#8CC63E'

  if (collapsed) {
    return (
      <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'center' }}>
        <div title={`Budget: ${pct}%`} style={{
          width: 28, height: 28, borderRadius: '50%',
          background: `conic-gradient(${color} ${pct}%, rgba(255,255,255,0.2) 0%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            background: 'var(--sidebar-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 7, fontWeight: 700, color,
          }}>
            {pct}%
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '8px 16px 4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
        <span>Budget mensal</span>
        <span style={{ color, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.4s' }} />
      </div>
    </div>
  )
}

export default function Sidebar({ activeItem, onSelect, user, budgetStatus }) {
  const [collapsed, setCollapsed] = useState(true)
  const W = collapsed ? 64 : 240

  return (
    <div className="sidebar-transition" style={{
      width: W, minWidth: W,
      background: 'var(--sidebar-bg)',
      display: 'flex', flexDirection: 'column',
      height: '100%', position: 'relative', zIndex: 10,
      overflow: 'visible',
    }}>
      {/* Logo */}
      <div style={{
        height: 64, display: 'flex', alignItems: 'center',
        padding: collapsed ? '0' : '0 14px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderBottom: '1px solid var(--sidebar-border)',
        flexShrink: 0,
      }}>
        {collapsed ? (
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'rgba(255,255,255,0.95)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 3, flexShrink: 0,
          }}>
            <img src="/logo_simples.png" alt="Zilo"
              style={{ width: 32, height: 32, objectFit: 'contain' }} />
          </div>
        ) : (
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: 10, padding: '6px 10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img src="/LOGO_COMPLETO.png" alt="Zilo"
              style={{ height: 42, objectFit: 'contain' }} />
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '12px 8px 0' }}>
        {NAV_ITEMS.map(item => (
          <NavItem key={item.id} item={item} active={activeItem === item.id}
            collapsed={collapsed} onSelect={onSelect} />
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      {/* Budget */}
      <BudgetBar budgetStatus={budgetStatus} collapsed={collapsed} />

      <div style={{ height: 1, background: 'var(--sidebar-border)', margin: '4px 12px' }} />

      {/* User + collapse */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '4px 8px 12px' }}>
        {/* User avatar */}
        <div style={{
          display: 'flex', alignItems: 'center',
          gap: collapsed ? 0 : 10,
          padding: '8px 12px', borderRadius: 8,
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: 'var(--avatar-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: 'var(--avatar-text)',
            border: '1.5px solid rgba(255,255,255,0.3)',
          }}>
            {user?.initials ?? '?'}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name ?? 'Usuário'}
              </div>
              {user?.email && (
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <div
          onClick={() => setCollapsed(c => !c)}
          style={{
            display: 'flex', alignItems: 'center',
            gap: collapsed ? 0 : 10, padding: '8px 12px', borderRadius: 8,
            cursor: 'pointer', color: 'rgba(255,255,255,0.6)',
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--sidebar-hover-bg)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <IconExpand flipped={!collapsed} />
          {!collapsed && <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>Recolher</span>}
        </div>
      </div>
    </div>
  )
}
