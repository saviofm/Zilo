// Patches global fetch to detect XSUAA session expiry.
// Fires 'session-expired' once when any /api/ call returns 401/403 or HTML.

let _fired = false

export function installSessionGuard() {
  const _fetch = window.fetch.bind(window)

  window.fetch = async function guardedFetch(input, init) {
    const response = await _fetch(input, init)

    const url = typeof input === 'string' ? input : input?.url ?? ''
    if (!url.startsWith('/api/') && !url.startsWith('/userapi/')) return response

    const ct = response.headers.get('content-type') || ''

    if (response.status === 401 || response.status === 403 || ct.includes('text/html')) {
      fireExpired()
    }

    return response
  }
}

function fireExpired() {
  if (_fired) return
  _fired = true
  window.dispatchEvent(new Event('session-expired'))
}
