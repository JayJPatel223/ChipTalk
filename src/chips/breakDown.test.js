import assert from 'node:assert/strict'
import { test } from 'node:test'
import { breakDownAmount } from './breakDown.js'

function counts(piles) {
  return Object.fromEntries(piles.map((pile) => [pile.value, pile.count]))
}

function drawn(piles) {
  return piles.reduce((sum, pile) => sum + pile.count, 0)
}

test('empty and invalid amounts draw nothing', () => {
  assert.deepEqual(breakDownAmount(0), [])
  assert.deepEqual(breakDownAmount(-40), [])
  assert.deepEqual(breakDownAmount(Number.NaN), [])
})

test('uses the standard 1 / 5 / 25 / 100 / 500 / 1000 palette', () => {
  assert.deepEqual(counts(breakDownAmount(1)), { 1: 1 })
  assert.deepEqual(counts(breakDownAmount(5)), { 5: 1 })
  assert.deepEqual(counts(breakDownAmount(50)), { 25: 2 })
  assert.deepEqual(counts(breakDownAmount(100)), { 100: 1 })
  assert.deepEqual(counts(breakDownAmount(150)), { 100: 1, 25: 2 })
  assert.deepEqual(counts(breakDownAmount(625)), { 500: 1, 100: 1, 25: 1 })
  assert.deepEqual(counts(breakDownAmount(6)), { 5: 1, 1: 1 })
})

test('caps disks per denomination and overall so piles stay bounded', () => {
  const piles = breakDownAmount(25_000, { maxChips: 10, maxPerDenom: 8 })
  assert.ok(drawn(piles) <= 10)
  assert.ok(piles.every((pile) => pile.count <= 8))
  assert.ok(piles.every((pile) => [1000, 500, 100, 25, 5, 1].includes(pile.value)))
})

test('a leftover small bet still shows at least one chip', () => {
  const piles = breakDownAmount(50, { maxChips: 12, maxPerDenom: 8 })
  assert.ok(drawn(piles) > 0)
  assert.equal(piles.some((pile) => pile.value === 25 && pile.count === 2), true)
})
