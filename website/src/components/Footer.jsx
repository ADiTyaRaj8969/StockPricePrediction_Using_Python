import { TrendingUp, GitBranch, ExternalLink } from 'lucide-react'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-[#2a2800] bg-[#0a0900] py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8 mb-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#d4af37]/15 border border-[#d4af37]/30 flex items-center justify-center">
                <TrendingUp size={16} className="text-[#d4af37]" />
              </div>
              <span className="font-bold text-[#f0eed5]">
                StockPredict<span className="text-[#d4af37]">ML</span>
              </span>
            </div>
            <p className="text-[#7a7760] text-sm leading-relaxed max-w-xs">
              AI-powered stock price prediction using Random Forest and LSTM. Built for learning and analysis.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-[#d4af37] font-semibold text-xs uppercase tracking-widest mb-4">Project</h4>
            <ul className="space-y-2 text-sm text-[#7a7760]">
              {[
                { label: 'Source Code',    href: 'https://github.com/ADiTyaRaj8969/StockPricePrediction_Using_Python' },
                { label: 'Random Forest',  href: '#models' },
                { label: 'LSTM Model',     href: '#models' },
                { label: 'How It Works',   href: '#about'  },
              ].map(l => (
                <li key={l.label}>
                  <a href={l.href}
                    target={l.href.startsWith('http') ? '_blank' : undefined}
                    rel="noreferrer"
                    className="hover:text-[#d4af37] transition-colors flex items-center gap-1"
                  >
                    {l.label}
                    {l.href.startsWith('http') && <ExternalLink size={11} />}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Creator */}
          <div>
            <h4 className="text-[#d4af37] font-semibold text-xs uppercase tracking-widest mb-4">Creator</h4>
            <p className="text-[#f0eed5] font-semibold mb-1">Aditya Raj</p>
            <p className="text-[#7a7760] text-sm mb-4">ML Engineer &amp; Developer</p>
            <a
              href="https://github.com/ADiTyaRaj8969"
              target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#d4af37]/30 text-[#d4af37] text-sm hover:bg-[#d4af37]/10 transition-colors"
            >
              <GitBranch size={14} />
              @ADiTyaRaj8969
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[#2a2800] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#4a4830]">
          <span>© {year} Aditya Raj · MIT License</span>
          <span>Built with React · Powered by Random Forest ML</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
            For educational purposes only — not financial advice
          </span>
        </div>
      </div>
    </footer>
  )
}
