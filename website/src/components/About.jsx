import { motion } from 'framer-motion'
import { Code2, Database, LineChart, Brain } from 'lucide-react'

const CODE = `# Random Forest Stock Predictor
import yfinance as yf
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import MinMaxScaler

company = "AAPL"
prediction_days = 30

data = yf.download(company, start="2024-01-01")
close = data["Close"].values

scaler = MinMaxScaler(feature_range=(0, 1))
scaled = scaler.fit_transform(close.reshape(-1,1))

# Sliding-window features
X, y = [], []
for i in range(prediction_days, len(scaled)):
    X.append(scaled[i-prediction_days:i, 0])
    y.append(scaled[i, 0])

# Train Random Forest
model = RandomForestRegressor(
    n_estimators=100, random_state=42
)
model.fit(X_train, y_train)

# Predict next day
next_pred = model.predict(last_window)
price = scaler.inverse_transform(next_pred)`

const HIGHLIGHTS = [
  { icon: Database,  title: 'Real Market Data',     desc: 'Fetches live historical OHLCV data from Yahoo Finance via yfinance API.' },
  { icon: Brain,     title: 'Random Forest',         desc: '100 decision trees averaged for robust predictions — resistant to overfitting.' },
  { icon: LineChart, title: '6 Chart Visualizations', desc: 'Price history, SMA, actual vs predicted, future forecast, distribution, correlations.' },
  { icon: Code2,     title: 'Also Includes LSTM',    desc: 'A TensorFlow/Keras LSTM variant (trial.py) with 3-layer architecture + Dropout.' },
]

export default function About() {
  return (
    <section id="about" className="py-24 px-4 bg-[#0a0900]">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }} viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#d4af37]/20 bg-[#d4af37]/5 text-[#d4af37] text-xs font-medium mb-4">
            About this Project
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-[#f0eed5] mb-4">
            How it <span className="text-[#d4af37]">Works</span>
          </h2>
          <p className="text-[#7a7760] max-w-xl mx-auto">
            Two machine learning models trained on real financial data to predict closing stock prices.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Code snippet */}
          <motion.div
            initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }} viewport={{ once: true }}
            className="bg-[#0f0e06] border border-[#2a2800] rounded-2xl overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2a2800] bg-[#181700]">
              <div className="w-3 h-3 rounded-full bg-[#f87171]/70" />
              <div className="w-3 h-3 rounded-full bg-[#fbbf24]/70" />
              <div className="w-3 h-3 rounded-full bg-[#4ade80]/70" />
              <span className="ml-2 text-xs text-[#7a7760] font-mono">code.py</span>
            </div>
            <pre className="text-xs font-mono text-[#c8c4a0] p-5 overflow-x-auto leading-relaxed">
              {CODE.split('\n').map((line, i) => {
                const isComment  = line.trim().startsWith('#')
                const isKeyword  = /^(import|from|def|class|if|for|return)\b/.test(line.trim())
                const isStr      = line.includes('"') || line.includes("'")
                return (
                  <div key={i} className={
                    isComment ? 'text-[#4a4830]' :
                    isKeyword ? 'text-[#60a5fa]' :
                    'text-[#c8c4a0]'
                  }>
                    {line || ' '}
                  </div>
                )
              })}
            </pre>
          </motion.div>

          {/* Feature cards */}
          <motion.div
            initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }} viewport={{ once: true }}
            className="flex flex-col gap-4"
          >
            {HIGHLIGHTS.map((h, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }} viewport={{ once: true }}
                className="flex gap-4 bg-[#0f0e06] border border-[#2a2800] rounded-xl p-4 hover:border-[#d4af37]/30 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center shrink-0 group-hover:bg-[#d4af37]/20 transition-colors">
                  <h.icon size={18} className="text-[#d4af37]" />
                </div>
                <div>
                  <p className="text-[#f0eed5] font-semibold text-sm mb-1">{h.title}</p>
                  <p className="text-[#7a7760] text-xs leading-relaxed">{h.desc}</p>
                </div>
              </motion.div>
            ))}

            {/* Key figures */}
            <div className="grid grid-cols-3 gap-3 mt-2">
              {[
                { v: '80/20', l: 'Train/Test Split' },
                { v: 'MSE',   l: 'Loss Function'    },
                { v: 'MinMax',l: 'Scaler Type'       },
              ].map((s, i) => (
                <div key={i} className="bg-[#181700] border border-[#2a2800] rounded-xl p-3 text-center">
                  <div className="text-[#d4af37] font-black text-lg">{s.v}</div>
                  <div className="text-[#7a7760] text-xs mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
