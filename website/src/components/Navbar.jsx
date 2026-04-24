import { useState, useEffect } from 'react'
import { Activity, Menu, X } from 'lucide-react'

const links = [
  { label: 'About',     href: '#about'     },
  { label: 'Predictor', href: '#predictor' },
  { label: 'Models',    href: '#models'    },
  { label: 'Tech',      href: '#tech'      },
]

export default function Navbar() {
  const [scrolled,  setScrolled]  = useState(false)
  const [menuOpen,  setMenuOpen]  = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${scrolled
          ? 'bg-[#080808]/85 backdrop-blur-md border-b border-[#2a2800]'
          : 'bg-transparent'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-16">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-[#d4af37]/15 border border-[#d4af37]/30 flex items-center justify-center">
            <Activity size={16} className="text-[#d4af37]" />
          </div>
          <span className="font-bold text-base text-[#f0eed5]">
            Quant<span className="text-[#d4af37]">Edge</span>
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              className="px-3 py-2 rounded-lg text-sm text-[#7a7760] hover:text-[#f0eed5] hover:bg-[#181700] transition-all"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-[#7a7760] hover:text-[#d4af37]"
          onClick={() => setMenuOpen(v => !v)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0f0e06] border-b border-[#2a2800] px-6 py-4 flex flex-col gap-2">
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="py-2 text-[#c8c4a0] hover:text-[#d4af37] transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  )
}
