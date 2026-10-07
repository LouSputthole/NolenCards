import { Component, Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { preload } from '../sfx.js'
import { MotionConfig, motion } from 'framer-motion'
import { promo, shop } from '../content.js'

// three.js is the heaviest thing on the page: load the canvas + scene as their own chunks
// so the rest of the site renders without waiting on them.
const loadScene = () => import('../three/PackOpening.jsx')
const Canvas = lazy(() => import('@react-three/fiber').then((m) => ({ default: m.Canvas })))
const PackOpening = lazy(loadScene)

const EASE = [0.22, 1, 0.36, 1]
const DPR = [1, 1.5]
const CAMERA = { position: [0, 0, 9], fov: 35, near: 0.1, far: 60 }
const GL = { antialias: true, alpha: true, powerPreference: 'high-performance' }

const BACKDROP = [
  'radial-gradient(55% 45% at 15% 28%, rgba(255,42,60,0.17), transparent 70%)',
  'radial-gradient(55% 45% at 85% 72%, rgba(47,107,255,0.2), transparent 70%)',
  'radial-gradient(35% 22% at 50% 80%, rgba(238,242,255,0.06), transparent 70%)',
  'repeating-linear-gradient(90deg, rgba(255,255,255,0.025) 0 2px, transparent 2px 72px)',
  'linear-gradient(180deg, #07070b 0%, #0b0b14 55%, #07070b 100%)',
].join(', ')

function matches(query) {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches
}

function sameRect(a, b) {
  return (
    !!a &&
    Math.abs(a.x - b.x) < 0.002 &&
    Math.abs(a.y - b.y) < 0.002 &&
    Math.abs(a.w - b.w) < 0.002 &&
    Math.abs(a.h - b.h) < 0.002
  )
}

// If WebGL is unavailable (or the chunk fails to load) drop the 3D and hand over the code directly.
class SceneBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.warn('Hero: 3D pack unavailable, showing the code without it.', error)
    this.props.onFail?.()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

function OpenPrompt({ opened, isTouch, onOpen, onSkip }) {
  return (
    <div className="flex flex-col items-center gap-2 pt-2 text-center">
      <motion.button
        type="button"
        onClick={onOpen}
        disabled={opened}
        animate={{ opacity: opened ? 0 : 1, y: opened ? 10 : 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="pointer-events-auto flex flex-col items-center rounded-2xl px-5 py-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neon-blue disabled:pointer-events-none"
      >
        <span className="flex items-center gap-3 font-display text-2xl tracking-[0.14em] text-snow md:text-3xl">
          <span className="relative flex size-2.5" aria-hidden="true">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-neon-red opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-neon-red" />
          </span>
          {isTouch ? 'Tap to open' : 'Click the pack to open it'}
        </span>
        <span className="mt-1 text-sm text-fog">There&rsquo;s a {promo.percent}% off card inside.</span>
      </motion.button>
      <button
        type="button"
        onClick={onSkip}
        className="pointer-events-auto rounded-full border border-line bg-ink/60 px-4 py-1.5 text-xs uppercase tracking-[0.28em] text-fog backdrop-blur-sm transition-colors hover:border-snow/30 hover:text-snow focus-visible:outline-2 focus-visible:outline-neon-blue"
      >
        Skip<span className="sr-only"> the pack opening and show the code</span>
        <span aria-hidden="true"> &rarr;</span>
      </button>
    </div>
  )
}

function PromoPanel({ visible }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return undefined
    const id = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(id)
  }, [copied])

  const copy = () => {
    navigator.clipboard?.writeText(promo.code).then(
      () => setCopied(true),
      () => {},
    )
  }

  return (
    <motion.div
      initial={false}
      animate={visible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 24, scale: 0.97 }}
      transition={{ duration: 0.7, ease: EASE }}
      inert={!visible}
      className="pointer-events-auto mx-auto w-full max-w-md shrink-0 rounded-3xl border border-gold/25 bg-ink-2/75 p-4 text-left shadow-[0_0_70px_-12px_rgba(255,209,102,0.35)] backdrop-blur-md sm:p-5 md:p-7 md:landscape:mx-0 md:landscape:w-[26rem]"
    >
      <p className="font-script text-lg text-gold md:text-xl">Nice pull!</p>
      <p className="mt-1 font-display text-5xl leading-none tracking-wide text-gold [text-shadow:0_0_24px_rgba(255,209,102,0.45)] md:text-7xl">
        {promo.percent}% OFF
      </p>
      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-dashed border-gold/50 bg-ink/70 py-3 pr-3 pl-4 md:mt-4">
        <code className="min-w-0 flex-1 font-mono text-3xl font-bold tracking-[0.12em] text-snow md:text-4xl">
          {promo.code}
        </code>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-full border border-line px-3 py-1.5 text-xs uppercase tracking-widest text-fog transition-colors hover:border-gold/60 hover:text-gold focus-visible:outline-2 focus-visible:outline-gold"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-fog md:mt-4">{promo.terms}</p>
      <a
        href="#categories"
        className="mt-4 md:mt-5 inline-flex items-center gap-2 rounded-full bg-snow px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        Shop what we carry <span aria-hidden="true">&darr;</span>
      </a>
    </motion.div>
  )
}

export default function Hero({ onRevealed }) {
  const [reducedMotion] = useState(() => matches('(prefers-reduced-motion: reduce)'))
  const [isTouch] = useState(() => matches('(hover: none) and (pointer: coarse)'))
  const [opened, setOpened] = useState(reducedMotion)
  const [skipped, setSkipped] = useState(false)
  // `focused` switches to the reveal layout (panel in flow) a beat before the code is shown,
  // so the gold card can fly to the right spot.
  const [focused, setFocused] = useState(reducedMotion)
  const [revealed, setRevealed] = useState(reducedMotion)
  const [inView, setInView] = useState(true)
  const [rects, setRects] = useState({ idle: null, reveal: null })
  const sectionRef = useRef(null)
  const stageRef = useRef(null)
  const announced = useRef(false)
  const onRevealedRef = useRef(onRevealed)

  useEffect(() => {
    onRevealedRef.current = onRevealed
  }, [onRevealed])

  const reveal = useCallback(() => {
    setOpened(true)
    setFocused(true)
    setRevealed(true)
    if (!announced.current) {
      announced.current = true
      onRevealedRef.current?.()
    }
  }, [])

  const handleOpen = useCallback(() => setOpened(true), [])
  const handlePhase = useCallback((phase) => {
    if (phase === 'focus') setFocused(true)
  }, [])
  const skip = () => {
    setSkipped(true)
    reveal()
  }

  // Reduced motion: state already starts revealed (no animation); just tell the page once.
  useEffect(() => {
    if (reducedMotion && !announced.current) {
      announced.current = true
      onRevealedRef.current?.()
    }
  }, [reducedMotion])

  // Start fetching the scene chunk in parallel with the canvas chunk; warm the sound pool too.
  useEffect(() => {
    preload()
    loadScene().catch(() => {})
  }, [])

  // Stop rendering the WebGL scene while the hero is scrolled out of view.
  useEffect(() => {
    const el = sectionRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: '120px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Measure the empty "stage" box so the 3D pack / gold card sit in the space the HTML leaves free.
  const mode = focused ? 'reveal' : 'idle'
  useLayoutEffect(() => {
    const section = sectionRef.current
    const stage = stageRef.current
    if (!section || !stage) return undefined
    const measure = () => {
      const a = section.getBoundingClientRect()
      const b = stage.getBoundingClientRect()
      if (!a.width || !a.height) return
      const r = {
        x: (b.left - a.left) / a.width,
        y: (b.top - a.top) / a.height,
        w: b.width / a.width,
        h: b.height / a.height,
      }
      setRects((prev) => (sameRect(prev[mode], r) ? prev : { ...prev, [mode]: r }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(section)
    ro.observe(stage)
    return () => ro.disconnect()
  }, [mode])

  return (
    <MotionConfig reducedMotion="user">
      <section
        ref={sectionRef}
        id="hero"
        aria-label={`${shop.name}: open a pack`}
        className="relative isolate flex min-h-screen flex-col overflow-hidden"
        style={{ minHeight: '100svh', background: BACKDROP }}
      >
        <div className="absolute inset-0" aria-hidden="true">
          <SceneBoundary onFail={reveal}>
            <Suspense fallback={null}>
              <Canvas dpr={DPR} camera={CAMERA} gl={GL} frameloop={inView ? 'always' : 'never'}>
                <Suspense fallback={null}>
                  <PackOpening
                    open={opened}
                    autoReveal={reducedMotion || skipped}
                    layout={rects}
                    onOpen={handleOpen}
                    onPhase={handlePhase}
                    onRevealed={reveal}
                  />
                </Suspense>
              </Canvas>
            </Suspense>
          </SceneBoundary>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-linear-to-b from-transparent to-ink"
        />

        <div className="pointer-events-none relative z-10 flex flex-1 flex-col px-4 pt-24 pb-6 sm:px-6 md:pt-28 md:pb-10">
          <motion.header
            className="mx-auto max-w-4xl text-center"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE }}
          >
            <p className="font-script text-lg neon-red md:text-2xl">{shop.city}</p>
            <h1 className="mt-1 font-display text-[clamp(3.25rem,12vw,8.5rem)] leading-[0.85] tracking-[0.02em] neon-white">
              {shop.name}
            </h1>
            <p className="mx-auto mt-4 max-w-md text-base text-balance text-fog md:text-lg">{shop.tagline}</p>
          </motion.header>

          <div
            className={
              focused
                ? 'flex flex-1 flex-col gap-4 md:landscape:mx-auto md:landscape:w-full md:landscape:max-w-6xl md:landscape:flex-row md:landscape:items-center md:landscape:gap-12'
                : 'flex flex-1 flex-col'
            }
          >
            <div ref={stageRef} className="min-h-[34vh] flex-1 md:landscape:self-stretch" />
            {focused ? (
              <PromoPanel visible={revealed} />
            ) : (
              <OpenPrompt opened={opened} isTouch={isTouch} onOpen={handleOpen} onSkip={skip} />
            )}
          </div>
        </div>

        <p className="sr-only" aria-live="polite">
          {revealed ? `Unlocked ${promo.percent}% off. Your code is ${promo.code}. ${promo.terms}` : ''}
        </p>
      </section>
    </MotionConfig>
  )
}
