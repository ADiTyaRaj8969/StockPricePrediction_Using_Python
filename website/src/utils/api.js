const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({ error: 'Invalid server response' }))
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
  return json
}

export const predictStock = (symbol, start, end, predDays, futureDays) =>
  post('/api/predict', { symbol, start, end, prediction_days: predDays, future_days: futureDays })

export const generateReport = (symbol, start, end, predDays, futureDays) =>
  post('/api/report', { symbol, start, end, prediction_days: predDays, future_days: futureDays })
