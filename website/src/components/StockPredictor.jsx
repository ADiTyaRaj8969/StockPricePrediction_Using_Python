import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ComposedChart, Area, Line,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import {
  TrendingUp, DollarSign, Target, BarChart2,
  Download, Loader2, AlertCircle, Search, X,
} from 'lucide-react'
import { fetchHistory }           from '../utils/yahooFinance'
import { runPrediction, calcRSI } from '../utils/mlPredict'
import { generateReport }         from '../utils/reportFrontend'
import { COMPANIES }              from '../data/companies'

const TODAY  = new Date().toISOString().split('T')[0]
const ONE_YR = new Date(Date.now() - 365 * 86400000).toISOString().split('T')[0]

const fmt    = s => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
const fmtP   = (v, c = '$') => v != null ? `${c}${Number(v).toFixed(2)}` : '—'
const getCurr = sym => (sym.endsWith('.NS') || sym.endsWith('.BO')) ? '₹' : '$'

// Quick-access chips — ticker + short label
const QUICK = [
  { sym: 'AAPL',         label: 'Apple'      },
  { sym: 'MSFT',         label: 'Microsoft'  },
  { sym: 'NVDA',         label: 'NVIDIA'     },
  { sym: 'GOOGL',        label: 'Google'     },
  { sym: 'TSLA',         label: 'Tesla'      },
  { sym: 'AMZN',         label: 'Amazon'     },
  { sym: 'RELIANCE.NS',  label: 'Reliance'   },
  { sym: 'TCS.NS',       label: 'TCS'        },
  { sym: 'HDFCBANK.NS',  label: 'HDFC Bank'  },
  { sym: 'INFY.NS',      label: 'Infosys'    },
  { sym: 'SPY',          label: 'S&P 500'    },
  { sym: 'QQQ',          label: 'NASDAQ-100' },
]

function ChartTooltip({ active, payload, label, currency = '$' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#181700] border border-[#2a2800] rounded-lg p-3 text-xs min-w-[150px] shadow-xl">
      <p className="text-[#7a7760] mb-2 font-mono">{label}</p>
      {payload.map((p, i) => p.value != null && (
        <div key={i} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="text-[#f0eed5] font-semibold">{currency}{Number(p.value).toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}

function MetricCard({ title, value, sub, icon: Icon, up }) {
  const c = up === true ? 'text-[#4ade80]' : up === false ? 'text-[#f87171]' : 'text-[#d4af37]'
  return (
    <div className="bg-[#0f0e06] border border-[#2a2800] rounded-xl p-4 hover:border-[#d4af37]/30 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-[#7a7760] uppercase tracking-widest font-medium">{title}</span>
        <Icon size={13} className="text-[#2a2800]" />
      </div>
      <div className={`text-xl font-black font-mono ${c}`}>{value}</div>
      {sub && <div className="text-xs text-[#7a7760] mt-1">{sub}</div>}
    </div>
  )
}

const TABS = [
  { key: 'history',    label: 'Price + SMA'   },
  { key: 'prediction', label: 'ML Prediction' },
  { key: 'rsi',        label: 'RSI (14)'      },
  { key: 'volume',     label: 'Volume'         },
]

export default function StockPredictor() {
  const [symbol,       setSymbol]       = useState('AAPL')
  const [companyQuery, setCompanyQuery] = useState('Apple Inc.')
  const [showDrop,     setShowDrop]     = useState(false)
  const [startDate,    setStartDate]    = useState(ONE_YR)
  const [endDate,      setEndDate]      = useState(TODAY)
  const [predDays,     setPredDays]     = useState(30)
  const [futureDays,   setFutureDays]   = useState(7)

  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const [result,    setResult]    = useState(null)
  const [activeTab, setActiveTab] = useState('history')
  const [reporting, setReporting] = useState(false)

  const chartRef   = useRef(null)
  const dropRef    = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = e => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Filtered company list
  const filtered = useMemo(() => {
    const q = companyQuery.trim().toLowerCase()
    if (!q) return COMPANIES.slice(0, 20)
    return COMPANIES.filter(c =>
      c.name.toLowerCase().includes(q) || c.ticker.toLowerCase().includes(q)
    ).slice(0, 25)
  }, [companyQuery])

  const selectCompany = useCallback((c) => {
    setSymbol(c.ticker)
    setCompanyQuery(c.name)
    setShowDrop(false)
  }, [])

  const selectQuick = useCallback((q) => {
    setSymbol(q.sym)
    const match = COMPANIES.find(c => c.ticker === q.sym)
    setCompanyQuery(match ? match.name : q.sym)
    setShowDrop(false)
  }, [])

  // ── Prediction ──────────────────────────────────────────────────────────────
  const handlePredict = useCallback(async () => {
    const sym = symbol.trim().toUpperCase()
    if (!sym) return
    setLoading(true); setError(null); setResult(null)
    try {
      const { rows, currencySymbol } = await fetchHistory(sym, startDate, endDate)
      const closes = rows.map(r => r.close)
      const pred   = runPrediction(closes, predDays, futureDays)

      const lastDate = new Date(rows[rows.length - 1].date)
      const futDates = []
      for (let i = 1; futDates.length < futureDays; i++) {
        const d = new Date(lastDate)
        d.setDate(d.getDate() + i)
        if (d.getDay() !== 0 && d.getDay() !== 6)
          futDates.push(d.toISOString().split('T')[0])
      }

      const historical = rows.map((r, i) => ({
        ...r, sma20: pred.sma20[i], sma100: pred.sma100[i],
      }))
      const future = futDates.map((date, i) => ({ date, predicted: pred.predictions[i] }))

      const testActualArr = historical.map((_, i) =>
        i >= pred.testOffset ? pred.testActual[i - pred.testOffset] : null
      )
      const testPredArr = historical.map((_, i) =>
        i >= pred.testOffset ? pred.testPred[i - pred.testOffset] : null
      )

      setResult({ symbol: sym, historical, future, testActualArr, testPredArr, metrics: pred.metrics, currencySymbol })
      setActiveTab('history')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [symbol, startDate, endDate, predDays, futureDays])

  // ── PDF Report ──────────────────────────────────────────────────────────────
  const handleReport = useCallback(async () => {
    if (!result) return
    setReporting(true)
    try {
      await generateReport(result)
    } catch (e) {
      setError('Report failed: ' + e.message)
    } finally {
      setReporting(false)
    }
  }, [result])

  // ── Derived data ────────────────────────────────────────────────────────────
  const combinedData = useMemo(() => {
    if (!result) return []
    return [
      ...result.historical.map(h => ({ date: h.date, close: h.close, sma20: h.sma20, sma100: h.sma100 })),
      ...result.future.map(f => ({ date: f.date, predicted: f.predicted })),
    ]
  }, [result])

  const rsiData = useMemo(() => {
    if (!result) return []
    const rsi = calcRSI(result.historical.map(h => h.close))
    return result.historical.map((h, i) => ({
      date: h.date, rsi: rsi[i] != null ? +rsi[i].toFixed(1) : null,
    }))
  }, [result])

  const m        = result?.metrics
  const currency = result?.currencySymbol ?? getCurr(result?.symbol ?? symbol)

  return (
    <section id="predictor" className="py-24 px-4 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-[#080808] via-[#0c0b00] to-[#080808] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }} viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#d4af37]/20 bg-[#d4af37]/5 text-[#d4af37] text-xs font-medium mb-4">
            <BarChart2 size={12} />
            Live Predictor — No Backend Required
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-[#f0eed5] mb-4">
            Live Stock <span className="text-[#d4af37]">Predictor</span>
          </h2>
          <p className="text-[#7a7760] max-w-2xl mx-auto">
            Fetches real market data from Yahoo Finance and runs an ensemble ML prediction entirely in your browser.
          </p>
        </motion.div>

        {/* ── Controls ──────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }} viewport={{ once: true }}
          className="bg-[#0f0e06] border border-[#2a2800] rounded-2xl p-6 mb-8"
        >

          {/* Quick-access chips */}
          <div className="flex flex-wrap gap-2 mb-5">
            {QUICK.map(q => (
              <button key={q.sym} onClick={() => selectQuick(q)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                  ${symbol === q.sym
                    ? 'bg-[#d4af37] text-[#080808]'
                    : 'bg-[#181700] text-[#7a7760] border border-[#2a2800] hover:border-[#d4af37]/40 hover:text-[#d4af37]'
                  }`}
              >{q.label}</button>
            ))}
          </div>

          {/* Inputs row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">

            {/* Company search */}
            <div className="relative lg:col-span-2" ref={dropRef}>
              <label className="block text-[10px] text-[#7a7760] uppercase tracking-widest mb-1.5">
                Company / Ticker
              </label>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2a2800] pointer-events-none" />
                <input
                  type="text"
                  value={companyQuery}
                  onChange={e => { setCompanyQuery(e.target.value); setShowDrop(true) }}
                  onFocus={() => setShowDrop(true)}
                  placeholder="Search company name or ticker..."
                  className="w-full bg-[#181700] border border-[#2a2800] rounded-lg pl-8 pr-8 py-2.5 text-[#f0eed5] text-sm focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/20 transition-colors placeholder:text-[#2a2800]"
                />
                {companyQuery && (
                  <button onClick={() => { setCompanyQuery(''); setShowDrop(true) }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a7760] hover:text-[#d4af37] transition-colors"
                  ><X size={12} /></button>
                )}
              </div>

              {/* Selected ticker badge */}
              {symbol && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="text-[10px] text-[#7a7760]">Ticker:</span>
                  <span className="text-[10px] font-mono font-bold text-[#d4af37] bg-[#d4af37]/10 px-2 py-0.5 rounded border border-[#d4af37]/20">
                    {symbol}
                  </span>
                </div>
              )}

              {/* Dropdown */}
              <AnimatePresence>
                {showDrop && filtered.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute z-50 w-full mt-1 bg-[#181700] border border-[#2a2800] rounded-xl shadow-2xl max-h-64 overflow-y-auto"
                  >
                    {filtered.map((c, i) => (
                      <button key={i} onMouseDown={() => selectCompany(c)}
                        className="w-full text-left px-4 py-2.5 hover:bg-[#2a2800] transition-colors border-b border-[#2a2800]/40 last:border-0 flex items-center gap-3"
                      >
                        <span className="text-[#d4af37] font-mono text-[10px] font-bold w-24 shrink-0">{c.ticker}</span>
                        <span className="text-[#c8c4a0] text-xs truncate">{c.name}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Start date */}
            <div>
              <label className="block text-[10px] text-[#7a7760] uppercase tracking-widest mb-1.5">Start Date</label>
              <input type="date" value={startDate} max={endDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-[#181700] border border-[#2a2800] rounded-lg px-3 py-2.5 text-[#f0eed5] text-sm focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/20 transition-colors"
              />
            </div>

            {/* End date */}
            <div>
              <label className="block text-[10px] text-[#7a7760] uppercase tracking-widest mb-1.5">End Date</label>
              <input type="date" value={endDate} min={startDate} max={TODAY}
                onChange={e => setEndDate(e.target.value)}
                className="w-full bg-[#181700] border border-[#2a2800] rounded-lg px-3 py-2.5 text-[#f0eed5] text-sm focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/20 transition-colors"
              />
            </div>
          </div>

          {/* Sliders + Run */}
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-[10px] text-[#7a7760] uppercase tracking-widest mb-1.5">
                Window: <span className="text-[#d4af37]">{predDays} days</span>
              </label>
              <input type="range" min="10" max="60" value={predDays}
                onChange={e => setPredDays(+e.target.value)}
                className="w-full" style={{ accentColor: '#d4af37' }} />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] text-[#7a7760] uppercase tracking-widest mb-1.5">
                Forecast: <span className="text-[#ffd700]">{futureDays} days</span>
              </label>
              <input type="range" min="1" max="30" value={futureDays}
                onChange={e => setFutureDays(+e.target.value)}
                className="w-full" style={{ accentColor: '#ffd700' }} />
            </div>
            <button onClick={handlePredict} disabled={loading}
              className="flex items-center gap-2.5 px-8 py-3 bg-[#d4af37] hover:bg-[#ffd700] disabled:bg-[#2a2800] disabled:cursor-not-allowed text-[#080808] disabled:text-[#7a7760] font-bold rounded-xl transition-all text-sm whitespace-nowrap"
            >
              {loading
                ? <><Loader2 className="animate-spin" size={15} /> Fetching &amp; Predicting...</>
                : <><TrendingUp size={15} /> Run Prediction</>
              }
            </button>
          </div>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-start gap-3 bg-[#f87171]/8 border border-[#f87171]/25 rounded-xl p-4 mb-6"
            >
              <AlertCircle className="text-[#f87171] shrink-0 mt-0.5" size={18} />
              <p className="text-[#f87171] text-sm">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {result && m && (
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <MetricCard
                  title="Current Price"
                  value={fmtP(m.currentPrice, currency)}
                  sub={`${m.pctChange >= 0 ? '+' : ''}${m.pctChange}% over period`}
                  icon={DollarSign} up={m.pctChange >= 0}
                />
                <MetricCard
                  title="Predicted Next Day"
                  value={fmtP(m.predictedNext, currency)}
                  sub={`${((m.predictedNext - m.currentPrice) / m.currentPrice * 100).toFixed(2)}% forecast`}
                  icon={Target} up={m.predictedNext >= m.currentPrice}
                />
                <MetricCard
                  title="RMSE"
                  value={fmtP(m.rmse, currency)}
                  sub={`Tested on ${m.testSize} trading days`}
                  icon={BarChart2}
                />
                <MetricCard
                  title="Accuracy"
                  value={`${m.accuracy}%`}
                  sub={`${m.trainSize} days training`}
                  icon={TrendingUp} up={m.accuracy >= 80}
                />
              </div>

              {/* Signal badges */}
              <div className="flex flex-wrap gap-3 mb-6">
                <span className={`px-3 py-1 rounded-full border text-xs font-semibold ${m.predictedNext > m.currentPrice ? 'border-[#4ade80]/40 text-[#4ade80] bg-[#4ade80]/5' : 'border-[#f87171]/40 text-[#f87171] bg-[#f87171]/5'}`}>
                  Signal: {m.predictedNext > m.currentPrice ? 'BULLISH' : 'BEARISH'}
                </span>
                <span className="px-3 py-1 rounded-full border border-[#d4af37]/30 text-[#d4af37] bg-[#d4af37]/5 text-xs font-semibold">
                  {result.symbol} · {m.dataPoints} data points
                </span>
                <span className="px-3 py-1 rounded-full border border-[#2a2800] text-[#7a7760] bg-[#181700] text-xs font-semibold">
                  Ensemble: k-NN + LinReg + Holt Smoothing
                </span>
              </div>

              {/* Tab bar */}
              <div className="flex gap-1 mb-4 bg-[#0f0e06] border border-[#2a2800] rounded-xl p-1 w-fit">
                {TABS.map(t => (
                  <button key={t.key} onClick={() => setActiveTab(t.key)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === t.key ? 'bg-[#d4af37] text-[#080808]' : 'text-[#7a7760] hover:text-[#c8c4a0]'}`}
                  >{t.label}</button>
                ))}
              </div>

              {/* Charts */}
              <div ref={chartRef} className="bg-[#0f0e06] border border-[#2a2800] rounded-2xl p-5 mb-6">

                {/* Price + SMA */}
                {activeTab === 'history' && (
                  <>
                    <h3 className="text-sm font-semibold text-[#f0eed5] mb-4">
                      {result.symbol} — Historical Price &amp; Moving Averages
                    </h3>
                    <ResponsiveContainer width="100%" height={380}>
                      <ComposedChart data={result.historical} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                        <defs>
                          <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#d4af37" stopOpacity={0.22}/>
                            <stop offset="95%" stopColor="#d4af37" stopOpacity={0.01}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1900" />
                        <XAxis dataKey="date" tickFormatter={fmt} tick={{ fill:'#7a7760', fontSize:10 }} minTickGap={50} />
                        <YAxis tickFormatter={v=>`${currency}${v}`} tick={{ fill:'#7a7760', fontSize:10 }} domain={['auto','auto']} width={65}/>
                        <Tooltip content={<ChartTooltip currency={currency} />} />
                        <Legend wrapperStyle={{ fontSize:11, color:'#7a7760' }} />
                        <Area  type="monotone" dataKey="close"  name="Close"   stroke="#d4af37" fill="url(#gC)" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="sma20"  name="SMA 20"  stroke="#60a5fa" strokeWidth={1.5} dot={false} strokeDasharray="5 3" connectNulls />
                        <Line type="monotone" dataKey="sma100" name="SMA 100" stroke="#c084fc" strokeWidth={1.5} dot={false} strokeDasharray="5 3" connectNulls />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </>
                )}

                {/* ML Prediction */}
                {activeTab === 'prediction' && (
                  <>
                    <h3 className="text-sm font-semibold text-[#f0eed5] mb-4">
                      {result.symbol} — ML Forecast (Next {futureDays} Days)
                    </h3>
                    <ResponsiveContainer width="100%" height={380}>
                      <ComposedChart data={combinedData} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                        <defs>
                          <linearGradient id="gC2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#d4af37" stopOpacity={0.18}/>
                            <stop offset="95%" stopColor="#d4af37" stopOpacity={0.01}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1900" />
                        <XAxis dataKey="date" tickFormatter={fmt} tick={{ fill:'#7a7760', fontSize:10 }} minTickGap={50} />
                        <YAxis tickFormatter={v=>`${currency}${v}`} tick={{ fill:'#7a7760', fontSize:10 }} domain={['auto','auto']} width={65}/>
                        <Tooltip content={<ChartTooltip currency={currency} />} />
                        <Legend wrapperStyle={{ fontSize:11, color:'#7a7760' }} />
                        <ReferenceLine
                          x={result.historical[result.historical.length - 1]?.date}
                          stroke="#2a2800" strokeDasharray="4 2"
                          label={{ value:'Today', fill:'#7a7760', fontSize:9 }}
                        />
                        <Area  type="monotone" dataKey="close"     name="Historical" stroke="#d4af37" fill="url(#gC2)" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="predicted" name="Predicted"  stroke="#ffd700" strokeWidth={2.5} dot={{ fill:'#ffd700', r:3 }} strokeDasharray="6 3" connectNulls />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </>
                )}

                {/* RSI */}
                {activeTab === 'rsi' && (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-[#f0eed5]">{result.symbol} — RSI (14-Period)</h3>
                      <div className="text-xs text-[#7a7760] flex gap-3">
                        <span className="text-[#f87171]">— Overbought 70</span>
                        <span className="text-[#4ade80]">— Oversold 30</span>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={380}>
                      <ComposedChart data={rsiData} margin={{ top:5, right:15, left:0, bottom:5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1900" />
                        <XAxis dataKey="date" tickFormatter={fmt} tick={{ fill:'#7a7760', fontSize:10 }} minTickGap={50} />
                        <YAxis domain={[0,100]} tick={{ fill:'#7a7760', fontSize:10 }} width={40} />
                        <Tooltip content={<ChartTooltip />} />
                        <ReferenceLine y={70} stroke="#f87171" strokeDasharray="4 2" />
                        <ReferenceLine y={30} stroke="#4ade80" strokeDasharray="4 2" />
                        <ReferenceLine y={50} stroke="#2a2800" strokeDasharray="2 4" />
                        <Area type="monotone" dataKey="rsi" name="RSI" stroke="#d4af37" fill="rgba(212,175,55,0.08)" strokeWidth={2} dot={false} connectNulls />
                      </ComposedChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-[#7a7760] mt-3">
                      RSI &gt; 70 = overbought (potential pullback). RSI &lt; 30 = oversold (potential bounce).
                      Based on 14-period exponential averages of gains and losses.
                    </p>
                  </>
                )}

                {/* Volume */}
                {activeTab === 'volume' && (
                  <>
                    <h3 className="text-sm font-semibold text-[#f0eed5] mb-4">{result.symbol} — Trading Volume</h3>
                    {result.historical.some(h => h.volume) ? (
                      <>
                        <ResponsiveContainer width="100%" height={380}>
                          <BarChart data={result.historical.filter(h => h.volume)} margin={{ top:5, right:15, left:0, bottom:5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1a1900" />
                            <XAxis dataKey="date" tickFormatter={fmt} tick={{ fill:'#7a7760', fontSize:10 }} minTickGap={50} />
                            <YAxis tickFormatter={v=>`${(v/1e6).toFixed(0)}M`} tick={{ fill:'#7a7760', fontSize:10 }} width={55} />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar dataKey="volume" name="Volume" fill="#d4af37" opacity={0.7} radius={[2,2,0,0]} />
                          </BarChart>
                        </ResponsiveContainer>
                        <p className="text-xs text-[#7a7760] mt-3">
                          Volume spikes often precede significant price moves. High volume on up-days confirms bullish strength;
                          high volume on down-days confirms bearish pressure.
                        </p>
                      </>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-[#7a7760] text-sm">
                        Volume data not available for {result.symbol}.
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Report CTA */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0f0e06] border border-[#d4af37]/20 rounded-2xl p-5">
                <div>
                  <p className="text-[#f0eed5] font-semibold">Download Full Analysis Report</p>
                  <p className="text-[#7a7760] text-xs mt-1">
                    PDF with all metrics, forecast table, historical data, insights &amp; risk analysis.
                  </p>
                </div>
                <button onClick={handleReport} disabled={reporting}
                  className="flex items-center gap-2.5 px-7 py-3 bg-gradient-to-r from-[#d4af37] to-[#ffd700] hover:from-[#ffd700] hover:to-[#d4af37] disabled:from-[#2a2800] disabled:to-[#2a2800] disabled:cursor-not-allowed text-[#080808] disabled:text-[#7a7760] font-bold rounded-xl transition-all text-sm whitespace-nowrap"
                >
                  {reporting
                    ? <><Loader2 className="animate-spin" size={15} /> Generating...</>
                    : <><Download size={15} /> Get PDF Report</>
                  }
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!result && !loading && !error && (
          <div className="border border-dashed border-[#2a2800] rounded-2xl p-16 text-center">
            <TrendingUp className="mx-auto text-[#2a2800] mb-4" size={48} />
            <p className="text-[#7a7760]">
              Search for a company above and click <span className="text-[#d4af37]">Run Prediction</span>.
            </p>
            <p className="text-[#4a4830] text-xs mt-2">
              Live data from Yahoo Finance · 150+ Indian &amp; Western stocks supported.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
