import { motion } from 'framer-motion'
import { Trees, Zap, CheckCircle2, ArrowRight } from 'lucide-react'
import SpotlightCard from './ui/SpotlightCard'

const RF_FEATURES = [
  'n_estimators = 100 decision trees',
  'random_state = 42 (reproducible)',
  'MinMaxScaler (0→1) normalization',
  'Sliding-window feature engineering',
  '80 / 20 train-test split',
  'Evaluated with RMSE metric',
  'Iterative multi-day forecasting',
  'No GPU required — CPU only',
]

const LSTM_FEATURES = [
  '3 × LSTM layers (100 units each)',
  'Dropout(0.2) after each LSTM layer',
  'Dense(1) output layer',
  'Adam optimizer, MSE loss',
  '100 epochs, batch size 64',
  'TensorFlow / Keras backend',
  'Suitable for long sequences',
  'Captures temporal dependencies',
]

function ModelCard({ icon: Icon, badge, name, desc, color, features, file }) {
  return (
    <SpotlightCard className="bg-[#0f0e06] border border-[#2a2800] rounded-2xl p-6 hover:border-[#d4af37]/40 transition-colors h-full">
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-5">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color.bg}`}>
            <Icon size={22} className={color.icon} />
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${color.badge}`}>
            {badge}
          </span>
        </div>

        <h3 className="text-xl font-black text-[#f0eed5] mb-1">{name}</h3>
        <p className="text-xs font-mono text-[#d4af37] mb-3">{file}</p>
        <p className="text-[#7a7760] text-sm leading-relaxed mb-5">{desc}</p>

        <ul className="space-y-2">
          {features.map((f, i) => (
            <li key={i} className="flex items-center gap-2.5 text-xs text-[#c8c4a0]">
              <CheckCircle2 size={12} className={color.check} />
              {f}
            </li>
          ))}
        </ul>
      </div>
    </SpotlightCard>
  )
}

export default function Models() {
  return (
    <section id="models" className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }} viewport={{ once: true }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#d4af37]/20 bg-[#d4af37]/5 text-[#d4af37] text-xs font-medium mb-4">
            ML Models
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-[#f0eed5] mb-4">
            Two Models, <span className="text-[#d4af37]">One Goal</span>
          </h2>
          <p className="text-[#7a7760] max-w-xl mx-auto">
            Compare a classical ensemble method (Random Forest) with a deep learning time-series approach (LSTM) — both predicting stock closing prices.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <motion.div
            initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }} viewport={{ once: true }}
          >
            <ModelCard
              icon={Trees}
              badge="Primary Model"
              name="Random Forest"
              file="code.py"
              desc="An ensemble of 100 decision trees trained on sliding-window price sequences. Aggregates predictions across all trees to reduce variance — reliable and fast without GPU."
              color={{
                bg:    'bg-[#d4af37]/15',
                icon:  'text-[#d4af37]',
                badge: 'border-[#d4af37]/40 text-[#d4af37] bg-[#d4af37]/5',
                check: 'text-[#d4af37]',
              }}
              features={RF_FEATURES}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }} viewport={{ once: true }}
          >
            <ModelCard
              icon={Zap}
              badge="Deep Learning"
              name="LSTM Network"
              file="trial.py"
              desc="A 3-layer Long Short-Term Memory network that learns temporal dependencies in price sequences. Excels at capturing long-range patterns but requires TensorFlow + GPU for speed."
              color={{
                bg:    'bg-[#60a5fa]/10',
                icon:  'text-[#60a5fa]',
                badge: 'border-[#60a5fa]/30 text-[#60a5fa] bg-[#60a5fa]/5',
                check: 'text-[#60a5fa]',
              }}
              features={LSTM_FEATURES}
            />
          </motion.div>
        </div>

        {/* Comparison table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }} viewport={{ once: true }}
          className="bg-[#0f0e06] border border-[#2a2800] rounded-2xl overflow-hidden"
        >
          <div className="grid grid-cols-3 bg-[#181700] border-b border-[#2a2800] text-xs font-semibold text-[#7a7760] uppercase tracking-widest">
            <div className="px-5 py-3">Feature</div>
            <div className="px-5 py-3 text-[#d4af37]">Random Forest</div>
            <div className="px-5 py-3 text-[#60a5fa]">LSTM</div>
          </div>
          {[
            ['Training Speed',    'Fast (< 5s)',          'Slow (100 epochs)'],
            ['GPU Required',      'No',                   'Recommended'],
            ['Overfitting Risk',  'Low (ensemble)',       'Medium (tuning needed)'],
            ['Pattern Length',    'Fixed window',         'Long-range memory'],
            ['Interpretability',  'Feature importance',   'Black-box'],
            ['Best For',          'Stable, trending stocks', 'Complex volatile patterns'],
          ].map(([feat, rf, lstm], i) => (
            <div
              key={i}
              className={`grid grid-cols-3 border-b border-[#1a1900] last:border-0 text-xs ${i % 2 === 0 ? '' : 'bg-[#181700]/40'}`}
            >
              <div className="px-5 py-3 text-[#c8c4a0]">{feat}</div>
              <div className="px-5 py-3 text-[#f0eed5]">{rf}</div>
              <div className="px-5 py-3 text-[#f0eed5]">{lstm}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
