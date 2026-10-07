import { useEffect, useState } from 'react'

const MIN_MS = 1400
const MAX_MS = 2500
const AFTER_LOAD_MS = 600

// First-load overlay: a neon sign flickers on, then the page is revealed.
export default function NeonLoader() {
  const [phase, setPhase] = useState('show') // show -> fade -> gone

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const min = reduced ? 300 : MIN_MS
    const after = reduced ? 0 : AFTER_LOAD_MS
    const start = performance.now()
    let loadTimer
    let done = false
    const finish = () => {
      if (done) return
      done = true
      setPhase('fade')
    }
    const schedule = () => {
      const elapsed = performance.now() - start
      loadTimer = setTimeout(finish, Math.max(min - elapsed, after))
    }
    if (document.readyState === 'complete') schedule()
    else window.addEventListener('load', schedule, { once: true })
    const hardCap = setTimeout(finish, reduced ? 800 : MAX_MS)
    return () => {
      window.removeEventListener('load', schedule)
      clearTimeout(loadTimer)
      clearTimeout(hardCap)
    }
  }, [])

  useEffect(() => {
    if (phase !== 'fade') return
    const t = setTimeout(() => setPhase('gone'), 800)
    return () => clearTimeout(t)
  }, [phase])

  if (phase === 'gone') return null
  return (
    <div
      aria-hidden="true"
      className={`atm-loader pointer-events-none fixed inset-0 z-[100] grid place-items-center bg-ink px-4 ${
        phase === 'fade' ? 'atm-loader-out' : ''
      }`}
    >
      <p className="text-center font-display text-[clamp(2.75rem,11vw,7rem)] leading-none tracking-wider">
        <span className="atm-flicker-a neon-red mr-[0.3em] inline-block">PRETTY COOL</span>
        <span className="atm-flicker-b neon-blue inline-block">CARDS</span>
      </p>
    </div>
  )
}
