import assert from 'node:assert/strict'
import { test } from 'node:test'
import { describeHeroStrength, formatHandName, winningCardKeys } from './handDescribe.js'

const c = (rank, suit) => ({ rank, suit })

test('names made hands from five cards', () => {
  assert.equal(
    formatHandName([c('K', 's'), c('K', 'h'), c('K', 'd'), c('10', 'c'), c('10', 's')]),
    'Full House, Kings over Tens',
  )
  assert.equal(formatHandName([c('8', 's'), c('8', 'h'), c('8', 'd'), c('8', 'c'), c('2', 's')]), 'Four of a Kind, 8s')
  assert.equal(formatHandName([c('A', 's'), c('K', 's'), c('Q', 's'), c('J', 's'), c('10', 's')]), 'Royal Flush')
  assert.equal(formatHandName([c('A', 'd'), c('9', 'c'), c('4', 'h'), c('2', 's'), c('7', 'c')]), 'Ace high')
})

test('hero hint uses only hole cards and the visible board', () => {
  assert.equal(describeHeroStrength([c('8', 's'), c('8', 'h')], []), 'Pair of 8s')
  assert.equal(describeHeroStrength([c('A', 's'), c('K', 's')], []), 'Ace-King suited')
  assert.equal(
    describeHeroStrength([c('A', 's'), c('2', 's')], [c('9', 's'), c('5', 's'), c('K', 'd')]),
    'Flush draw',
  )
})

test('winning keys cover the best five for each winner', () => {
  const keys = winningCardKeys(
    [{ holeCards: [c('K', 's'), c('K', 'h')] }],
    [c('K', 'd'), c('10', 'c'), c('10', 's'), c('2', 'c'), c('3', 'd')],
  )
  assert.equal(keys.length, 5)
  assert.ok(keys.includes('Ks'))
  assert.ok(keys.includes('10c'))
})
