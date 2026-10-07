import test from 'node:test'
import assert from 'node:assert/strict'
import {
  NAMES,
  PACK_SIZE,
  RARITIES,
  bestCard,
  hitChance,
  oddsText,
  packHitChance,
  rollPack,
  seededRng,
  weightedPick,
} from './rarity.js'

// An rng that replays a fixed list of values, so weightedPick's boundaries can be pinned exactly.
const replay = (...values) => {
  let i = 0
  return () => values[i++ % values.length]
}

test('weightedPick maps the rng onto cumulative weights', () => {
  const items = [
    { id: 'a', weight: 1 },
    { id: 'b', weight: 3 },
  ]
  // total 4: [0, 0.25) -> a, [0.25, 1) -> b
  assert.equal(weightedPick(items, replay(0)).id, 'a')
  assert.equal(weightedPick(items, replay(0.2499)).id, 'a')
  assert.equal(weightedPick(items, replay(0.25)).id, 'b')
  assert.equal(weightedPick(items, replay(0.9999999)).id, 'b')
})

test('weightedPick on the rarity table respects the cut points', () => {
  assert.equal(weightedPick(RARITIES, replay(0.59)).id, 'common')
  assert.equal(weightedPick(RARITIES, replay(0.6)).id, 'uncommon')
  assert.equal(weightedPick(RARITIES, replay(0.849)).id, 'uncommon')
  assert.equal(weightedPick(RARITIES, replay(0.85)).id, 'rare')
  assert.equal(weightedPick(RARITIES, replay(0.95)).id, 'holo')
  assert.equal(weightedPick(RARITIES, replay(0.99)).id, 'gold')
})

test('weightedPick is deterministic for a seeded rng and never picks a zero weight', () => {
  const items = [
    { id: 'x', weight: 2 },
    { id: 'never', weight: 0 },
    { id: 'y', weight: 5 },
  ]
  const a = Array.from({ length: 200 }, ((rng) => () => weightedPick(items, rng).id)(seededRng(42)))
  const b = Array.from({ length: 200 }, ((rng) => () => weightedPick(items, rng).id)(seededRng(42)))
  assert.deepEqual(a, b)
  assert.ok(!a.includes('never'))
  assert.ok(a.includes('x') && a.includes('y'))
})

test('weightedPick rejects empty or weightless input', () => {
  assert.throws(() => weightedPick([], Math.random))
  assert.throws(() => weightedPick([{ weight: 0 }], Math.random))
})

test('rollPack returns five well-formed cards', () => {
  const pack = rollPack(seededRng(7))
  assert.equal(pack.length, PACK_SIZE)
  assert.equal(pack.length, 5)
  for (const card of pack) {
    assert.ok(RARITIES.some((r) => r.id === card.rarity), `unknown rarity ${card.rarity}`)
    assert.ok(NAMES[card.rarity].includes(card.name), `${card.name} is not a ${card.rarity} name`)
    assert.ok(Number.isInteger(card.hue) && card.hue >= 0 && card.hue < 360, `bad hue ${card.hue}`)
  }
})

test('rollPack is reproducible with the same seed', () => {
  assert.deepEqual(rollPack(seededRng(2026)), rollPack(seededRng(2026)))
  assert.notDeepEqual(rollPack(seededRng(1)), rollPack(seededRng(2)))
})

test('rarity frequencies over 10k rolls land within 3pp of the table', () => {
  const rng = seededRng(1234)
  const counts = Object.fromEntries(RARITIES.map((r) => [r.id, 0]))
  let total = 0
  for (let i = 0; i < 10_000; i++) {
    for (const card of rollPack(rng)) {
      counts[card.rarity]++
      total++
    }
  }
  for (const r of RARITIES) {
    const pct = (counts[r.id] / total) * 100
    assert.ok(Math.abs(pct - r.weight) <= 3, `${r.id}: ${pct.toFixed(2)}% vs table ${r.weight}%`)
  }
})

test('bestCard picks the highest rarity, first one on a tie', () => {
  const pack = [
    { name: 'a', rarity: 'common' },
    { name: 'b', rarity: 'holo' },
    { name: 'c', rarity: 'rare' },
    { name: 'd', rarity: 'holo' },
  ]
  assert.equal(bestCard(pack).name, 'b')
  assert.equal(bestCard([]), null)
})

test('odds text', () => {
  assert.equal(oddsText(0.05), '1 in 20')
  assert.equal(oddsText(0.01), '1 in 100')
  assert.equal(oddsText(0.25), '1 in 4')
  assert.equal(oddsText(0), 'never')
  assert.ok(Math.abs(hitChance - 0.05) < 1e-9)
  assert.ok(Math.abs(packHitChance - (1 - 0.95 ** 5)) < 1e-9)
})
