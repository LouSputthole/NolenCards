import { useRef } from 'react'
import { motion } from 'framer-motion'
import { categories } from '../content.js'

const MAX_TILT = 8

function Card({ item, index }) {
  const ref = useRef(null)
  const sheen = useRef(null)
  const red = item.accent === 'red'

  const onMove = (e) => {
    if (e.pointerType !== 'mouse') return
    const el = ref.current
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    el.style.transform = `perspective(900px) rotateX(${(0.5 - y) * MAX_TILT * 2}deg) rotateY(${(x - 0.5) * MAX_TILT * 2}deg) scale3d(1.02,1.02,1.02)`
    const s = sheen.current
    s.style.opacity = '0.28'
    s.style.background = `conic-gradient(from ${x * 360}deg at ${x * 100}% ${y * 100}%, #ff2a3c, #ffd166, #3dff9a, #2f6bff, #c04bff, #ff2a3c)`
  }
  const onLeave = () => {
    ref.current.style.transform = ''
    sheen.current.style.opacity = '0'
  }

  return (
    <motion.li
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: (index % 3) * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="list-none"
    >
      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        className="relative h-full overflow-hidden rounded-2xl border border-line bg-ink-2 transition-transform duration-200 ease-out will-change-transform"
      >
        <div
          aria-hidden="true"
          className={`h-1 w-full ${
            red
              ? 'bg-neon-red shadow-[0_0_18px_var(--color-neon-red)]'
              : 'bg-neon-blue shadow-[0_0_18px_var(--color-neon-blue)]'
          }`}
        />
        <div className="p-6 sm:p-7">
          <span
            aria-hidden="true"
            className="font-display text-sm tracking-[0.2em] text-fog"
          >
            {String(index + 1).padStart(2, '0')}
          </span>
          <h3 className="mt-3 font-display text-4xl leading-none tracking-tight text-snow">
            {item.title}
          </h3>
          <p className="mt-4 text-[15px] leading-relaxed text-fog">{item.blurb}</p>
        </div>
        <div
          ref={sheen}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
          style={{ mixBlendMode: 'color-dodge' }}
        />
      </div>
    </motion.li>
  )
}

export default function Categories() {
  return (
    <section id="categories" aria-labelledby="categories-title" className="section">
      <p className="font-script text-2xl text-neon-red">What we carry</p>
      <h2
        id="categories-title"
        className="mt-2 max-w-3xl font-display text-6xl leading-[0.9] tracking-tight text-snow sm:text-8xl"
      >
        Everything for the <span className="neon-white">hunt</span>
      </h2>
      <ul className="mt-12 grid grid-cols-1 gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c, i) => (
          <Card key={c.title} item={c} index={i} />
        ))}
      </ul>
    </section>
  )
}
