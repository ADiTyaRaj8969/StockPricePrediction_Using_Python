import { useRef } from 'react'

export default function SpotlightCard({ children, className = '', color = 'rgba(212,175,55,0.13)' }) {
  const ref = useRef(null)

  const onMove = (e) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    ref.current.style.setProperty('--x', `${e.clientX - rect.left}px`)
    ref.current.style.setProperty('--y', `${e.clientY - rect.top}px`)
    ref.current.style.setProperty('--spot-color', color)
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={`spotlight-card ${className}`}
    >
      {children}
    </div>
  )
}
