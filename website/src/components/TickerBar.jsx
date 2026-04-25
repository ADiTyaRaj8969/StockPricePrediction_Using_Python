import { useState, useEffect } from 'react'
import { fetchQuotes } from '../utils/yahooFinance'

const DEFAULT = [
  { sym: 'AAPL',        price: '189.84',  chg: '+1.23', up: true  },
  { sym: 'MSFT',        price: '378.91',  chg: '+0.85', up: true  },
  { sym: 'GOOGL',       price: '141.22',  chg: '-0.32', up: false },
  { sym: 'TSLA',        price: '242.60',  chg: '+2.15', up: true  },
  { sym: 'AMZN',        price: '183.17',  chg: '+0.89', up: true  },
  { sym: 'NVDA',        price: '867.45',  chg: '+3.21', up: true  },
  { sym: 'META',        price: '483.12',  chg: '+1.45', up: true  },
  { sym: 'NFLX',        price: '623.78',  chg: '-0.67', up: false },
  { sym: 'JPM',         price: '196.44',  chg: '+0.44', up: true  },
  { sym: 'BRK-B',       price: '378.55',  chg: '+0.12', up: true  },
  { sym: 'RELIANCE.NS', price: '2948.30', chg: '+1.02', up: true  },
  { sym: 'TCS.NS',      price: '4218.75', chg: '-0.55', up: false },
  { sym: 'SPY',         price: '519.33',  chg: '+0.63', up: true  },
  { sym: 'QQQ',         price: '443.80',  chg: '+0.91', up: true  },
]

const SYMBOLS = DEFAULT.map(t => t.sym)

const CURR_MAP = { '.NS': '₹', '.BO': '₹', '.L': '£', '.PA': '€', '.DE': '€', '.TO': 'CA$', '.AX': 'A$' }
const symCurr  = sym => {
  for (const [sfx, c] of Object.entries(CURR_MAP)) if (sym.endsWith(sfx)) return c
  return '$'
}

export default function TickerBar() {
  const [tickers, setTickers] = useState(DEFAULT)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const data = await fetchQuotes(SYMBOLS)
        if (cancelled || !data.length) return
        const map = Object.fromEntries(data.map(q => [q.symbol, q]))
        setTickers(DEFAULT.map(t => {
          const live = map[t.sym]
          if (!live) return t
          return {
            sym:   t.sym,
            price: live.price.toFixed(2),
            chg:   `${live.change >= 0 ? '+' : ''}${live.change.toFixed(2)}`,
            up:    live.up,
          }
        }))
      } catch (_) { /* keep defaults on error */ }
    }

    load()
    const id = setInterval(load, 60_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const items = [...tickers, ...tickers]

  return (
    <div className="w-full bg-[#0f0e06] border-y border-[#2a2800] overflow-hidden py-2 select-none">
      <div className="flex overflow-hidden">
        <div className="ticker-track">
          {items.map((t, i) => (
            <span key={i} className="inline-flex items-center gap-2 px-5 text-xs font-mono whitespace-nowrap">
              <span className="text-[#d4af37] font-semibold">{t.sym.replace('.NS','').replace('.BO','')}</span>
              <span className="text-[#c8c4a0]">{symCurr(t.sym)}{t.price}</span>
              <span className={t.up ? 'text-[#4ade80]' : 'text-[#f87171]'}>
                {t.up ? '▲' : '▼'} {t.chg}%
              </span>
              <span className="text-[#2a2800]">│</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
