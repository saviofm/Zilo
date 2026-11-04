import { useState, useCallback, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import SessionExpiredScreen from './components/SessionExpiredScreen'
import SessionTimeoutModal  from './components/SessionTimeoutModal'
import InsightsPanel from './components/InsightsPanel'
import OverviewRoute   from './routes/OverviewRoute'
import ByMonthRoute    from './routes/ByMonthRoute'
import ByModelRoute    from './routes/ByModelRoute'
import ByPersonaRoute  from './routes/ByPersonaRoute'
import ByJobRoleRoute  from './routes/ByJobRoleRoute'
import DrilldownRoute  from './routes/DrilldownRoute'
import SimulatorRoute         from './routes/SimulatorRoute'
import SimuladorAvancadoRoute from './routes/SimuladorAvancadoRoute'

export default function App() {
  const [active, setActive]           = useState('overview')
  const [insightsOpen, setInsightsOpen] = useState(false)
  const [insightsCtx, setInsightsCtx] = useState(null)
  const [sessionExpired, setSessionExpired] = useState(false)

  useEffect(() => {
    const handler = () => setSessionExpired(true)
    window.addEventListener('session-expired', handler)
    return () => window.removeEventListener('session-expired', handler)
  }, [])

  const handleInsightsContext = useCallback(({ label, data }) => {
    setInsightsCtx({ label, data })
  }, [])

  const routeProps = { onInsightsContext: handleInsightsContext }

  const routes = {
    overview:   <OverviewRoute  {...routeProps} />,
    byMonth:    <ByMonthRoute   {...routeProps} />,
    byModel:    <ByModelRoute   {...routeProps} />,
    byPersona:  <ByPersonaRoute {...routeProps} />,
    byJobRole:  <ByJobRoleRoute {...routeProps} />,
    drilldown:  <DrilldownRoute {...routeProps} />,
    simulator:          <SimulatorRoute />,
    simuladorAvancado:  <SimuladorAvancadoRoute />,
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg-page)' }}>
      <Sidebar active={active} onSelect={setActive} />

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
        {routes[active] ?? routes.overview}
      </div>

      {/* Insights FAB */}
      <button
        onClick={() => setInsightsOpen(o => !o)}
        title="Agente de Insights"
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 200,
          width: 52, height: 52, borderRadius: '50%',
          background: insightsOpen ? 'var(--joule)' : 'var(--accent)',
          border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          color: '#fff', fontSize: 22, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s, transform 0.15s',
          transform: insightsOpen ? 'rotate(45deg)' : 'none',
        }}
        onMouseEnter={e => !insightsOpen && (e.currentTarget.style.background = 'var(--accent-hover)')}
        onMouseLeave={e => !insightsOpen && (e.currentTarget.style.background = 'var(--accent)')}
      >
        {insightsOpen ? '×' : '💡'}
      </button>

      {/* Session */}
      <SessionTimeoutModal />
      {sessionExpired && <SessionExpiredScreen />}

      {/* Insights panel */}
      <InsightsPanel
        open={insightsOpen}
        onClose={() => setInsightsOpen(false)}
        contextData={insightsCtx?.data}
        contextLabel={insightsCtx?.label}
      />
    </div>
  )
}
