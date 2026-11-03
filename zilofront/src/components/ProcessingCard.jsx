// Displays processing steps during AI tool-use loop.
// Each step animates in sequentially with a checkmark when done.
import { useEffect, useState } from 'react'
import { ChevronUp } from 'lucide-react'

const STEP_DELAY = 600

export default function ProcessingCard({ steps = [], streaming = false }) {
  const [visibleSteps, setVisibleSteps] = useState([])
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const newSteps = steps.slice(visibleSteps.length)
    newSteps.forEach((step, i) => {
      setTimeout(() => {
        setVisibleSteps(prev => [...prev, step])
      }, i * STEP_DELAY + 150)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.length])

  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border)',
      borderRadius: 12, maxWidth: 520, overflow: 'hidden',
      boxShadow: 'var(--shadow-card)', marginBottom: 16,
    }}>
      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--border)', position: 'relative' }}>
        <div className="animate-progress" style={{
          position: 'absolute', top: 0, left: 0, height: '100%',
          background: 'var(--progress-grad)', borderRadius: 99,
        }} />
      </div>

      {!collapsed && (
        <div style={{ padding: '14px 18px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visibleSteps.length === 0 && streaming && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Iniciando processamento…</div>
          )}
          {visibleSteps.map((step, i) => (
            <div key={i} className="animate-fade-in-up" style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 13, color: 'var(--text-primary)',
              animationDelay: `${i * 0.04}s`,
            }}>
              <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 14, lineHeight: 1 }}>✓</span>
              <span>{step}</span>
            </div>
          ))}
          {streaming && (
            <div className="animate-fade-in-up" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
              <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
                {[0,1,2].map(i => <span key={i} className="streaming-dot" style={{ animationDelay: `${i*160}ms` }} />)}
              </span>
              <span>Gerando resposta…</span>
            </div>
          )}
        </div>
      )}

      {visibleSteps.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0 8px' }}>
          <button onClick={() => setCollapsed(c => !c)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 26, height: 26, background: '#fff',
            border: '1px solid var(--border)', borderRadius: 8,
            cursor: 'pointer', color: 'var(--text-muted)',
          }}>
            <ChevronUp size={14} style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
        </div>
      )}
    </div>
  )
}
