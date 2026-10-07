import { Component, Suspense, lazy, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  RARITIES,
  RARITY_BY_ID,
  bestCard,
  hitChance,
  isHit,
  oddsText,
  packHitChance,
  rankOf,
  rollPack,
} from '../riplab/rarity.js'
import { confetti } from '../riplab/confetti.js'
import { play } from '../sfx.js'

// three.js only loads once the viewer scrolls into view (and shares the hero's fiber chunk).
const HoloCard = lazy(() => import('../three/HoloCard.jsx'))

const EASE = [0.22, 1, 0.36, 1]
const FLIP_GAP = 0.2 // s between cards turning over
const FLIP_TIME = 0.6
const BANNER_MS = 2600
const STORE_KEY = 'pcc-riplab-v1'
const SLOTS = [0, 1, 2, 3, 4]
const EMPTY_TALLY = { packs: 0, cards: 0, hits: 0, golds: 0, best: null }
// Shown in the viewer before the first rip.
const DEMO_CARD = { name: 'Tri-Star Rookie', rarity: 'holo', hue: 214 }

const CONFETTI = {
  holo: ['#ff2a3c', '#ffd166', '#3dff9a', '#2f6bff', '#c04bff', '#ffffff'],
  gold: ['#ffd166', '#fff3c4', '#ffb347', '#ffe9a8', '#ffffff'],
}

const VIEWER_BG = [
  'radial-gradient(60% 45% at 18% 20%, rgba(255,42,60,0.18), transparent 70%)',
  'radial-gradient(60% 45% at 82% 80%, rgba(47,107,255,0.22), transparent 70%)',
  'repeating-linear-gradient(90deg, rgba(255,255,255,0.025) 0 2px, transparent 2px 64px)',
  'linear-gradient(180deg, #0f0f16, #07070b)',
].join(', ')

/* ------------------------------------------------------------------ */
/* Tally persistence                                                   */
/* ------------------------------------------------------------------ */

const count = (v) => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0)

function loadTally() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORE_KEY))
    if (!raw || typeof raw !== 'object') return EMPTY_TALLY
    const b = raw.best
    const best =
      b && RARITY_BY_ID[b.rarity] && typeof b.name === 'string'
        ? { name: b.name.slice(0, 60), rarity: b.rarity, hue: count(b.hue) % 360 }
        : null
    const tally = { packs: count(raw.packs), cards: count(raw.cards), hits: count(raw.hits), golds: count(raw.golds), best }
    tally.hits = Math.min(tally.hits, tally.cards)
    return tally
  } catch {
    return EMPTY_TALLY
  }
}

function saveTally(tally) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(tally))
  } catch {
    // Private mode / storage blocked: the tally just lasts for this visit.
  }
}

/* ------------------------------------------------------------------ */
/* 2D cards                                                            */
/* ------------------------------------------------------------------ */

const gradient = (stops) => `linear-gradient(140deg, ${stops.join(', ')})`

function glowOf(rarity) {
  if (rarity === 'gold') return '0 0 26px rgba(255,209,102,0.6), 0 0 60px rgba(255,176,0,0.25)'
  if (rarity === 'holo') return '0 0 24px rgba(192,75,255,0.5), 0 0 48px rgba(47,107,255,0.25)'
  if (rarity === 'rare') return '0 0 20px rgba(255,42,60,0.45)'
  if (rarity === 'uncommon') return '0 0 16px rgba(47,107,255,0.35)'
  return 'none'
}

function Skyline({ color }) {
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="absolute inset-x-0 bottom-[18%] h-[46%] w-full" aria-hidden="true">
      <path
        fill={color}
        style={{ filter: `drop-shadow(0 0 3px ${color})` }}
        d="M2 40V27h7v13zM9 40V17h6v23zM16 40V22h8v18zM25 40V12l3-5 3 5v28zM32 40V20h7v20zM40 40V15h5v25zM46 40V6l1.5-5L49 6h7l1.5-5L59 6v34zM60 40V18h6v22zM67 40V10h9v30zM77 40V24h6v16zM84 40V14l4-5 4 5v26zM93 40V25h6v15z"
      />
      <rect x="0" y="39" width="100" height="1" fill={color} />
    </svg>
  )
}

function Sheen({ rarity, reduced }) {
  const holo = rarity === 'holo'
  const layer = holo
    ? 'linear-gradient(115deg, transparent 18%, rgba(255,42,60,0.55) 28%, rgba(255,209,102,0.55) 36%, rgba(61,255,154,0.5) 44%, rgba(47,107,255,0.55) 52%, rgba(192,75,255,0.55) 60%, transparent 72%)'
    : 'linear-gradient(115deg, transparent 30%, rgba(255,243,196,0.75) 45%, rgba(255,209,102,0.35) 50%, transparent 62%)'
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" style={{ mixBlendMode: 'color-dodge' }}>
      <motion.div
        className="absolute inset-y-0 left-0 w-[300%]"
        style={{ background: layer, opacity: holo ? 0.6 : 0.5 }}
        initial={false}
        animate={reduced ? { x: '-33%' } : { x: ['-66%', '0%'] }}
        transition={reduced ? { duration: 0 } : { duration: 3.2, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
      />
      {holo && (
        <div
          className="absolute inset-0"
          style={{ background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.12) 0 1px, transparent 1px 4px)' }}
        />
      )}
    </div>
  )
}

/** Front of a 2D card. Fills its (aspect 5:7) parent; text scales with the card via cq units. */
function CardFront({ card, reduced }) {
  const tier = RARITY_BY_ID[card.rarity]
  const gold = card.rarity === 'gold'
  const art = `radial-gradient(70% 55% at 50% 72%, hsl(${card.hue} 95% 58% / 0.5), transparent 70%), linear-gradient(180deg, hsl(${card.hue} ${tier.sat}% 12%), hsl(${card.hue} ${tier.sat}% 28%) 66%, hsl(${card.hue} ${tier.sat}% 7%) 67%)`
  return (
    <div
      className="@container absolute inset-0 rounded-[9%/6.5%] p-[4.5%]"
      style={{ background: gradient(tier.frame), boxShadow: glowOf(card.rarity) }}
    >
      <div className={`relative flex h-full flex-col overflow-hidden rounded-[6%/4.3%] ${gold ? 'bg-[#140e04]' : 'bg-ink-2'}`}>
        <p
          className="truncate px-[7%] pt-[7%] text-[7.5cqw] font-semibold uppercase leading-none tracking-[0.12em]"
          style={{ color: tier.accent }}
        >
          {tier.label}
        </p>
        <div className="relative mx-[6%] mt-[5%] flex-1 overflow-hidden rounded-[4cqw] border border-white/40" style={{ background: art }}>
          <Skyline color={gold ? '#ffd166' : '#ff2a3c'} />
        </div>
        <p
          className={`line-clamp-2 px-[7%] pt-[6%] pb-[8%] font-display text-[13cqw] leading-[0.95] tracking-wide ${gold ? 'text-gold' : 'text-snow'}`}
        >
          {card.name}
        </p>
        {(card.rarity === 'holo' || gold) && <Sheen rarity={card.rarity} reduced={reduced} />}
      </div>
    </div>
  )
}

function CardBack() {
  return (
    <div className="@container absolute inset-0 rounded-[9%/6.5%] bg-[linear-gradient(140deg,#ff2a3c,#2f6bff)] p-[4%] shadow-[0_0_14px_rgba(255,42,60,0.25)]">
      <div className="relative grid h-full place-items-center overflow-hidden rounded-[6%/4.3%] bg-[radial-gradient(circle_at_50%_50%,#231a52,#0f0c26_60%,#07070b)]">
        <div className="absolute aspect-square w-[78%] rounded-full border-[length:1.5cqw] border-white/80 shadow-[0_0_12px_rgba(255,255,255,0.5)]" />
        <span className="relative -rotate-6 font-script text-[14cqw] neon-white">PrettyCool</span>
      </div>
    </div>
  )
}

/** One slot in the results row: face-down until a pack is ripped, then flips in. */
function ResultCard({ card, index, selected, reduced, onSelect, slotRef }) {
  const tier = RARITY_BY_ID[card.rarity]
  return (
    <li ref={slotRef} className="list-none">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`${card.name}, ${tier.label}. Show in the card viewer`}
        className={`group relative block aspect-[5/7] w-full rounded-[9%/6.5%] outline-none transition-transform duration-200 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-snow focus-visible:ring-offset-4 focus-visible:ring-offset-ink ${
          selected ? 'ring-2 ring-snow/90 ring-offset-4 ring-offset-ink' : ''
        }`}
        style={{ perspective: 900 }}
      >
        <motion.div
          className="absolute inset-0"
          style={{ transformStyle: 'preserve-3d' }}
          initial={reduced ? false : { rotateY: 180, y: 0 }}
          animate={{ rotateY: 0, y: isHit(card) && !reduced ? [0, -10, 0] : 0 }}
          transition={{
            rotateY: { delay: index * FLIP_GAP, duration: FLIP_TIME, ease: EASE },
            y: { delay: index * FLIP_GAP + FLIP_TIME * 0.7, duration: 0.5, ease: EASE },
          }}
        >
          <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
            <CardFront card={card} reduced={reduced} />
          </div>
          <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            <CardBack />
          </div>
        </motion.div>
      </button>
    </li>
  )
}

/* ------------------------------------------------------------------ */
/* Viewer                                                              */
/* ------------------------------------------------------------------ */

// No WebGL (or the chunk failed): fall back to the flat card.
class ViewerBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.warn('Rip Lab: 3D card viewer unavailable, showing a flat card.', error)
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function FlatCard({ card, reduced }) {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="relative aspect-[5/7] w-[min(58%,15rem)]">
        <CardFront card={card} reduced={reduced} />
      </div>
    </div>
  )
}

function useInView(ref, rootMargin) {
  // Without IntersectionObserver, just mount straight away.
  const [state, setState] = useState(() =>
    typeof IntersectionObserver === 'undefined' ? { seen: true, visible: true } : { seen: false, visible: false },
  )
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(
      ([entry]) => setState((s) => ({ seen: s.seen || entry.isIntersecting, visible: entry.isIntersecting })),
      { rootMargin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, rootMargin])
  return state
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export default function RipLab() {
  const reduced = !!useReducedMotion()
  const [pack, setPack] = useState(null) // { id, cards }
  const [selected, setSelected] = useState(-1)
  const [viewerCard, setViewerCard] = useState(null)
  const [tally, setTally] = useState(loadTally)
  const [banner, setBanner] = useState(null) // { id, rarity }
  const [announcement, setAnnouncement] = useState('')

  const resultsRef = useRef(null)
  const viewerRef = useRef(null)
  const slotRefs = useRef([])
  const timers = useRef([])
  const stopConfetti = useRef(null)
  const { seen, visible } = useInView(viewerRef, '200px')

  useEffect(() => saveTally(tally), [tally])

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout)
      stopConfetti.current?.()
    },
    [],
  )

  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms))

  const celebrate = (card, index, id) => {
    play('shimmer')
    play('confetti', { volume: 0.8 })
    setBanner({ id, rarity: card.rarity })
    later(() => setBanner((b) => (b?.id === id ? null : b)), BANNER_MS)
    if (reduced) return
    const el = slotRefs.current[index] ?? resultsRef.current
    const r = el?.getBoundingClientRect()
    stopConfetti.current?.()
    stopConfetti.current = confetti({
      x: r ? r.left + r.width / 2 : undefined,
      y: r ? r.top + r.height / 2 : undefined,
      colors: CONFETTI[card.rarity],
      count: card.rarity === 'gold' ? 200 : 140,
    })
  }

  const rip = () => {
    play('rip')
    timers.current.forEach(clearTimeout)
    timers.current = []
    setBanner(null)

    const cards = rollPack()
    const best = bestCard(cards)
    const bestIndex = cards.indexOf(best)
    const id = (pack?.id ?? 0) + 1

    setPack({ id, cards })
    setSelected(bestIndex)
    setViewerCard(best)
    setTally((t) => ({
      packs: t.packs + 1,
      cards: t.cards + cards.length,
      hits: t.hits + cards.filter(isHit).length,
      golds: t.golds + cards.filter((c) => c.rarity === 'gold').length,
      best: rankOf(best) > rankOf(t.best) ? best : t.best,
    }))

    const list = cards.map((c) => `${c.name} (${RARITY_BY_ID[c.rarity].label})`).join(', ')
    const hit = isHit(best) ? ` ${RARITY_BY_ID[best.rarity].label} hit!` : ''
    setAnnouncement(`Pack ${id}. You pulled: ${list}.${hit}`)

    if (isHit(best)) {
      // Fire as the hit card finishes turning over.
      const delay = reduced ? 0 : (bestIndex * FLIP_GAP + FLIP_TIME * 0.75) * 1000
      later(() => celebrate(best, bestIndex, id), delay)
    }
  }

  const select = (index) => {
    setSelected(index)
    setViewerCard(pack.cards[index])
    // On phones the viewer sits below the results; bring it on screen if it isn't.
    viewerRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' })
  }

  const resetTally = () => setTally(EMPTY_TALLY)

  const shown = viewerCard ?? tally.best ?? DEMO_CARD
  const shownTier = RARITY_BY_ID[shown.rarity]
  const viewerNote = viewerCard
    ? selected === pack?.cards.indexOf(bestCard(pack.cards))
      ? `Best pull from pack #${pack.id}`
      : `From pack #${pack.id}`
    : tally.best
      ? 'Your best pull so far'
      : 'Sample card. Rip a pack to load yours.'

  return (
    <section id="riplab" aria-labelledby="riplab-title" className="section">
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        <p className="font-script text-2xl text-neon-red">Feeling lucky?</p>
        <h2 id="riplab-title" className="mt-2 font-display text-6xl leading-[0.9] tracking-tight text-snow sm:text-8xl">
          Rip <span className="neon-red">Lab</span>
        </h2>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-fog">
          Five cards a pack, real odds, one shiny chase: the{' '}
          <span className="text-gold">Pretty Cool Gold</span>. Rip as many as you like. It&rsquo;s free, and the
          real thing is waiting at the counter.
        </p>
      </motion.div>

      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-12">
        {/* ---- controls, results, tally ---- */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
            <motion.button
              type="button"
              onClick={rip}
              whileTap={reduced ? undefined : { scale: 0.96 }}
              className="inline-flex items-center gap-3 rounded-full bg-neon-red px-8 py-4 font-display text-3xl tracking-[0.12em] text-white shadow-[0_0_22px_rgba(255,42,60,0.6),0_0_64px_rgba(255,42,60,0.3)] transition-shadow hover:shadow-[0_0_30px_rgba(255,42,60,0.85),0_0_90px_rgba(255,42,60,0.45)] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-snow sm:text-4xl"
            >
              <span className="relative flex size-2.5" aria-hidden="true">
                {!pack && <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75" />}
                <span className="relative inline-flex size-2.5 rounded-full bg-white" />
              </span>
              {pack ? 'Rip another' : 'Rip a pack'}
            </motion.button>
            <p className="text-sm text-fog">
              {pack ? (
                <>
                  Pack <span className="font-semibold text-snow">#{pack.id}</span> this visit. Tap a card to inspect it.
                </>
              ) : (
                'Your five cards land below.'
              )}
            </p>
          </div>

          <div ref={resultsRef} className="relative mt-8">
            <ul className="m-0 grid grid-cols-3 gap-3 p-0 sm:grid-cols-5 sm:gap-4" aria-label="Cards in this pack">
              {pack
                ? pack.cards.map((card, i) => (
                    <ResultCard
                      key={`${pack.id}-${i}`}
                      card={card}
                      index={i}
                      selected={selected === i}
                      reduced={reduced}
                      onSelect={() => select(i)}
                      slotRef={(el) => {
                        slotRefs.current[i] = el
                      }}
                    />
                  ))
                : SLOTS.map((i) => (
                    <li key={i} className="relative aspect-[5/7] list-none opacity-60" aria-hidden="true">
                      <CardBack />
                    </li>
                  ))}
            </ul>

            <AnimatePresence>
              {banner && (
                <motion.div
                  key={banner.id}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-10 grid place-items-center"
                  initial={reduced ? false : { opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 1.08 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                >
                  <div className="-rotate-3 rounded-2xl bg-ink/75 px-6 py-3 backdrop-blur-sm">
                    <p
                      className={`text-center font-display text-[clamp(2.75rem,11vw,6rem)] leading-none tracking-wide text-balance ${
                        banner.rarity === 'gold'
                          ? 'text-[#fff6dd] [text-shadow:0_0_6px_#fff,0_0_18px_#ffd166,0_0_44px_#ffb000]'
                          : 'bg-[linear-gradient(100deg,#ff2a3c,#ffd166,#3dff9a,#2f6bff,#c04bff)] bg-clip-text text-transparent [filter:drop-shadow(0_0_10px_rgba(255,255,255,0.45))_drop-shadow(0_0_26px_rgba(192,75,255,0.7))]'
                      }`}
                    >
                      {banner.rarity === 'gold' ? 'Pretty Cool Gold!' : 'Holo!'}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className="sr-only" aria-live="polite">
            {announcement}
          </p>

          {/* ---- session tally ---- */}
          <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
            <div className="bg-ink-2 p-5">
              <dt className="text-xs uppercase tracking-[0.2em] text-fog">Packs ripped</dt>
              <dd className="mt-2 font-display text-5xl leading-none text-snow">{tally.packs}</dd>
            </div>
            <div className="bg-ink-2 p-5">
              <dt className="text-xs uppercase tracking-[0.2em] text-fog">Your hit rate</dt>
              <dd className="mt-2 font-display text-5xl leading-none text-snow">
                {tally.hits ? oddsText(tally.hits / tally.cards) : '—'}
              </dd>
              <dd className="mt-2 text-xs leading-snug text-fog">
                {tally.hits ? `cards were holo or better (${tally.hits} of ${tally.cards})` : 'No holo or better yet'}
              </dd>
            </div>
            <div className="col-span-2 bg-ink-2 p-5 sm:col-span-1">
              <dt className="text-xs uppercase tracking-[0.2em] text-fog">Best pull</dt>
              <dd className="mt-2 font-display text-3xl leading-none text-snow">{tally.best ? tally.best.name : '—'}</dd>
              {tally.best && (
                <dd className="mt-2 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: RARITY_BY_ID[tally.best.rarity].accent }}>
                  {RARITY_BY_ID[tally.best.rarity].label}
                </dd>
              )}
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-fog">Odds per card</p>
              <ul className="m-0 mt-2 flex flex-wrap gap-2 p-0">
                {RARITIES.map((r) => (
                  <li
                    key={r.id}
                    className="inline-flex list-none items-center gap-2 rounded-full border border-line bg-ink-2 px-3 py-1 text-xs text-snow"
                  >
                    <span aria-hidden="true" className="size-2 rounded-full" style={{ background: r.accent, boxShadow: `0 0 8px ${r.accent}` }} />
                    {r.label} <span className="text-fog">{r.weight}%</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-fog">
                Holo or better: {oddsText(hitChance)} cards, about {oddsText(packHitChance)} packs.
              </p>
            </div>
            {tally.packs > 0 && (
              <button
                type="button"
                onClick={resetTally}
                className="rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-fog underline-offset-4 transition-colors hover:text-snow hover:underline focus-visible:outline-2 focus-visible:outline-neon-blue"
              >
                Reset tally
              </button>
            )}
          </div>
        </div>

        {/* ---- 3D card viewer ---- */}
        <div className="min-w-0">
          <div
            ref={viewerRef}
            className="relative h-[27rem] scroll-mt-24 overflow-hidden rounded-3xl border border-line sm:h-[32rem] lg:h-[36rem]"
            style={{ background: VIEWER_BG }}
          >
            <div className="absolute inset-0" aria-hidden="true">
              {seen && (
                <ViewerBoundary fallback={<FlatCard card={shown} reduced={reduced} />}>
                  <Suspense fallback={null}>
                    <HoloCard card={shown} active={visible} reduced={reduced} />
                  </Suspense>
                </ViewerBoundary>
              )}
            </div>
            <p className="pointer-events-none absolute top-4 left-5 font-display text-lg tracking-[0.2em] text-fog">
              Card viewer
            </p>
            <p className="pointer-events-none absolute right-5 bottom-4 text-xs uppercase tracking-[0.2em] text-fog/80">
              <span className="pointer-coarse:hidden">Drag to tilt</span>
              <span className="hidden pointer-coarse:inline">Swipe to turn</span>
            </p>
          </div>
          <div className="mt-4 flex items-baseline justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate font-display text-3xl leading-none text-snow">{shown.name}</p>
              <p className="mt-1 text-xs text-fog">{viewerNote}</p>
            </div>
            <span
              className="shrink-0 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
              style={{ color: shownTier.accent, borderColor: `${shownTier.accent}66` }}
            >
              {shownTier.label}
            </span>
          </div>
          <a
            href="#visit"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-snow underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-blue"
          >
            Real packs hit different. Come rip one in store <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </div>
    </section>
  )
}
