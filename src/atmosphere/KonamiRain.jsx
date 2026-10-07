import { useEffect, useMemo, useState } from 'react'

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
const WORD = 'pcc'
const COUNT = 60
const SKINS = [
  'linear-gradient(135deg,#ff2a3c,#a3101e)',
  'linear-gradient(135deg,#2f6bff,#173c9e)',
  'linear-gradient(135deg,#ffd166,#e0a02a)',
  'linear-gradient(120deg,#ff2a3c,#ffd166,#4dffb4,#2f6bff,#c24dff)',
]

function makeCards() {
  return Array.from({ length: COUNT }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 1.6,
    dur: 1.8 + Math.random() * 1.4,
    rot: (Math.random() < 0.5 ? -1 : 1) * (240 + Math.random() * 480),
    w: 14 + Math.random() * 10,
    skin: SKINS[i % SKINS.length],
  }))
}

// Easter egg: Konami code or typing "pcc" rains tiny cards for ~4s. Invisible otherwise.
export default function KonamiRain() {
  const [run, setRun] = useState(0)
  const cards = useMemo(() => (run ? makeCards() : []), [run])

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let seq = []
    let typed = ''
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target
      if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      const single = e.key.length === 1
      const k = single ? e.key.toLowerCase() : e.key
      seq = [...seq, k].slice(-KONAMI.length)
      typed = single ? (typed + k).slice(-WORD.length) : ''
      if (seq.join() === KONAMI.join() || typed === WORD) {
        seq = []
        typed = ''
        if (!reduced.matches) setRun((n) => n + 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!run) return
    const t = setTimeout(() => setRun(0), 4600)
    return () => clearTimeout(t)
  }, [run])

  if (!run) return null
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      {cards.map((c) => (
        <span
          key={`${run}-${c.id}`}
          className="atm-rain-card absolute top-0 rounded-[2px] shadow-[0_0_8px_rgba(255,255,255,0.35)]"
          style={{
            left: `${c.left}%`,
            width: c.w,
            height: c.w * 1.4,
            background: c.skin,
            animationDelay: `${c.delay}s`,
            animationDuration: `${c.dur}s`,
            '--atm-rot': `${c.rot}deg`,
          }}
        />
      ))}
    </div>
  )
}
