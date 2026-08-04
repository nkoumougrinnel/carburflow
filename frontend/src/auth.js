const TOKEN_KEY = 'carburflow_token'
const USER_KEY = 'carburflow_user'

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function persistAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

function extractErrorMessage(data) {
  if (!data) return null
  if (typeof data.detail === 'string') return data.detail
  if (Array.isArray(data.errors) && data.errors.length) {
    const n = data.errors.length
    return n === 1
      ? 'Il y a 1 point à corriger dans votre fichier.'
      : `Il y a ${n} points à corriger dans votre fichier.`
  }
  if (Array.isArray(data.non_field_errors) && data.non_field_errors[0]) {
    return data.non_field_errors[0]
  }
  const firstField = Object.keys(data).find((key) => Array.isArray(data[key]) && data[key][0])
  if (firstField) return `${firstField}: ${data[firstField][0]}`
  return null
}

/**
 * En local Vite : chemins relatifs `/api/...` (proxy Vite).
 * En Docker (nginx) : mêmes chemins relatifs — nginx proxy `/api` → backend.
 * Optionnel : VITE_API_BASE_URL absolu (ex. autre hôte API).
 */
export function resolveApiUrl(path) {
  if (!path || /^https?:\/\//i.test(path)) return path
  const base = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  if (!base) return path

  const [pathname, query = ''] = path.split('?')
  let suffix = pathname || '/'
  if (base.endsWith('/api/v1') && suffix.startsWith('/api/v1')) {
    suffix = suffix.slice('/api/v1'.length) || '/'
  }
  if (!suffix.startsWith('/')) suffix = `/${suffix}`
  return `${base}${suffix}${query ? `?${query}` : ''}`
}

export async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json'
  }

  // Plan free ngrok : sans ce header, /api peut renvoyer la page HTML d’avertissement
  // (ERR_NGROK_6024) au lieu du JSON → login / dashboard cassés.
  if (typeof window !== 'undefined' && /\.ngrok(-free)?\.(app|dev|io)$/i.test(window.location.hostname)) {
    headers['ngrok-skip-browser-warning'] = '1'
  }

  const token = getStoredToken()
  if (token) {
    headers.Authorization = `Token ${token}`
  }

  const url = resolveApiUrl(path)
  let response
  try {
    response = await fetch(url, { ...options, headers })
  } catch {
    throw new Error(
      'Impossible de joindre le serveur pour le moment. Réessayez dans un instant.',
    )
  }

  // Proxy Vite down / backend down → souvent HTML ou corps vide (pas du JSON)
  const contentType = response.headers.get('content-type') || ''
  if (response.status === 502 || response.status === 503 || response.status === 504) {
    throw new Error(
      'Le service est temporairement indisponible. Réessayez dans un instant.',
    )
  }

  if (options.raw || contentType.includes('application/octet-stream') || contentType.includes('spreadsheet') || contentType.includes('text/csv')) {
    if (!response.ok) {
      const text = await response.text()
      let data = null
      try { data = JSON.parse(text) } catch { data = { detail: text } }
      const error = new Error(extractErrorMessage(data) || 'Erreur réseau')
      error.status = response.status
      throw error
    }
    return response
  }

  let data = null
  const text = await response.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      // Réponse non-JSON (HTML SPA `serve -s`, proxy Vite down, page d’erreur…)
      const looksLikeHtml = /^\s*</.test(text) || text.includes('<!DOCTYPE')
      if (!response.ok || looksLikeHtml || text.includes('ECONNREFUSED') || text.includes('proxy error')) {
        throw new Error(
          'Le service est temporairement indisponible. Réessayez dans un instant.',
        )
      }
      data = { detail: text }
    }
  }

  if (!response.ok) {
    const error = new Error(
      extractErrorMessage(data)
        || (response.status >= 500
          ? 'Le serveur ne répond pas pour le moment. Réessayez dans un instant.'
          : 'Une erreur est survenue.'),
    )
    error.status = response.status
    error.data = data
    error.errors = Array.isArray(data?.errors) ? data.errors : []
    throw error
  }
  return data
}

/** fetch() avec Authorization Token — pour les pages dashboard existantes */
export function authFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  const token = getStoredToken()
  if (token) headers.Authorization = `Token ${token}`
  return fetch(resolveApiUrl(path), { ...options, headers })
}

export async function loginRequest(username, password) {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export async function registerRequest(payload) {
  return apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function meRequest() {
  return apiFetch('/api/auth/me')
}

export async function updateProfileRequest(payload) {
  return apiFetch('/api/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function changePasswordRequest(payload) {
  return apiFetch('/api/auth/password', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function logoutRequest() {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' })
  } catch {
    // ignore
  } finally {
    clearAuth()
  }
}

export async function publicSitesRequest() {
  return apiFetch('/api/auth/sites')
}

async function triggerBlobDownload(response, filename) {
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function downloadNorme(format = 'xlsx') {
  const response = await apiFetch(`/api/rapports/norme.${format}`, { raw: true })
  await triggerBlobDownload(response, `carburflow_norme_rapport.${format}`)
}

export async function downloadFicheHebdo(dateDebut, dateFin) {
  let url = '/api/rapports/generer.xlsx'
  const params = new URLSearchParams()
  if (dateDebut) params.append('date_debut', dateDebut)
  if (dateFin) params.append('date_fin', dateFin)
  const query = params.toString()
  if (query) url += `?${query}`
  const response = await apiFetch(url, { raw: true })
  await triggerBlobDownload(response, 'carburflow_fiche_hebdo.xlsx')
}

export async function downloadRapport(rapportId, format = 'xlsx') {
  const response = await apiFetch(
    `/api/rapports/${rapportId}/export.${format}`,
    { raw: true },
  )
  await triggerBlobDownload(response, `carburflow_rapport_${rapportId}.${format}`)
}

export async function uploadRapport(file) {
  const form = new FormData()
  form.append('file', file)
  return apiFetch('/api/rapports/upload', { method: 'POST', body: form })
}

export async function listSoumissions() {
  return apiFetch('/api/rapports/soumissions')
}

export async function listMesRapports(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') query.set(key, String(value))
  })
  const qs = query.toString()
  return apiFetch(`/api/rapports/mes${qs ? `?${qs}` : ''}`)
}

export async function normeMeta() {
  return apiFetch('/api/rapports/norme')
}

export async function listAlertes(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') query.set(key, String(value))
  })
  const qs = query.toString()
  return apiFetch(qs ? `/api/alertes/?${qs}` : '/api/alertes/')
}

export async function listAlertTreatments() {
  return apiFetch('/api/alertes/traitements')
}

export async function treatAlert(payload) {
  return apiFetch('/api/alertes/traiter', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function listStaffUsers() {
  return apiFetch('/api/auth/users/staff')
}

export async function searchUsersByEmail(email) {
  const query = new URLSearchParams({ email: String(email || '').trim() })
  return apiFetch(`/api/auth/users/search?${query.toString()}`)
}

export async function setUserRole({ email, role }) {
  return apiFetch('/api/auth/users/set-role', {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  })
}

export async function listNotifications(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') query.set(key, String(value))
  })
  const qs = query.toString()
  return apiFetch(`/api/notifications/${qs ? `?${qs}` : ''}`)
}

export async function notificationsUnreadCount() {
  return apiFetch('/api/notifications/unread-count')
}

export async function markNotificationRead(id) {
  return apiFetch(`/api/notifications/${id}/read`, { method: 'POST' })
}

export async function listMessagingAdmins() {
  return apiFetch('/api/notifications/admins')
}

export async function sendNotificationMessage(payload) {
  return apiFetch('/api/notifications/send', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
