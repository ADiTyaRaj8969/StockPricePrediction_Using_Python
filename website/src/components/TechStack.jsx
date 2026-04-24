import { motion } from 'framer-motion'

const STACK = [
  {
    name: 'Python',
    role: 'Core Language',
    img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg',
  },
  {
    name: 'scikit-learn',
    role: 'Random Forest',
    img: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Scikit_learn_logo_small.svg',
    bg: '#f7931e22',
  },
  {
    name: 'TensorFlow',
    role: 'LSTM / Deep Learning',
    img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tensorflow/tensorflow-original.svg',
  },
  {
    name: 'NumPy',
    role: 'Numerical Computing',
    img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/numpy/numpy-original.svg',
  },
  {
    name: 'Pandas',
    role: 'Data Manipulation',
    img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pandas/pandas-original.svg',
    bg: '#15003722',
  },
  {
    name: 'yfinance',
    role: 'Market Data API',
    img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/yahoo/yahoo-original.svg',
    fallbackColor: '#6001d2',
  },
  {
    name: 'Matplotlib',
    role: 'Chart Generation',
    img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/matplotlib/matplotlib-original.svg',
  },
  {
    name: 'Seaborn',
    role: 'Statistical Viz',
    img: 'https://seaborn.pydata.org/_images/logo-tall-lightbg.svg',
    bg: '#4c72b022',
    fallbackColor: '#4c72b0',
  },
  {
    name: 'Flask',
    role: 'Backend REST API',
    img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/flask/flask-original.svg',
    invert: true,
  },
  {
    name: 'React',
    role: 'Frontend UI',
    img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg',
  },
  {
    name: 'Recharts',
    role: 'Interactive Charts',
    img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/d3js/d3js-original.svg',
    fallbackColor: '#d4af37',
  },
  {
    name: 'jsPDF',
    role: 'Report Generation',
    img: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg',
    fallbackColor: '#c084fc',
  },
]

function LogoBadge({ tech }) {
  if (tech.img) {
    return (
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 overflow-hidden"
        style={{ background: tech.bg || 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <img
          src={tech.img}
          alt={tech.name}
          className="w-6 h-6 object-contain"
          style={tech.invert ? { filter: 'invert(1) brightness(0.9)' } : {}}
          onError={e => {
            e.currentTarget.style.display = 'none'
            e.currentTarget.parentElement.style.background = `${tech.fallbackColor || '#d4af37'}18`
            e.currentTarget.parentElement.innerHTML = `<span style="color:${tech.fallbackColor || '#d4af37'};font-weight:800;font-size:11px">${tech.name.slice(0,2).toUpperCase()}</span>`
          }}
        />
      </div>
    )
  }
  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-xs font-black"
      style={{
        background: `${tech.fallbackColor || '#d4af37'}18`,
        color: tech.fallbackColor || '#d4af37',
        border: `1px solid ${tech.fallbackColor || '#d4af37'}30`,
      }}
    >
      {tech.name.slice(0, 2).toUpperCase()}
    </div>
  )
}

export default function TechStack() {
  return (
    <section id="tech" className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }} viewport={{ once: true }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#d4af37]/20 bg-[#d4af37]/5 text-[#d4af37] text-xs font-medium mb-4">
            Tech Stack
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-[#f0eed5] mb-4">
            Built With <span className="text-[#d4af37]">Best-in-Class</span> Tools
          </h2>
          <p className="text-[#7a7760] max-w-xl mx-auto">
            From data ingestion to PDF export — every layer of the stack is production-ready.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {STACK.map((tech, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              viewport={{ once: true }}
              whileHover={{ y: -3, transition: { duration: 0.15 } }}
              className="bg-[#0f0e06] border border-[#2a2800] rounded-xl p-4 hover:border-[#d4af37]/30 transition-colors cursor-default"
            >
              <LogoBadge tech={tech} />
              <div className="font-semibold text-sm text-[#f0eed5] mb-0.5">{tech.name}</div>
              <div className="text-xs text-[#7a7760]">{tech.role}</div>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }} viewport={{ once: true }}
          className="text-center text-[#4a4830] text-xs mt-10"
        >
          Full source code available on GitHub · MIT License
        </motion.p>
      </div>
    </section>
  )
}
