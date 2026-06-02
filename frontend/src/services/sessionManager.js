const SESSION_EXPIRED_REASON = 'session_expired'
const AUTH_ENDPOINT_MATCH = /\/auth\/(login|register)\b/

export function clearAuthSession() {
  localStorage.removeItem('gympose_token')
  localStorage.removeItem('gympose_user')
}

export function redirectToLogin(reason = SESSION_EXPIRED_REASON) {
  if (typeof window === 'undefined') return

  clearAuthSession()

  const loginUrl = `/login?reason=${encodeURIComponent(reason)}`
  if (window.location.pathname === '/login') {
    window.history.replaceState(null, '', loginUrl)
    return
  }

  window.location.replace(loginUrl)
}

export function handleUnauthorized(error) {
  const status = error?.response?.status
  const url = error?.config?.url || ''

  if (status === 401 && !AUTH_ENDPOINT_MATCH.test(url)) {
    redirectToLogin()
  }

  return Promise.reject(error)
}
