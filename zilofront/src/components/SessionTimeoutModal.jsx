// Shows a non-blocking toast when XSUAA session expires.
// Detection: sessionGuard.js patches fetch and fires 'session-expired'.
// UX: small card bottom-right with countdown. Two actions:
//   - "Renovar sessão" → silent popup to refresh the token via approuter
//   - "Entrar novamente" → full page reload (safe fallback)

import { useEffect, useState, useRef } from 'react'

const COUNTDOWN = 180

export default function SessionTimeoutModal() {
  const [visible, setVisible] = useState(false)
  const [seconds, setSeconds] = useState(COUNTDOWN)
  const timerRef = useRef(null)

  useEffect(() => {
    function onExpired() {
      if (visible) return
      setVisible(true)
      setSeconds(COUNTDOWN)
    }
    window.addEventListener('session-expired', onExpired)
    return () => window.removeEventListener('session-expired', onExpired)
  }, [visible])

  useEffect(() => {
    if (!visible) return
    timerRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(timerRef.current)
          window.location.reload()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [visible])

  function handleRefresh() {
    clearInterval(timerRef.current)
    const popup = window.open('/userapi/currentUser', 'session-refresh', 'width=600,height=500,noopener')
    const poll = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(poll)
        setVisible(false)
      }
    }, 500)
  }

  function handleReload() {
    window.location.reload()
  }

  if (!visible) return null

  const pct = (seconds / COUNTDOWN) * 100
  const urgent = seconds <= 15

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      width: 320, background: '#fff', borderRadius: 14,
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      border: '1px solid var(--border)',
      padding: '18px 18px 14px',
      animation: 'fadeInUp 0.25s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
        {/* Countdown ring */}
        <div style={{ flexShrink: 0, position: 'relative', width: 40, height: 40 }}>
          <svg width="40" height="40" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="17" fill="none" stroke="var(--border)" strokeWidth="3" />
            <circle cx="20" cy="20" r="17" fill="none"
              stroke={urgent ? '#F05A22' : 'var(--joule)'}
              strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 17}`}
              strokeDashoffset={`${2 * Math.PI * 17 * (1 - pct / 100)}`}
              strokeLinecap="round"
              transform="rotate(-90 20 20)"
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
            />
          </svg>
          <span style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700,
            color: urgent ? '#F05A22' : 'var(--joule)',
          }}>
            {seconds}
          </span>
        </div>

        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            Sessão expirando
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Você será desconectado em{' '}
            {seconds >= 60
              ? `${Math.floor(seconds / 60)}m ${seconds % 60 > 0 ? `${seconds % 60}s` : ''}`
              : `${seconds}s`}.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleRefresh} className="btn-accent" style={{ flex: 1, justifyContent: 'center', padding: '8px 0' }}>
          Renovar sessão
        </button>
        <button onClick={handleReload} style={{
          padding: '8px 14px', borderRadius: 8,
          border: '1px solid var(--border)', background: '#fff',
          color: 'var(--text-muted)', fontSize: 13, fontWeight: 500,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Entrar novamente
        </button>
      </div>
    </div>
  )
}
