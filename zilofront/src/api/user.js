// Fetches logged-in user info from the @sap/approuter user API.
// Returns { name, email, initials } or null when running locally without an approuter.
export async function fetchUser() {
  try {
    const res = await fetch('/userapi/currentUser', { credentials: 'include' })
    if (!res.ok) return null
    const data = await res.json()

    // approuter currentUser returns: { firstname, lastname, email, name }
    const given = data.firstname || ''
    const family = data.lastname || ''
    const displayName = `${given} ${family}`.trim() || data.email || null
    const initials = given && family
      ? `${given[0]}${family[0]}`.toUpperCase()
      : displayName
        ? displayName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
        : 'ZL'

    return { name: displayName, email: data.email || null, initials }
  } catch {
    return null
  }
}
