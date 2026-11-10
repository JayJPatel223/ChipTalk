import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  cardKey,
  categoryForRank,
  compareHandRanks,
  createDeck,
  decodeCard,
  encodeCard,
  evaluate5,
  evaluate7,
  evaluateHand,
  indexLimit,
  shuffle,
  unbiasedIndex,
} from './index.js'

function cards(...ids) {
  return ids.map((id) => {
    const rank = id.slice(0, -1)
    const suit = id.slice(-1)
    return { rank, suit, code: encodeCard(rank, suit) }
  })
}

test('deck contains exactly 52 unique cards', () => {
  const deck = createDeck()
  assert.equal(deck.length, 52)
  const keys = deck.map(cardKey)
  assert.equal(new Set(keys).size, 52)
  assert.equal(deck.filter((card) => card.rank === 'A').length, 4)
  assert.equal(deck.filter((card) => card.suit === 's').length, 13)
})

test('integer encoding round-trips to UI rank and suit', () => {
  const encoded = encodeCard('10', 'h')
  const decoded = decodeCard(encoded)
  assert.equal(decoded.rank, '10')
  assert.equal(decoded.suit, 'h')
  assert.equal(decoded.code, encoded)
})

test('shuffle keeps every card and does not mutate the original', () => {
  const original = createDeck()
  const snapshot = original.map(cardKey)
  const shuffled = shuffle(original)
  assert.notEqual(shuffled, original)
  assert.deepEqual(original.map(cardKey), snapshot)
  assert.equal(shuffled.length, 52)
  assert.deepEqual([...shuffled.map(cardKey)].sort(), [...snapshot].sort())
})

test('unbiasedIndex rejects out-of-range values then hits 0 and n-1', () => {
  const n = 52
  const limit = indexLimit(n)
  const values = [limit, limit + 10, 0]
  let calls = 0
  const randomU32 = () => values[calls++]
  assert.equal(unbiasedIndex(n, randomU32), 0)
  assert.equal(calls, 3)

  const highCalls = []
  const highRng = () => {
    highCalls.push(true)
    return n - 1
  }
  assert.equal(unbiasedIndex(n, highRng), n - 1)
})

test('shuffle uses injected 32-bit values, including a rejected sample', () => {
  const deck = ['a', 'b', 'c', 'd']
  const original = deck.slice()
  const n3Limit = indexLimit(3)
  const values = [n3Limit, 0, 0, 0]
  let i = 0
  const shuffled = shuffle(deck, { randomU32: () => values[i++] })
  assert.deepEqual(deck, original)
  assert.equal(shuffled.length, 4)
  assert.deepEqual([...shuffled].sort(), [...original].sort())
  assert.ok(i >= 3)
})

test('royal flush is rank 1 and wheel straight flush is rank 10', () => {
  const royal = evaluate5(cards('As', 'Ks', 'Qs', 'Js', '10s'))
  const wheelFlush = evaluate5(cards('As', '2s', '3s', '4s', '5s'))
  const broadway = evaluate5(cards('Ah', 'Kd', 'Qc', 'Js', '10h'))
  const wheel = evaluate5(cards('Ah', '2d', '3c', '4s', '5h'))
  assert.equal(royal, 1)
  assert.equal(categoryForRank(royal), 'straight flush')
  assert.equal(wheelFlush, 10)
  assert.equal(broadway, 1600)
  assert.equal(wheel, 1609)
  assert.equal(categoryForRank(wheel), 'straight')
})

test('full house beats flush', () => {
  const fullHouse = evaluate5(cards('Ah', 'Ad', 'Ac', 'Kd', 'Kh'))
  const flush = evaluate5(cards('2h', '4h', '6h', '8h', '10h'))
  assert.equal(categoryForRank(fullHouse), 'full house')
  assert.equal(categoryForRank(flush), 'flush')
  assert.ok(compareHandRanks(fullHouse, flush) < 0)
})

test('kickers break otherwise similar hands', () => {
  const acesKing = evaluate5(cards('Ah', 'Ad', 'Kc', '7s', '2h'))
  const acesQueen = evaluate5(cards('As', 'Ac', 'Qd', '7h', '2c'))
  assert.equal(categoryForRank(acesKing), 'one pair')
  assert.ok(compareHandRanks(acesKing, acesQueen) < 0)
})

test('equivalent hands tie, including when both play the board', () => {
  const left = evaluate5(cards('Ah', 'Kd', 'Qc', 'Js', '9h'))
  const right = evaluate5(cards('As', 'Kc', 'Qd', 'Jh', '9c'))
  assert.equal(left, right)
  assert.equal(compareHandRanks(left, right), 0)

  const board = cards('Ah', 'Kd', 'Qc', 'Js', '9h')
  const playBoardA = evaluate7([...board, ...cards('2c', '3d')])
  const playBoardB = evaluate7([...board, ...cards('4s', '5c')])
  assert.equal(playBoardA, playBoardB)
  assert.equal(playBoardA, evaluate5(board))
})

test('seven-card evaluation finds the best five cards', () => {
  const seven = evaluate7(cards('2c', '3d', 'As', 'Ks', 'Qs', 'Js', '10s'))
  assert.equal(seven, 1)
  const tripsOverPair = evaluate7(cards('Ah', 'Ad', 'Ac', '2c', '2d', '9s', '7h'))
  assert.equal(categoryForRank(tripsOverPair), 'full house')
  assert.equal(tripsOverPair, evaluate5(cards('Ah', 'Ad', 'Ac', '2c', '2d')))
})

test('invalid card counts and duplicate cards are rejected', () => {
  assert.throws(() => evaluateHand(cards('As', 'Ks', 'Qs')), /expected 5 or 7/)
  assert.throws(() => evaluate5(cards('As', 'Ks', 'Qs', 'Js')), /expected 5/)
  assert.throws(() => evaluate7(cards('As', 'Ks', 'Qs', 'Js', '10s', '9s')), /expected 7/)
  assert.throws(() => evaluate5(cards('As', 'As', 'Kd', 'Qc', 'Jh')), /duplicate card As/)
  assert.throws(() => evaluateHand('As'), /expected an array/)
})
