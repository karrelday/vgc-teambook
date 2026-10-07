const BASE = '/api/teams'

async function request(url, options = {}) {
  let res
  try {
    res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options })
  } catch {
    throw new Error('Cannot reach the server. Is the API running?')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed (${res.status})`)
  }
  return res.status === 204 ? null : res.json()
}

export const api = {
  list: () => request(BASE),
  get: id => request(`${BASE}/${id}`),
  create: data => request(BASE, { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: id => request(`${BASE}/${id}`, { method: 'DELETE' }),
  duplicate: id => request(`${BASE}/${id}/duplicate`, { method: 'POST' }),
}
