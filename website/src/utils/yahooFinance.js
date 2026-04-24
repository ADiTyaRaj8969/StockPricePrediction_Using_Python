// Yahoo Finance API — browser-side, no backend required
// Falls back to a CORS proxy if direct fetch is blocked.

const YF = 'https://query1.finance.yahoo.com'
const PROXY = 'https://corsproxy.io/?'

async function yFetch(url) {
  // 1. Try direct (often works in modern browsers)
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' } })
    if (r.ok) return r.json()
  } catch (_) { /* fall through */ }

  // 2. CORS proxy fallback
  const r = await fetch(PROXY + encodeURIComponent(url), {
    headers: { Accept: 'application/json' },
  })
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`)
  return r.json()
}

// ── Historical OHLCV ──────────────────────────────────────────────────────────
export async function fetchHistory(symbol, startDate, endDate) {
  const p1 = Math.floor(new Date(startDate).getTime() / 1000)
  const p2 = Math.floor(new Date(endDate).getTime() / 1000)
  const url = `${YF}/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${p1}&period2=${p2}&interval=1d&events=history`

  const json = await yFetch(url)
  const res  = json?.chart?.result?.[0]
  if (!res) throw new Error(`No data found for "${symbol}". Check the ticker symbol.`)

  const ts    = res.timestamp
  const q     = res.indicators.quote[0]
  const rows  = []

  for (let i = 0; i < ts.length; i++) {
    if (q.close[i] == null) continue
    rows.push({
      date:   new Date(ts[i] * 1000).toISOString().split('T')[0],
      open:   q.open[i]   != null ? +q.open[i].toFixed(2)   : null,
      high:   q.high[i]   != null ? +q.high[i].toFixed(2)   : null,
      low:    q.low[i]    != null ? +q.low[i].toFixed(2)    : null,
      close:  +q.close[i].toFixed(2),
      volume: q.volume[i] ?? null,
    })
  }

  if (rows.length === 0) throw new Error(`No trading data for "${symbol}" in the selected range.`)

  // Map ISO currency code → display symbol
  const CURR_MAP = { INR:'₹', USD:'$', EUR:'€', GBP:'£', JPY:'¥', CAD:'CA$', AUD:'A$', HKD:'HK$', KRW:'₩', BRL:'R$', CNY:'¥' }
  const isoCode  = res.meta?.currency ?? 'USD'
  const currencySymbol = CURR_MAP[isoCode] ?? isoCode

  return { rows, currencySymbol }
}

// ── Real-time quotes (ticker bar) ─────────────────────────────────────────────
export async function fetchQuotes(symbols) {
  const url = `${YF}/v7/finance/quote?symbols=${symbols.join(',')}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent`
  const json = await yFetch(url)
  const results = json?.quoteResponse?.result ?? []

  return results
    .filter(q => q.regularMarketPrice != null)
    .map(q => ({
      symbol:  q.symbol,
      price:   +q.regularMarketPrice.toFixed(2),
      change:  +(q.regularMarketChangePercent ?? 0).toFixed(2),
      up:      (q.regularMarketChange ?? 0) >= 0,
    }))
}
