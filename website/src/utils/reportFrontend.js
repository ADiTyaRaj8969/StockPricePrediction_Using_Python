import { jsPDF } from 'jspdf'

// ── Color helpers ────────────────────────────────────────────────────────────
const BG    = [8, 8, 8]
const CARD  = [15, 14, 6]
const CARD2 = [24, 23, 0]
const GOLD  = [212, 175, 55]
const GOLD2 = [255, 215, 0]
const MUTED = [122, 119, 96]
const LIGHT = [240, 238, 213]
const CREAM = [192, 188, 160]
const BORDER= [42, 40, 0]
const GREEN = [74, 222, 128]
const RED   = [248, 113, 113]

function bg(doc)     { doc.setFillColor(...BG) }
function gold(doc)   { doc.setTextColor(...GOLD) }
function muted(doc)  { doc.setTextColor(...MUTED) }
function light(doc)  { doc.setTextColor(...LIGHT) }
function cream(doc)  { doc.setTextColor(...CREAM) }

function sectionHeader(doc, label, y) {
  doc.setFillColor(...CARD2)
  doc.rect(20, y, 170, 8, 'F')
  doc.setFillColor(...GOLD)
  doc.rect(20, y, 3, 8, 'F')
  gold(doc)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.text(label, 26, y + 5.5)
  return y + 13
}

function rule(doc, y) {
  doc.setDrawColor(...BORDER)
  doc.line(20, y, 190, y)
}

// ── Page background fill (call on every new page) ────────────────────────────
function fillPage(doc) {
  doc.setFillColor(...BG)
  doc.rect(0, 0, 210, 297, 'F')
}

// ── Header ───────────────────────────────────────────────────────────────────
function addHeader(doc, symbol, startDate, endDate) {
  fillPage(doc)

  // Top gold bar
  doc.setFillColor(...GOLD)
  doc.rect(0, 0, 210, 1.5, 'F')

  // Dark header block
  doc.setFillColor(...CARD)
  doc.rect(0, 1.5, 210, 42, 'F')

  // Title
  gold(doc)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('StockPredict ML', 20, 17)

  // Subtitle
  doc.setTextColor(...CREAM)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`${symbol}  —  Stock Analysis Report`, 20, 27)

  muted(doc)
  doc.setFontSize(8)
  doc.text(`Period: ${startDate}  to  ${endDate}`, 20, 35)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 190, 35, { align: 'right' })

  // Bottom gold accent
  doc.setFillColor(...GOLD)
  doc.rect(0, 43.5, 210, 1.5, 'F')
}

// ── Signal badge ─────────────────────────────────────────────────────────────
function addSignal(doc, metrics, y, currencySymbol = '$') {
  const bull = metrics.predictedNext >= metrics.currentPrice
  const col  = bull ? GREEN : RED

  doc.setFillColor(...col)
  doc.roundedRect(20, y, 45, 12, 2, 2, 'F')
  doc.setTextColor(...BG)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(`Signal: ${bull ? 'BULLISH' : 'BEARISH'}`, 42.5, y + 8, { align: 'center' })

  // % change badge
  const pct = ((metrics.predictedNext - metrics.currentPrice) / metrics.currentPrice * 100).toFixed(2)
  doc.setFillColor(...CARD2)
  doc.roundedRect(70, y, 50, 12, 2, 2, 'F')
  doc.setDrawColor(...BORDER)
  doc.roundedRect(70, y, 50, 12, 2, 2, 'S')
  gold(doc)
  doc.setFontSize(8.5)
  doc.text(`Next day: ${pct >= 0 ? '+' : ''}${pct}%`, 95, y + 8, { align: 'center' })

  return y + 18
}

// ── Metrics grid (2 rows × 4 cols) ───────────────────────────────────────────
function addMetrics(doc, metrics, y, currencySymbol = '$') {
  y = sectionHeader(doc, 'KEY METRICS', y)

  const cards = [
    { label: 'Current Price',   value: `${currencySymbol}${(metrics.currentPrice ?? 0).toFixed(2)}` },
    { label: 'Predicted Next',  value: `${currencySymbol}${(metrics.predictedNext ?? 0).toFixed(2)}` },
    { label: 'RMSE',            value: `${currencySymbol}${(metrics.rmse ?? 0).toFixed(2)}` },
    { label: 'Accuracy',        value: `${(metrics.accuracy ?? 0).toFixed(1)}%` },
    { label: 'Period Change',   value: `${metrics.pctChange >= 0 ? '+' : ''}${(metrics.pctChange ?? 0).toFixed(2)}%` },
    { label: 'Price Change',    value: `${currencySymbol}${(metrics.priceChange ?? 0).toFixed(2)}` },
    { label: 'Train Days',      value: `${metrics.trainSize ?? '—'}` },
    { label: 'Test Days',       value: `${metrics.testSize ?? '—'}` },
  ]

  const cols = 4, colW = 42, rowH = 17, startX = 20
  cards.forEach(({ label, value }, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = startX + col * colW
    const ry = y + row * rowH

    doc.setFillColor(...CARD)
    doc.rect(x, ry, colW - 2, rowH - 2, 'F')
    doc.setDrawColor(...BORDER)
    doc.rect(x, ry, colW - 2, rowH - 2, 'S')

    muted(doc)
    doc.setFontSize(6)
    doc.setFont('helvetica', 'normal')
    doc.text(label.toUpperCase(), x + 3, ry + 5)

    gold(doc)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(value, x + 3, ry + 12.5)
  })

  return y + Math.ceil(cards.length / cols) * rowH + 6
}

// ── Analysis ─────────────────────────────────────────────────────────────────
function addAnalysis(doc, symbol, metrics, y, currencySymbol = '$') {
  if (y > 235) { doc.addPage(); fillPage(doc); y = 20 }
  y = sectionHeader(doc, 'ANALYSIS & INSIGHTS', y)

  y = addSignal(doc, metrics, y, currencySymbol)

  const origin = (metrics.currentPrice - (metrics.priceChange ?? 0)).toFixed(2)
  const bull = metrics.predictedNext >= metrics.currentPrice

  const insights = [
    {
      heading: 'Price Trend',
      body: `${symbol} ${(metrics.pctChange ?? 0) >= 0 ? 'gained' : 'lost'} ${Math.abs(metrics.pctChange ?? 0).toFixed(2)}% over the selected period, moving from ${currencySymbol}${origin} to ${currencySymbol}${(metrics.currentPrice ?? 0).toFixed(2)}. ${(metrics.pctChange ?? 0) >= 0 ? 'Sustained upward momentum reflects positive market sentiment.' : 'Downward pressure suggests caution in the near term.'}`,
    },
    {
      heading: 'ML Forecast',
      body: `The ensemble model predicts the next trading day at ${currencySymbol}${(metrics.predictedNext ?? 0).toFixed(2)} — a ${bull ? 'bullish' : 'bearish'} signal. The prediction is derived from a weighted k-NN ensemble trained on ${metrics.trainSize} days of sliding-window features including returns, volatility, and momentum.`,
    },
    {
      heading: 'Model Performance',
      body: `Root Mean Squared Error (RMSE): ${currencySymbol}${(metrics.rmse ?? 0).toFixed(2)} on ${metrics.testSize} held-out test days. Estimated accuracy: ${(metrics.accuracy ?? 0).toFixed(1)}%. RMSE below 2% of the current price indicates strong predictive fit. The model uses an 80/20 train-test split.`,
    },
    {
      heading: 'Moving Averages',
      body: 'SMA 20 captures short-term momentum and reacts quickly to recent price changes. SMA 100 reflects the long-term structural trend. A Golden Cross (SMA 20 crossing above SMA 100) signals potential bullish momentum; a Death Cross signals bearish pressure.',
    },
    {
      heading: 'RSI Interpretation',
      body: 'The RSI (14-period) oscillates between 0–100. Readings above 70 indicate overbought conditions with potential for a pullback. Readings below 30 signal oversold conditions and possible mean-reversion bounce. Mid-range (40–60) suggests neutral momentum.',
    },
    {
      heading: 'Risk Disclaimer',
      body: 'This analysis is generated for educational purposes only and does not constitute financial advice. Past performance does not guarantee future results. Always consult a qualified financial advisor before making investment decisions.',
      italic: true,
    },
  ]

  insights.forEach(({ heading, body, italic }) => {
    if (y > 265) { doc.addPage(); fillPage(doc); y = 20 }

    gold(doc)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(heading, 22, y)
    y += 5

    light(doc)
    doc.setFontSize(8)
    doc.setFont('helvetica', italic ? 'italic' : 'normal')
    const lines = doc.splitTextToSize(body, 163)
    doc.text(lines, 22, y)
    y += lines.length * 4.5 + 5
  })

  return y + 4
}

// ── Forecast table ───────────────────────────────────────────────────────────
function addForecastTable(doc, future, currentPrice, y, currencySymbol = '$') {
  if (y > 220) { doc.addPage(); fillPage(doc); y = 20 }
  y = sectionHeader(doc, 'FORECAST TABLE', y)

  // Table header
  doc.setFillColor(...CARD2)
  doc.rect(20, y, 170, 9, 'F')
  gold(doc)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Day',           28,  y + 6)
  doc.text('Date',          65,  y + 6)
  doc.text('Predicted Price', 120, y + 6)
  doc.text('Change from Current', 160, y + 6)
  y += 9

  future.forEach((f, i) => {
    if (y > 270) { doc.addPage(); fillPage(doc); y = 20 }
    const even = i % 2 === 0
    doc.setFillColor(...(even ? CARD : [12, 11, 4]))
    doc.rect(20, y, 170, 8, 'F')

    cream(doc)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(`Day ${i + 1}`, 28, y + 5.5)
    doc.text(f.date ?? '—',  65, y + 5.5)

    gold(doc)
    doc.setFont('helvetica', 'bold')
    doc.text(`${currencySymbol}${(f.predicted ?? 0).toFixed(2)}`, 120, y + 5.5)

    const chg = currentPrice ? ((f.predicted - currentPrice) / currentPrice * 100) : 0
    const up  = chg >= 0
    doc.setTextColor(...(up ? GREEN : RED))
    doc.setFont('helvetica', 'normal')
    doc.text(`${up ? '+' : ''}${chg.toFixed(2)}%`, 160, y + 5.5)
    y += 8
  })

  return y + 8
}

// ── Historical data table (last 30 rows) ─────────────────────────────────────
function addHistoricalTable(doc, historical, y, currencySymbol = '$') {
  if (y > 220) { doc.addPage(); fillPage(doc); y = 20 }
  y = sectionHeader(doc, `RECENT PRICE HISTORY (last ${Math.min(30, historical.length)} trading days)`, y)

  // Header
  doc.setFillColor(...CARD2)
  doc.rect(20, y, 170, 9, 'F')
  gold(doc)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Date',   28, y + 6)
  doc.text('Open',   68, y + 6)
  doc.text('High',   98, y + 6)
  doc.text('Low',   123, y + 6)
  doc.text('Close', 148, y + 6)
  doc.text('Volume', 168, y + 6)
  y += 9

  const rows = historical.slice(-30)
  rows.forEach((r, i) => {
    if (y > 270) { doc.addPage(); fillPage(doc); y = 20 }
    doc.setFillColor(...(i % 2 === 0 ? CARD : [12, 11, 4]))
    doc.rect(20, y, 170, 7.5, 'F')

    cream(doc)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.text(r.date ?? '—',                       28, y + 5)
    doc.text(r.open  != null ? `${currencySymbol}${r.open.toFixed(2)}`  : '—', 68,  y + 5)
    doc.text(r.high  != null ? `${currencySymbol}${r.high.toFixed(2)}`  : '—', 98,  y + 5)
    doc.text(r.low   != null ? `${currencySymbol}${r.low.toFixed(2)}`   : '—', 123, y + 5)

    gold(doc)
    doc.setFont('helvetica', 'bold')
    doc.text(r.close != null ? `${currencySymbol}${r.close.toFixed(2)}` : '—', 148, y + 5)

    muted(doc)
    doc.setFont('helvetica', 'normal')
    doc.text(r.volume != null ? `${(r.volume / 1e6).toFixed(1)}M` : '—', 168, y + 5)
    y += 7.5
  })

  return y + 8
}

// ── Footer on every page ──────────────────────────────────────────────────────
function addFooters(doc, symbol) {
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)

    doc.setFillColor(...CARD)
    doc.rect(0, 287, 210, 10, 'F')
    doc.setFillColor(...GOLD)
    doc.rect(0, 287, 210, 0.8, 'F')

    muted(doc)
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.text(`StockPredict ML  ·  ${symbol} Analysis  ·  For educational purposes only — not financial advice.`, 20, 293)
    doc.text(`Page ${i} / ${total}`, 190, 293, { align: 'right' })
  }
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function generateReport(result) {
  const { symbol, historical, future, metrics, currencySymbol } = result
  const startDate = historical[0]?.date  ?? '—'
  const endDate   = historical[historical.length - 1]?.date ?? '—'
  const sym       = currencySymbol ?? '$'

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

  addHeader(doc, symbol, startDate, endDate)

  let y = 52
  y = addMetrics(doc, metrics, y, sym)
  y = addAnalysis(doc, symbol, metrics, y, sym)
  y = addForecastTable(doc, future, metrics.currentPrice, y, sym)
  addHistoricalTable(doc, historical, y, sym)
  addFooters(doc, symbol)

  doc.save(`${symbol}_StockAnalysis_${new Date().toISOString().split('T')[0]}.pdf`)
}
