// Browser-side ML prediction engine
// Ensemble: weighted k-NN + AR(5) autoregression + linear trend + Holt smoothing
// All models operate in log-return space (stationary) for maximum accuracy.

// ── Rolling statistics ────────────────────────────────────────────────────────

function rollingStd(arr, w) {
  return arr.map((_, i) => {
    if (i < w - 1) return null
    const sl   = arr.slice(i - w + 1, i + 1)
    const mean = sl.reduce((s, v) => s + v, 0) / w
    return Math.sqrt(sl.reduce((s, v) => s + (v - mean) ** 2, 0) / w) || 1e-8
  })
}

function smaNulls(prices, w) {
  return prices.map((_, i) =>
    i < w - 1 ? null : prices.slice(i - w + 1, i + 1).reduce((s, v) => s + v, 0) / w
  )
}

// ── Exported technical indicators ─────────────────────────────────────────────

export function calcRSI(prices, period = 14) {
  if (prices.length < period + 1) return prices.map(() => null)
  const out = new Array(period).fill(null)
  let ag = 0, al = 0
  for (let i = 1; i <= period; i++) {
    const d = prices[i] - prices[i - 1]
    if (d > 0) ag += d; else al -= d
  }
  ag /= period; al /= period
  out.push(al === 0 ? 100 : 100 - 100 / (1 + ag / al))
  for (let i = period + 1; i < prices.length; i++) {
    const d = prices[i] - prices[i - 1]
    ag = (ag * (period - 1) + Math.max(d, 0)) / period
    al = (al * (period - 1) + Math.max(-d, 0)) / period
    out.push(al === 0 ? 100 : 100 - 100 / (1 + ag / al))
  }
  return out
}

export function calcEMA(prices, period) {
  const k = 2 / (period + 1)
  const out = []
  let ema = prices[0]
  for (let i = 0; i < prices.length; i++) {
    ema = i === 0 ? prices[0] : prices[i] * k + ema * (1 - k)
    out.push(+ema.toFixed(4))
  }
  return out
}

export function calcMACD(prices, fast = 12, slow = 26, signal = 9) {
  const emaFast   = calcEMA(prices, fast)
  const emaSlow   = calcEMA(prices, slow)
  const macdLine  = emaFast.map((v, i) => +(v - emaSlow[i]).toFixed(4))
  const sigLine   = calcEMA(macdLine, signal)
  const histogram = macdLine.map((v, i) => +(v - sigLine[i]).toFixed(4))
  return { macd: macdLine, signal: sigLine, histogram }
}

export function calcBollinger(prices, period = 20, mult = 2) {
  const mid = smaNulls(prices, period)
  const upper = [], lower = []
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) { upper.push(null); lower.push(null); continue }
    const sl   = prices.slice(i - period + 1, i + 1)
    const mean = sl.reduce((s, v) => s + v, 0) / period
    const std  = Math.sqrt(sl.reduce((s, v) => s + (v - mean) ** 2, 0) / period)
    upper.push(+(mean + mult * std).toFixed(2))
    lower.push(+(mean - mult * std).toFixed(2))
  }
  return {
    upper,
    mid: mid.map(v => v != null ? +v.toFixed(2) : null),
    lower,
  }
}

// ── Internal math helpers ─────────────────────────────────────────────────────

function logReturns(prices) {
  const r = []
  for (let i = 1; i < prices.length; i++)
    r.push(Math.log(prices[i] / prices[i - 1]))
  return r
}

function linSlope(y) {
  const n   = y.length
  const sx  = n * (n - 1) / 2
  const sx2 = n * (n - 1) * (2 * n - 1) / 6
  const sy  = y.reduce((s, v) => s + v, 0)
  const sxy = y.reduce((s, v, i) => s + i * v, 0)
  return (n * sxy - sx * sy) / (n * sx2 - sx * sx) || 0
}

// Gaussian elimination to solve Ax = b (p×p system, in-place augmented matrix)
function gaussElim(A, b) {
  const n = b.length
  const M = A.map((row, i) => [...row, b[i]])
  for (let col = 0; col < n; col++) {
    let max = col
    for (let row = col + 1; row < n; row++)
      if (Math.abs(M[row][col]) > Math.abs(M[max][col])) max = row
    ;[M[col], M[max]] = [M[max], M[col]]
    if (Math.abs(M[col][col]) < 1e-12) continue
    for (let row = 0; row < n; row++) {
      if (row === col) continue
      const f = M[row][col] / M[col][col]
      for (let k = col; k <= n; k++) M[row][k] -= f * M[col][k]
    }
  }
  return M.map((row, i) => row[n] / (row[i] || 1e-12))
}

// Fit AR(p) coefficients via OLS on log-returns
function fitAR(returns, p) {
  const n = returns.length
  const X = [], y = []
  for (let i = p; i < n; i++) {
    X.push(returns.slice(i - p, i).reverse())
    y.push(returns[i])
  }
  const m = X.length
  if (m < p + 5) return new Array(p).fill(0)

  const XtX = Array.from({ length: p }, () => new Array(p).fill(0))
  const Xty = new Array(p).fill(0)
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < p; j++) {
      Xty[j] += X[i][j] * y[i]
      for (let k = j; k < p; k++) {
        XtX[j][k] += X[i][j] * X[i][k]
        XtX[k][j]  = XtX[j][k]
      }
    }
  }
  // Ridge regularisation for stability
  for (let j = 0; j < p; j++) XtX[j][j] += 1e-6
  try {
    return gaussElim(XtX, Xty)
  } catch (_) {
    return new Array(p).fill(0)
  }
}

function arPredict(returns, coeffs, p) {
  const last = returns.slice(-p).reverse()
  return last.reduce((sum, r, i) => sum + r * (coeffs[i] ?? 0), 0)
}

// ── Feature builder ───────────────────────────────────────────────────────────

function buildDataset(returns, vol, windowSize) {
  const X = [], y = []
  for (let i = windowSize; i < returns.length - 1; i++) {
    const v     = vol[i] || 1e-8
    const w     = returns.slice(i - windowSize, i)
    const normW = w.map(r => r / v)
    const mom5  = returns.slice(Math.max(0, i - 5),  i).reduce((s, r) => s + r, 0) / v
    const mom20 = returns.slice(Math.max(0, i - 20), i).reduce((s, r) => s + r, 0) / v
    const trend = linSlope(w) / (v + 1e-8)
    const avgV20 = vol.slice(Math.max(0, i - 20), i).reduce((s, x) => s + x, 0) / 20 || 1
    const volRatio = v / avgV20
    X.push([...normW, mom5, mom20, trend, volRatio])
    y.push(returns[i + 1])
  }
  return { X, y }
}

// ── Weighted k-NN ─────────────────────────────────────────────────────────────

function knnPredict(X, y, query, k = 40) {
  const scored = X.map((x, i) => {
    let d = 0
    for (let j = 0; j < query.length; j++) d += (x[j] - query[j]) ** 2
    return { w: 1 / (Math.sqrt(d) + 1e-9), v: y[i] }
  })
  scored.sort((a, b) => b.w - a.w)
  const top = scored.slice(0, k)
  const tw  = top.reduce((s, t) => s + t.w, 0)
  return top.reduce((s, t) => s + t.w * t.v, 0) / tw
}

// ── Linear regression trend ───────────────────────────────────────────────────

function linRegPredict(returns, windowSize) {
  const w = returns.slice(-windowSize)
  const b = linSlope(w)
  const a = w.reduce((s, v) => s + v, 0) / w.length - b * (w.length / 2)
  return a + b * (w.length + 1)
}

// ── Holt double exponential smoothing ────────────────────────────────────────

function holtPredict(returns, alpha = 0.3, beta = 0.1) {
  if (returns.length < 2) return returns[returns.length - 1] || 0
  let level = returns[0], trend = returns[1] - returns[0]
  for (let i = 1; i < returns.length; i++) {
    const prev = level
    level = alpha * returns[i] + (1 - alpha) * (level + trend)
    trend = beta  * (level - prev) + (1 - beta) * trend
  }
  return level + trend
}

// ── Main prediction function ──────────────────────────────────────────────────

export function runPrediction(closePrices, windowSize, futureDays) {
  if (closePrices.length < windowSize + 30) {
    throw new Error(
      `Need at least ${windowSize + 30} trading days. Reduce "Window Days" or expand the date range.`
    )
  }

  const returns = logReturns(closePrices)
  const volRaw  = rollingStd(returns, Math.min(10, Math.floor(windowSize / 3)))
  const meanVol = volRaw.filter(Boolean).slice(0, 20).reduce((s, v) => s + v, 0) /
                  Math.max(1, volRaw.filter(Boolean).slice(0, 20).length)
  const vol = volRaw.map(v => v ?? meanVol)

  // Fit AR(5) on full return history
  const AR_P   = 5
  const arCoeffs = fitAR(returns, AR_P)

  const { X, y } = buildDataset(returns, vol, windowSize)
  if (X.length < 20) throw new Error('Not enough data. Expand the date range.')

  const split   = Math.floor(X.length * 0.8)
  const X_train = X.slice(0, split), y_train = y.slice(0, split)
  const X_test  = X.slice(split),    y_test  = y.slice(split)

  // Test-set evaluation
  const testStartIdx = windowSize + split + 1
  const testPredRets = X_test.map(x => knnPredict(X_train, y_train, x))
  const testActual   = y_test.map((_, i) =>
    +(closePrices[Math.min(testStartIdx + i, closePrices.length - 1)]).toFixed(2)
  )
  const testPred = testPredRets.map((ret, i) => {
    const base = closePrices[Math.min(testStartIdx + i - 1, closePrices.length - 1)]
    return +(base * Math.exp(ret)).toFixed(2)
  })

  const rmse     = Math.sqrt(testPred.reduce((s, v, i) => s + (v - testActual[i]) ** 2, 0) / testPred.length)
  const meanAct  = testActual.reduce((s, v) => s + v, 0) / testActual.length
  const accuracy = Math.max(0, Math.min(100, 100 - (rmse / meanAct) * 100))

  // Future prediction — 4-model ensemble
  let liveRets  = [...returns]
  let liveVol   = [...vol]
  let lastPrice = closePrices[closePrices.length - 1]
  const predictions = []

  for (let step = 0; step < futureDays; step++) {
    const v      = liveVol[liveVol.length - 1] || meanVol
    const window = liveRets.slice(-windowSize)
    const normW  = window.map(r => r / v)
    const mom5   = liveRets.slice(-5).reduce((s, r) => s + r, 0) / v
    const mom20  = liveRets.slice(-20).reduce((s, r) => s + r, 0) / v
    const trend  = linSlope(window) / (v + 1e-8)
    const avgV20 = liveVol.slice(-20).reduce((s, x) => s + x, 0) / 20 || 1
    const volRatio = v / avgV20

    const query = [...normW, mom5, mom20, trend, volRatio]

    // 4-model ensemble weights: k-NN 45% | AR(5) 25% | LinReg 20% | Holt 10%
    const knnRet  = knnPredict(X_train, y_train, query)
    const arRet   = arPredict(liveRets, arCoeffs, AR_P)
    const linRet  = linRegPredict(liveRets, windowSize)
    const holtRet = holtPredict(liveRets.slice(-windowSize))
    const ensRet  = 0.45 * knnRet + 0.25 * arRet + 0.20 * linRet + 0.10 * holtRet

    const nextPrice = lastPrice * Math.exp(ensRet)
    predictions.push(+nextPrice.toFixed(2))
    liveRets.push(ensRet)
    liveVol.push(Math.sqrt(0.9 * v * v + 0.1 * ensRet * ensRet))
    lastPrice = nextPrice
  }

  const sma20  = smaNulls(closePrices, 20) .map(v => v != null ? +v.toFixed(2) : null)
  const sma100 = smaNulls(closePrices, 100).map(v => v != null ? +v.toFixed(2) : null)

  return {
    predictions, testActual, testPred,
    testOffset: testStartIdx, sma20, sma100,
    metrics: {
      rmse:          +rmse.toFixed(2),
      accuracy:      +accuracy.toFixed(1),
      currentPrice:  closePrices[closePrices.length - 1],
      predictedNext: predictions[0],
      pctChange:     +((closePrices[closePrices.length - 1] - closePrices[0]) / closePrices[0] * 100).toFixed(2),
      priceChange:   +(closePrices[closePrices.length - 1] - closePrices[0]).toFixed(2),
      dataPoints:    closePrices.length,
      trainSize:     split,
      testSize:      X_test.length,
    },
  }
}
