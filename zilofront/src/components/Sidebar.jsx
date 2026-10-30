import { useState } from 'react'

/* ── Icons ── */
function IconChat({ active }) {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
      <path
        d="M16 2H4C2.9 2 2 2.9 2 4v10c0 1.1.9 2 2 2h2v3l4-3h6c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"
        fill={active ? '#01502D' : 'none'}
        stroke={active ? '#01502D' : 'var(--text-muted)'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M6 8h8M6 11h5" stroke={active ? 'white' : 'var(--text-muted)'} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function IconConsumption({ active }) {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
      <rect x="2" y="10" width="3" height="8" rx="1" fill={active ? '#01502D' : 'var(--text-muted)'}/>
      <rect x="7" y="6" width="3" height="12" rx="1" fill={active ? '#8CC63E' : 'var(--text-disabled)'}/>
      <rect x="12" y="3" width="3" height="15" rx="1" fill={active ? '#01502D' : 'var(--text-muted)'}/>
      <path d="M2 19h16" stroke={active ? '#01502D' : 'var(--text-muted)'} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function IconExpand({ flipped }) {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor" style={{ transform: flipped ? 'scaleX(-1)' : 'none', transition: 'transform 0.3s' }}>
      <path d="M16.5625 1.25C18.461 1.25 20 2.78902 20 4.6875V15.3125C20 17.211 18.461 18.75 16.5625 18.75C12.179 18.75 7.8143 18.75 3.4375 18.75C1.53902 18.75 0 17.211 0 15.3125V4.6875C2.21466e-07 2.78902 1.53902 1.25 3.4375 1.25H16.5625ZM6.875 16.875H16.5625C17.4254 16.875 18.125 16.1754 18.125 15.3125V4.6875C18.125 3.82456 17.4254 3.125 16.5625 3.125H6.875V16.875ZM3.4375 3.125C2.57456 3.125 1.875 3.82456 1.875 4.6875V15.3125C1.875 16.1754 2.57456 16.875 3.4375 16.875H5V3.125H3.4375Z"/>
    </svg>
  )
}

/* ── Nav items config ── */
const NAV_ITEMS = [
  { id: 'chat',        label: 'Conversas',  Icon: IconChat },
  { id: 'consumption', label: 'Consumo',    Icon: IconConsumption },
]

/* ── Floating tooltip for collapsed mode ── */
function FloatingTooltip({ label, icon: Icon, active }) {
  return (
    <div
      className="animate-tooltip"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        minWidth: 180,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 12px',
        background: 'var(--joule-bg)',
        borderRadius: 8,
        pointerEvents: 'none',
        zIndex: 100,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ color: 'var(--joule)', flexShrink: 0 }}>
        <Icon active={true} />
      </span>
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--joule)' }}>
        {label}
      </span>
    </div>
  )
}

/* ── Single nav item (collapsed mode) ── */
function NavItemCollapsed({ item, active, onSelect }) {
  const [hovered, setHovered] = useState(false)
  const { Icon, label, id } = item

  return (
    <div
      style={{ position: 'relative', cursor: 'pointer' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(id)}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px 12px',
          borderRadius: 8,
          background: active ? 'var(--joule-bg)' : 'transparent',
          transition: 'background 0.15s',
        }}
      >
        <Icon active={active} />
      </div>
      {hovered && (
        <FloatingTooltip label={label} icon={Icon} active={active} />
      )}
    </div>
  )
}

/* ── Single nav item (expanded mode) ── */
function NavItemExpanded({ item, active, onSelect }) {
  const [hovered, setHovered] = useState(false)
  const { Icon, label, id } = item

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        borderRadius: 8,
        background: active ? 'var(--joule-bg)' : hovered ? '#f0f2f4' : 'transparent',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(id)}
    >
      <span style={{ flexShrink: 0 }}>
        <Icon active={active} />
      </span>
      <span style={{ fontSize: 14, fontWeight: 500, color: active ? 'var(--joule)' : 'var(--text-primary)', flex: 1 }}>
        {label}
      </span>
    </div>
  )
}

/* ── Budget indicator bar ── */
function BudgetBar({ budgetStatus, collapsed }) {
  if (!budgetStatus) return null

  const used = budgetStatus.usedCU ?? 0
  const budget = budgetStatus.budgetCU ?? 0
  if (budget <= 0) return null

  const pct = Math.min(100, Math.round((used / budget) * 100))
  const color = pct >= 90 ? '#F05A22' : pct >= 70 ? '#f59e0b' : '#01502D'

  if (collapsed) {
    return (
      <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: `conic-gradient(${color} ${pct}%, var(--border) 0%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 8, fontWeight: 700, color,
        }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--bg-shell)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {pct}%
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '8px 12px 4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
        <span>Budget mensal</span>
        <span style={{ color, fontWeight: 600 }}>{pct}%</span>
      </div>
      <div style={{ height: 4, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  )
}

/* ── Bottom item tooltip (collapsed) ── */
function BottomItemCollapsed({ label, children, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      style={{ position: 'relative', cursor: onClick ? 'pointer' : 'default' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 12px', borderRadius: 8, color: 'var(--text-muted)' }}>
        {children}
      </div>
      {hovered && label && (
        <div
          className="animate-tooltip"
          style={{
            position: 'absolute',
            left: 0, top: 0, bottom: 0,
            minWidth: 180,
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '0 12px',
            background: 'var(--joule-bg)',
            borderRadius: 8,
            pointerEvents: 'none',
            zIndex: 100,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ color: 'var(--joule)', flexShrink: 0 }}>{children}</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--joule)' }}>{label}</span>
        </div>
      )}
    </div>
  )
}

/* ── Zilor logo text ── */
function ZilorLogo({ showText }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* Z icon mark */}
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: '#01502D',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <svg viewBox="0 0 20 20" width="18" height="18" fill="white">
          <path d="M3 4h14v2L7 16h10v2H3v-2l10-10H3z"/>
        </svg>
      </div>
      {showText && (
        <span style={{ fontSize: 18, fontWeight: 700, color: '#01502D', letterSpacing: '-0.3px' }}>
          Zilo
        </span>
      )}
    </div>
  )
}

/* ── Main Sidebar ── */
export default function Sidebar({ activeItem, onSelect, user, budgetStatus }) {
  const [collapsed, setCollapsed] = useState(true)
  const W = collapsed ? 68 : 260

  return (
    <div
      className="sidebar-transition"
      style={{
        width: W,
        minWidth: W,
        background: 'var(--bg-shell)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'visible',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Logo */}
      <div style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        padding: collapsed ? '0' : '0 20px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <ZilorLogo showText={!collapsed} />
      </div>

      {/* Nav items */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '12px 8px 0' }}>
        {NAV_ITEMS.map(item =>
          collapsed ? (
            <NavItemCollapsed key={item.id} item={item} active={activeItem === item.id} onSelect={onSelect} />
          ) : (
            <NavItemExpanded key={item.id} item={item} active={activeItem === item.id} onSelect={onSelect} />
          )
        )}
      </nav>

      <div style={{ flex: 1 }} />

      {/* Budget indicator */}
      <BudgetBar budgetStatus={budgetStatus} collapsed={collapsed} />

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border)', margin: '4px 12px' }} />

      {/* Bottom section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 8px 16px' }}>
        {collapsed ? (
          <>
            {/* User avatar */}
            <BottomItemCollapsed label={user?.name ?? 'Usuário'}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--avatar-bg)', color: 'var(--joule)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
              }}>
                {user?.initials ?? 'ZL'}
              </div>
            </BottomItemCollapsed>

            {/* Expand button */}
            <BottomItemCollapsed label="Expandir" onClick={() => setCollapsed(false)}>
              <IconExpand flipped={true} />
            </BottomItemCollapsed>
          </>
        ) : (
          <>
            {/* User row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--avatar-bg)', color: 'var(--joule)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>
                {user?.initials ?? 'ZL'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.name ?? 'Usuário Zilor'}
                </div>
                {user?.email && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.email}
                  </div>
                )}
              </div>
            </div>

            {/* Collapse button */}
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', color: 'var(--text-muted)' }}
              onClick={() => setCollapsed(true)}
            >
              <IconExpand flipped={false} />
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Recolher</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
