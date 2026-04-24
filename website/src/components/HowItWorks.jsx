import { motion } from 'framer-motion'
import { Download, SlidersHorizontal, TrendingUp, BarChart2, FileDown } from 'lucide-react'

const STEPS = [
  {
    num:  '01',
    icon: Download,
    title: 'Data Collection',
    desc: 'yfinance downloads historical OHLCV data (Open, High, Low, Close, Volume) for any ticker from Yahoo Finance. The default range spans from the selected start date to today.',
    detail: 'yf.download(symbol, start, end)',
  },
  {
    num:  '02',
    icon: SlidersHorizontal,
    title: 'Preprocessing & Normalization',
    desc: 'Closing prices are scaled to [0, 1] using MinMaxScaler. This prevents large-valued features from dominating and ensures faster, more stable model convergence.',
    detail: 'MinMaxScaler(feature_range=(0,1))',
  },
  {
    num:  '03',
    icon: TrendingUp,
    title: 'Feature Engineering',
    desc: 'A sliding window of N previous closing prices forms each training sample (feature vector). The label is the N+1th price. Window size is configurable (10–60 days).',
    detail: 'X[i] = scaled[i-N:i]  y[i] = scaled[i]',
  },
  {
    num:  '04',
    icon: BarChart2,
    title: 'Model Training & Evaluation',
    desc: 'Random Forest trains on 80% of the data with 100 estimators. The held-out 20% tests generalization. RMSE and accuracy metrics are calculated on the test split.',
    detail: 'RandomForestRegressor(n_estimators=100)',
  },
  {
    num:  '05',
    icon: FileDown,
    title: 'Prediction & Report',
    desc: 'The trained model iteratively predicts future prices by feeding each output back as the next input. All charts and metrics are compiled into a downloadable PDF report.',
    detail: 'predict → denormalize → PDF export',
  },
]

export default function HowItWorks() {
  return (
    <section className="py-24 px-4 bg-[#0a0900]">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }} viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#d4af37]/20 bg-[#d4af37]/5 text-[#d4af37] text-xs font-medium mb-4">
            Pipeline
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-[#f0eed5] mb-4">
            From Data to <span className="text-[#d4af37]">Prediction</span>
          </h2>
          <p className="text-[#7a7760] max-w-xl mx-auto">
            A 5-step ML pipeline that transforms raw market data into actionable price forecasts.
          </p>
        </motion.div>

        <div className="space-y-4">
          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              viewport={{ once: true }}
              className="flex gap-5 bg-[#0f0e06] border border-[#2a2800] rounded-xl p-5 hover:border-[#d4af37]/30 transition-colors group"
            >
              {/* Step number */}
              <div className="shrink-0 w-12 h-12 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center group-hover:bg-[#d4af37]/20 transition-colors">
                <span className="text-[#d4af37] font-black text-sm font-mono">{step.num}</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h3 className="text-[#f0eed5] font-semibold text-base">{step.title}</h3>
                  <code className="text-[10px] font-mono text-[#7a7760] bg-[#181700] border border-[#2a2800] px-2 py-0.5 rounded">
                    {step.detail}
                  </code>
                </div>
                <p className="text-[#7a7760] text-sm leading-relaxed">{step.desc}</p>
              </div>

              {/* Icon */}
              <div className="shrink-0 hidden sm:flex items-center">
                <step.icon size={18} className="text-[#2a2800] group-hover:text-[#d4af37]/40 transition-colors" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
