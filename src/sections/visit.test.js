import test from 'node:test'
import assert from 'node:assert/strict'
import { isOpenNow } from './openNow.js'

const hours = [
  { day: 'Monday', open: '12 – 7 PM' },
  { day: 'Tuesday', open: 'Closed' },
  { day: 'Wednesday', open: '12 – 7 PM' },
  { day: 'Thursday', open: '12 – 7 PM' },
  { day: 'Friday', open: '12 – 7 PM' },
  { day: 'Saturday', open: '12 – 8 PM' },
  { day: 'Sunday', open: '12 – 7 PM' },
]

// October 2026 is CDT (UTC-5). Mon Oct 5, Tue Oct 6, Sat Oct 10.
test('Tuesday is closed', () => {
  const r = isOpenNow(hours, new Date('2026-10-06T18:00:00Z')) // 1 PM CDT
  assert.equal(r.open, false)
  assert.equal(r.todayIndex, 1)
})

test('Monday 3 PM is open', () => {
  assert.equal(isOpenNow(hours, new Date('2026-10-05T20:00:00Z')).open, true)
})

test('Monday 8 PM is closed', () => {
  assert.equal(isOpenNow(hours, new Date('2026-10-06T01:00:00Z')).open, false)
})

test('Saturday 7:30 PM is open', () => {
  assert.equal(isOpenNow(hours, new Date('2026-10-11T00:30:00Z')).open, true)
})

test('Monday 10 AM reports opening time', () => {
  const r = isOpenNow(hours, new Date('2026-10-05T15:00:00Z'))
  assert.equal(r.open, false)
  assert.match(r.status, /opens at 12 PM/)
})
