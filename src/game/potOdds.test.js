import assert from 'node:assert/strict'
import { test } from 'node:test'
import { callSubtitle, formatPotOdds, potOddsRatio } from './potOdds.js'

test('pot odds are pot divided by the call amount', () => {
  assert.equal(potOddsRatio(100, 250), 2.5)
  assert.equal(formatPotOdds(100, 250), '2.5:1')
  assert.equal(formatPotOdds(100, 200), '2:1')
  assert.equal(potOddsRatio(0, 150), null)
  assert.equal(formatPotOdds(0, 150), null)
})

test('call subtitle uses Check when there is nothing to call', () => {
  assert.equal(callSubtitle(0, 150), 'Check')
  assert.equal(callSubtitle(100, 250), 'to call $100 · 2.5:1')
})
