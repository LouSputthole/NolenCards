// Tiny sound-effects layer. No deps. Safe to import under node (no window).
import { useSyncExternalStore } from 'react'

const NAMES = ['rip', 'fan', 'fan2', 'shimmer', 'click', 'confetti']
const KEY = 'pcc-muted'
const POOL = 4
const hasWindow = typeof window !== 'undefined'

let muted = false
let unlocked = false
let preloaded = false
const listeners = new Set()
const pools = {}

try {
  if (hasWindow) muted = window.localStorage.getItem(KEY) === '1'
} catch {
  /* storage blocked */
}

function unlock() {
  unlocked = true
  window.removeEventListener('pointerdown', unlock)
  window.removeEventListener('keydown', unlock)
}
if (hasWindow) {
  window.addEventListener('pointerdown', unlock, { once: true })
  window.addEventListener('keydown', unlock, { once: true })
}

function poolFor(name) {
  if (!pools[name]) {
    const a = new Audio(`/sfx/${name}.mp3`)
    a.preload = 'auto'
    pools[name] = { base: a, active: [] }
  }
  return pools[name]
}

export function preload() {
  if (!hasWindow || preloaded || typeof Audio === 'undefined') return
  preloaded = true
  NAMES.forEach((n) => poolFor(n))
}

export function play(name, { volume = 1, rate = 1 } = {}) {
  if (!hasWindow || !unlocked || muted || typeof Audio === 'undefined') return
  if (!NAMES.includes(name)) return
  try {
    const p = poolFor(name)
    p.active = p.active.filter((a) => !a.ended && !a.paused)
    if (p.active.length >= POOL) return
    const a = p.base.cloneNode()
    a.volume = Math.min(1, Math.max(0, volume))
    a.playbackRate = rate
    p.active.push(a)
    const r = a.play()
    if (r && r.catch) r.catch(() => {})
  } catch {
    /* ignore */
  }
}

export function isMuted() {
  return muted
}

export function setMuted(v) {
  const next = Boolean(v)
  if (next === muted) return
  muted = next
  try {
    if (hasWindow) window.localStorage.setItem(KEY, next ? '1' : '0')
  } catch {
    /* storage blocked */
  }
  listeners.forEach((fn) => fn())
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useSfx() {
  const m = useSyncExternalStore(subscribe, isMuted, () => false)
  return { muted: m, toggle: () => setMuted(!isMuted()), play }
}
