import { useRef, useEffect } from 'react'
import { motion, useInView, useAnimation } from 'framer-motion'

export default function BlurText({
  text,
  delay      = 0.05,
  className  = '',
  animateBy  = 'words',
  direction  = 'top',
  onDone,
  as         = 'span',
}) {
  const elements = animateBy === 'words' ? text.split(' ') : text.split('')
  const ref      = useRef(null)
  const inView   = useInView(ref, { once: true, margin: '0px 0px -60px 0px' })
  const ctrl     = useAnimation()

  useEffect(() => { if (inView) ctrl.start('visible') }, [inView, ctrl])

  const variants = {
    hidden: {
      filter:  'blur(12px)',
      opacity: 0,
      y: direction === 'top' ? -20 : direction === 'bottom' ? 20 : 0,
    },
    visible: { filter: 'blur(0px)', opacity: 1, y: 0 },
  }

  const Tag = as

  return (
    <Tag ref={ref} className={className} style={{ display: 'inline' }}>
      {elements.map((el, i) => (
        <motion.span
          key={i}
          initial="hidden"
          animate={ctrl}
          variants={variants}
          transition={{ duration: 0.55, delay: i * delay, ease: 'easeOut' }}
          onAnimationComplete={i === elements.length - 1 ? onDone : undefined}
          style={{
            display: 'inline-block',
            marginRight: animateBy === 'words' ? '0.28em' : '0',
          }}
        >
          {el}
        </motion.span>
      ))}
    </Tag>
  )
}
