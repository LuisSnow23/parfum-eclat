const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

console.log('🔍 API Base URL:', BASE);

export const api = {
  get: (url) => fetch(BASE + url).then(r => r.json()),
  post: (url, body) => fetch(BASE + url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(r => r.json()),
  put: (url, body) => fetch(BASE + url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(r => r.json()),
  delete: (url) => fetch(BASE + url, {
    method: 'DELETE'
  }).then(r => r.json()),
}

export const fmt = (n) => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
}).format(n || 0)

export const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-MX', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
}) : '—'