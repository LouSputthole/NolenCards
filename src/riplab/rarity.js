// Rip Lab odds + pack generator. Pure functions only (no DOM) so node:test can cover them.

export const PACK_SIZE = 5

/**
 * The rarity table, lowest to highest. `weight` is the per-card chance in percent.
 * `hue` is the base art hue (degrees) for cards of that tier; `spread` is how far a
 * card may drift from it so a pack doesn't look like five copies of the same card.
 * `sat` (art saturation %), `accent` and `frame` (gradient stops) are shared by the
 * 2D result cards and the 3D viewer's canvas-drawn face so both read the same.
 */
export const RARITIES = [
  {
    id: 'common', label: 'Common', weight: 60, hue: 232, spread: 18, sat: 14,
    accent: '#a3a3b5', frame: ['#e6e8f0', '#8d90a2', '#f1f2f7', '#6f7286'],
  },
  {
    id: 'uncommon', label: 'Uncommon', weight: 25, hue: 222, spread: 14, sat: 70,
    accent: '#2f6bff', frame: ['#a9c2ff', '#2f6bff', '#d5e1ff', '#1a3fae'],
  },
  {
    id: 'rare', label: 'Rare', weight: 10, hue: 354, spread: 10, sat: 78,
    accent: '#ff2a3c', frame: ['#ffb0b8', '#ff2a3c', '#ffd5da', '#a50e1c'],
  },
  {
    id: 'holo', label: 'Holo', weight: 4, hue: 0, spread: 180, sat: 82,
    accent: '#c04bff', frame: ['#ff2a3c', '#ffd166', '#3dff9a', '#2f6bff', '#c04bff', '#ff2a3c'],
  },
  {
    id: 'gold', label: 'Pretty Cool Gold', weight: 1, hue: 43, spread: 4, sat: 85,
    accent: '#ffd166', frame: ['#7a5312', '#f8d77e', '#b5832a', '#ffe9a8', '#8a6116'],
  },
]

export const RARITY_BY_ID = Object.fromEntries(RARITIES.map((r, i) => [r.id, { ...r, rank: i }]))

/** Holo or better counts as a "hit". */
export const HIT_RANK = RARITY_BY_ID.holo.rank

// Invented, shop-flavoured names. No real players, teams, or trading-card characters.
export const NAMES = {
  common: [
    'Cul-de-Sac Catch',
    'Sunday Scrimmage',
    'Bench Warmer',
    'Dugout Dash',
    'Sideline Sprint',
    'Practice Squad',
    'Batting Cage Regular',
    'Concession Stand Hero',
  ],
  uncommon: ['Skyline Slugger', 'Mill Creek Closer', 'Rocky Fork Runner', 'Two-Minute Drill', 'Hometown Hustle'],
  rare: ['Nolensville Night Game', 'Neon Knuckleball', 'Broadway Bomber', 'Back-Room Brawler'],
  holo: ['Tri-Star Rookie', 'Cumberland Comet', 'Foil Phenom', 'Honky-Tonk Hero'],
  gold: ['Pretty Cool Gold Rookie', 'The Golden Ticket', 'Music City Legend'],
}

/**
 * Pick one item with probability proportional to its weight.
 * @template T
 * @param {T[]} items
 * @param {() => number} rng  returns [0, 1)
 * @param {(item: T) => number} [weightOf]
 * @returns {T}
 */
export function weightedPick(items, rng, weightOf = (item) => item.weight) {
  if (!items.length) throw new Error('weightedPick: no items')
  let total = 0
  for (const item of items) total += Math.max(0, weightOf(item))
  if (total <= 0) throw new Error('weightedPick: weights sum to zero')
  let r = rng() * total
  for (const item of items) {
    r -= Math.max(0, weightOf(item))
    if (r < 0) return item
  }
  // Only reachable through float rounding when rng() is a hair under 1.
  return items[items.length - 1]
}

const wrapHue = (h) => ((Math.round(h) % 360) + 360) % 360

/** One card of the given rarity. */
export function makeCard(rarityId, rng) {
  const tier = RARITY_BY_ID[rarityId]
  const names = NAMES[rarityId]
  const name = names[Math.floor(rng() * names.length) % names.length]
  const hue = wrapHue(tier.hue + (rng() * 2 - 1) * tier.spread)
  return { name, rarity: rarityId, hue }
}

/**
 * Rip one pack.
 * @param {() => number} [rng]  defaults to Math.random; pass a seeded one for tests
 * @returns {{ name: string, rarity: string, hue: number }[]} five cards
 */
export function rollPack(rng = Math.random) {
  const cards = []
  for (let i = 0; i < PACK_SIZE; i++) cards.push(makeCard(weightedPick(RARITIES, rng).id, rng))
  return cards
}

export const rankOf = (card) => RARITY_BY_ID[card?.rarity]?.rank ?? -1
export const isHit = (card) => rankOf(card) >= HIT_RANK

/** Highest-rarity card; the first one wins a tie. */
export function bestCard(cards) {
  let best = null
  for (const card of cards) if (rankOf(card) > rankOf(best)) best = card
  return best
}

/** "1 in 20" style odds text for a probability in (0, 1]. */
export function oddsText(p) {
  if (!(p > 0)) return 'never'
  const n = 1 / p
  return `1 in ${n < 10 ? Math.round(n * 10) / 10 : Math.round(n)}`
}

const TOTAL_WEIGHT = RARITIES.reduce((sum, r) => sum + r.weight, 0)

/** Per-card chance of a rarity, from the table. */
export const cardChance = (rarityId) => RARITY_BY_ID[rarityId].weight / TOTAL_WEIGHT

/** Per-card chance of a hit (holo or better), from the table. */
export const hitChance = RARITIES.filter((r) => RARITY_BY_ID[r.id].rank >= HIT_RANK).reduce(
  (sum, r) => sum + r.weight / TOTAL_WEIGHT,
  0,
)

/** Chance that a pack holds at least one hit. */
export const packHitChance = 1 - (1 - hitChance) ** PACK_SIZE

/** Small seeded PRNG (mulberry32) for tests and reproducible packs. */
export function seededRng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
