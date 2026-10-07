import { motion, useScroll, useSpring } from 'framer-motion'

export default function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 220, damping: 32, mass: 0.4 })
  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX }}
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-neon-red to-neon-blue shadow-[0_0_8px_rgba(255,42,60,0.6)]"
    />
  )
}
