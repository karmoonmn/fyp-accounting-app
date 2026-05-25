const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

function parseJsonSafe(text) {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

let currentCompanyId = null
export function setGlobalCompanyId(id) {
  currentCompanyId = id
}

/**
 * @param {string} path
 * @param {{ method?: string, body?: object, token?: string | null, companyId?: string | number | null }} [opts]
 */
export async function api(path, opts = {}) {
  const { method = 'GET', body, token, companyId } = opts
  const headers = { Accept: 'application/json' }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  const finalCompanyId = companyId || currentCompanyId
  if (finalCompanyId) {
    headers['X-Company-Id'] = String(finalCompanyId)
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  const data = parseJsonSafe(text)
  if (!res.ok) {
    const msg =
      (data && (data.message || data.error)) || `Request failed (${res.status})`
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }
  return data
}
