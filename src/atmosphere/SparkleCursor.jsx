import { useEffect, useRef } from 'react'

const MAX = 80
const LIFE = 600
const COLORS = ['255,255,255', '255,42,60', '47,107,255']

// Pointer-only sparkle trail drawn on a fixed canvas. The loop runs only while particles exist.
export default function SparkleCursor() {
  const ref = useRef(null)

  useEffect(() => {
    const mq = window.matchMedia('(hover: none), (pointer: coarse)')
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches || rm.matches) return
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const parts = []
    let raf = 0
    let last = null
    let w = 0
    let h = 0

    const resize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    resize()

    const frame = (now) => {
      ctx.clearRect(0, 0, w, h)
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]
        const t = (now - p.born) / LIFE
        if (t >= 1) {
          parts.splice(i, 1)
          continue
        }
        const a = 1 - t
        const x = p.x + p.vx * t
        const y = p.y + p.vy * t + 14 * t * t
        const r = p.r * (1 - t * 0.5)
        ctx.fillStyle = `rgba(${p.c},${a})`
        ctx.shadowColor = `rgba(${p.c},${a})`
        ctx.shadowBlur = 8
        ctx.beginPath()
        ctx.moveTo(x, y - r * 2)
        ctx.lineTo(x + r * 0.5, y - r * 0.5)
        ctx.lineTo(x + r * 2, y)
        ctx.lineTo(x + r * 0.5, y + r * 0.5)
        ctx.lineTo(x, y + r * 2)
        ctx.lineTo(x - r * 0.5, y + r * 0.5)
        ctx.lineTo(x - r * 2, y)
        ctx.lineTo(x - r * 0.5, y - r * 0.5)
        ctx.closePath()
        ctx.fill()
      }
      raf = parts.length ? requestAnimationFrame(frame) : 0
      if (!raf) ctx.clearRect(0, 0, w, h)
    }

    const onMove = (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return
      if (last && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 10) return
      last = { x: e.clientX, y: e.clientY }
      const now = performance.now()
      const n = Math.random() < 0.5 ? 2 : 1
      for (let i = 0; i < n; i++) {
        if (parts.length >= MAX) parts.shift()
        parts.push({
          x: e.clientX + (Math.random() - 0.5) * 8,
          y: e.clientY + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 30,
          vy: (Math.random() - 0.5) * 20,
          r: 1 + Math.random() * 1.6,
          c: COLORS[(Math.random() * COLORS.length) | 0],
          born: now,
        })
      }
      if (!raf) raf = requestAnimationFrame(frame)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[90] h-full w-full"
    />
  )
}
