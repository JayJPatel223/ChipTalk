import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatCardName } from './cardName.js'

test('names face-up cards in full words', () => {
  assert.equal(formatCardName('8', 'd', true), 'Eight of diamonds')
  assert.equal(formatCardName('A', 's', true), 'Ace of spades')
  assert.equal(formatCardName('10', 'h', true), 'Ten of hearts')
})

test('face-down cards stay anonymous', () => {
  assert.equal(formatCardName('8', 'd', false), 'Face-down card')
  assert.equal(formatCardName('?', 's', true), 'Face-down card')
})
