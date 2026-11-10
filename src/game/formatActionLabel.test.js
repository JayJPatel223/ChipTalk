import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatActionLabel } from './formatActionLabel.js'

test('formats common poker actions for seat labels', () => {
  assert.equal(formatActionLabel({ type: 'fold' }), 'Fold')
  assert.equal(formatActionLabel({ type: 'check' }), 'Check')
  assert.equal(formatActionLabel({ type: 'call', delta: 100 }), 'Call 100')
  assert.equal(formatActionLabel({ type: 'raise', amount: 300 }), 'Raise to 300')
  assert.equal(formatActionLabel({ type: 'bet', to: 200 }), 'Bet 200')
  assert.equal(formatActionLabel({ type: 'allIn' }), 'All-in')
  assert.equal(formatActionLabel({ type: 'call', delta: 50, allIn: true }), 'All-in')
})

test('returns null for missing or unknown actions', () => {
  assert.equal(formatActionLabel(null), null)
  assert.equal(formatActionLabel({}), null)
  assert.equal(formatActionLabel({ type: 'wait' }), null)
})
