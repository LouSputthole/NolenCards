import test from 'node:test'
import assert from 'node:assert/strict'
import { isMuted, setMuted, subscribe, play, preload } from './sfx.js'

test('defaults to unmuted', () => {
  assert.equal(isMuted(), false)
})

test('setMuted toggles state and notifies subscribers', () => {
  let calls = 0
  const off = subscribe(() => calls++)
  setMuted(true)
  assert.equal(isMuted(), true)
  assert.equal(calls, 1)
  setMuted(true)
  assert.equal(calls, 1)
  off()
  setMuted(false)
  assert.equal(calls, 1)
  assert.equal(isMuted(), false)
})

test('play and preload are no-ops without a window', () => {
  assert.doesNotThrow(() => {
    preload()
    play('rip')
  })
})
