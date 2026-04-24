import { motion } from 'framer-motion'
import { TrendingUp, ArrowRight, ChevronDown } from 'lucide-react'

const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 30 },
  animate:    { opacity: 1, y: 0  },
  transition: { duration: 0.7, delay, ease: 'easeOut' },
})

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 text-center overflow-hidden pt-10">

      {/* Grid overlay - The sole background element */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#d4af37 1px, transparent 1px), linear-gradient(90deg, #d4af37 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 w-full max-w-5xl mx-auto px-2">

        {/* Badge */}
        <motion.div {...fadeUp(0.1)} className="inline-flex items-center justify-center gap-2 mb-8">
          <span className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/8 text-[#d4af37] text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
            AI-Powered Stock Analysis
          </span>
        </motion.div>

        {/* Main heading */}
        <motion.h1
          {...fadeUp(0.2)}
          className="text-4xl sm:text-5xl md:text-7xl font-black leading-[1.05] tracking-tight mb-10"
        >
          <span className="text-[#f0eed5]">Predict Stock Prices</span>
          <br />
          <span className="shimmer">with Machine Learning</span>
        </motion.h1>

        {/* CTA buttons */}
        <motion.div {...fadeUp(0.4)} className="flex flex-wrap items-center justify-center gap-3 mb-16">
          <a
            href="#predictor"
            className="flex items-center gap-2 px-6 sm:px-7 py-3 sm:py-3.5 rounded-xl bg-[#d4af37] hover:bg-[#ffd700] text-[#080808] font-bold text-sm transition-all glow-gold-sm hover:scale-105 active:scale-100"
          >
            <TrendingUp size={16} />
            Launch Predictor
            <ArrowRight size={14} />
          </a>
          <a
            href="https://github.com/ADiTyaRaj8969/StockPricePrediction_Using_Python"
            target="_blank" rel="noreferrer"
            className="flex items-center gap-2 px-6 sm:px-7 py-3 sm:py-3.5 rounded-xl border border-[#d4af37]/30 text-[#d4af37] font-semibold text-sm hover:bg-[#d4af37]/10 hover:border-[#d4af37] transition-all"
          >
            View Source Code
          </a>
        </motion.div>

      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-[#3a3820]"
      >
        <span className="text-[10px] uppercase tracking-widest">Scroll</span>
        <ChevronDown size={14} className="animate-bounce" />
      </motion.div>
    </section>
  )
}
