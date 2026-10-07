// Tiny canvas confetti, no deps. Puts a click-through fixed canvas over the page, bursts
// paper bits from a viewport point, then removes itself. Returns a cancel function.
const GRAVITY = 1400 // px/s²
const DRAG = 1.6 // per second

export function confetti({ x, y, colors = ['#ff2a3c', '#2f6bff', '#ffd166', '#ffffff'], count = 140, duration = 2600 } = {}) {
  if (typeof document === 'undefined') return () => {}
  const canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: '60' })
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = window.innerWidth
  const h = window.innerHeight
  canvas.width = w * dpr
  canvas.height = h * dpr
  document.body.appendChild(canvas)

  const ox = x ?? w / 2
  const oy = y ?? h / 2
  const bits = Array.from({ length: count }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1
    const speed = 420 + Math.random() * 760
    return {
      x: ox, y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      w: 6 + Math.random() * 7,
      h: 3 + Math.random() * 5,
      spin: (Math.random() - 0.5) * 18,
      rot: Math.random() * Math.PI,
      wobble: Math.random() * Math.PI * 2,
      color: colors[(Math.random() * colors.length) | 0],
    }
  })

  let raf = 0
  let last = performance.now()
  const start = last
  const stop = () => {
    cancelAnimationFrame(raf)
    canvas.remove()
  }
  const frame = (now) => {
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    const life = (now - start) / duration
    if (life >= 1) return stop()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    ctx.globalAlpha = life < 0.7 ? 1 : 1 - (life - 0.7) / 0.3
    for (const b of bits) {
      b.vx -= b.vx * DRAG * dt
      b.vy += (GRAVITY - b.vy * DRAG) * dt
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.rot += b.spin * dt
      b.wobble += 10 * dt
      ctx.save()
      ctx.translate(b.x, b.y)
      ctx.rotate(b.rot)
      ctx.scale(1, Math.cos(b.wobble)) // paper flutter
      ctx.fillStyle = b.color
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h)
      ctx.restore()
    }
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)
  return stop
}
