import { cardKey, toCardCode } from './cards.js'
import { getTables } from './tables.js'

const FIVE_FROM_SEVEN = [
  [0, 1, 2, 3, 4],
  [0, 1, 2, 3, 5],
  [0, 1, 2, 3, 6],
  [0, 1, 2, 4, 5],
  [0, 1, 2, 4, 6],
  [0, 1, 2, 5, 6],
  [0, 1, 3, 4, 5],
  [0, 1, 3, 4, 6],
  [0, 1, 3, 5, 6],
  [0, 1, 4, 5, 6],
  [0, 2, 3, 4, 5],
  [0, 2, 3, 4, 6],
  [0, 2, 3, 5, 6],
  [0, 2, 4, 5, 6],
  [0, 3, 4, 5, 6],
  [1, 2, 3, 4, 5],
  [1, 2, 3, 4, 6],
  [1, 2, 3, 5, 6],
  [1, 2, 4, 5, 6],
  [1, 3, 4, 5, 6],
  [2, 3, 4, 5, 6],
]

export const HAND_CATEGORIES = [
  { max: 10, name: 'straight flush' },
  { max: 166, name: 'four of a kind' },
  { max: 322, name: 'full house' },
  { max: 1599, name: 'flush' },
  { max: 1609, name: 'straight' },
  { max: 2467, name: 'three of a kind' },
  { max: 3325, name: 'two pair' },
  { max: 6185, name: 'one pair' },
  { max: 7462, name: 'high card' },
]

export function categoryForRank(rank) {
  if (!Number.isInteger(rank) || rank < 1 || rank > 7462) {
    throw new Error(`categoryForRank: rank must be 1..7462, got ${rank}`)
  }
  return HAND_CATEGORIES.find((entry) => rank <= entry.max).name
}

function codesFrom(cards, expected) {
  if (!Array.isArray(cards) || cards.length !== expected) {
    throw new Error(
      `evaluate: expected ${expected} cards, got ${Array.isArray(cards) ? cards.length : typeof cards}`,
    )
  }
  const codes = cards.map(toCardCode)
  const seen = new Set()
  for (const code of codes) {
    const key = cardKey(code)
    if (seen.has(key)) {
      throw new Error(`evaluate: duplicate card ${key}`)
    }
    seen.add(key)
  }
  return codes
}

export function evaluate5(cards) {
  const [c1, c2, c3, c4, c5] = codesFrom(cards, 5)
  const { flushes, unique5, products } = getTables()
  const bits = (c1 | c2 | c3 | c4 | c5) >> 16

  if ((c1 & c2 & c3 & c4 & c5 & 0xf000) !== 0) {
    const flushRank = flushes[bits]
    if (!flushRank) throw new Error('evaluate5: flush pattern missing from tables')
    return flushRank
  }

  const uniqueRank = unique5[bits]
  if (uniqueRank) return uniqueRank

  const product = (c1 & 0xff) * (c2 & 0xff) * (c3 & 0xff) * (c4 & 0xff) * (c5 & 0xff)
  const pairedRank = products.get(product)
  if (!pairedRank) throw new Error('evaluate5: paired hand missing from tables')
  return pairedRank
}

export function evaluate7(cards) {
  const codes = codesFrom(cards, 7)
  let best = 7463
  for (const picks of FIVE_FROM_SEVEN) {
    const rank = evaluate5(picks.map((index) => codes[index]))
    if (rank < best) best = rank
  }
  return best
}

export function evaluateHand(cards) {
  if (!Array.isArray(cards)) {
    throw new Error('evaluate: expected an array of cards')
  }
  if (cards.length === 5) return evaluate5(cards)
  if (cards.length === 7) return evaluate7(cards)
  throw new Error(`evaluate: expected 5 or 7 cards, got ${cards.length}`)
}

/** Negative if `a` is stronger (lower rank number). */
export function compareHandRanks(a, b) {
  return a - b
}
