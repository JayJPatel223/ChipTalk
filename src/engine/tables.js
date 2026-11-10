/**
 * Cactus Kev lookup tables, generated here (not copied from a binary dump).
 *
 * Method: enumerate every distinct 5-card rank pattern in poker-strength
 * order and assign ranks 1..7462 (1 = strongest). Flush and unique-5
 * tables are indexed by the 13-bit rank mask. Hands with paired ranks are
 * keyed by the product of Cactus Kev rank primes.
 *
 * Rank bands (Kevin Suffecool / Cactus Kev):
 *   1-10      straight flush (royal … wheel)
 *   11-166    four of a kind
 *   167-322   full house
 *   323-1599  flush
 *   1600-1609 straight
 *   1610-2467 three of a kind
 *   2468-3325 two pair
 *   3326-6185 one pair
 *   6186-7462 high card
 *
 * Approach: Kevin Suffecool, "Cactus Kev's Poker Hand Evaluator"
 * http://suffe.cool/poker/evaluator.html — algorithm described publicly;
 * these tables are regenerated from the ranking rules rather than reused
 * as copyrighted data.
 */

import { PRIMES } from './cards.js'

const HIGH_TO_LOW = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]

const STRAIGHT_MASKS = [
  0x1f00, // A K Q J T
  0x0f80, // K Q J T 9
  0x07c0,
  0x03e0,
  0x01f0,
  0x00f8,
  0x007c,
  0x003e,
  0x001f, // 6 5 4 3 2
  0x100f, // A 5 4 3 2  (wheel)
]

function combinations(values, k) {
  const out = []
  const acc = []
  function rec(start) {
    if (acc.length === k) {
      out.push(acc.slice())
      return
    }
    for (let i = start; i < values.length; i += 1) {
      acc.push(values[i])
      rec(i + 1)
      acc.pop()
    }
  }
  rec(0)
  return out
}

function maskOf(ranks) {
  return ranks.reduce((bits, rank) => bits | (1 << rank), 0)
}

function productOf(ranks) {
  return ranks.reduce((product, rank) => product * PRIMES[rank], 1)
}

function buildTables() {
  const flushes = new Uint16Array(8192)
  const unique5 = new Uint16Array(8192)
  const products = new Map()
  let rank = 1

  const setProduct = (ranks, value) => {
    products.set(productOf(ranks), value)
  }

  STRAIGHT_MASKS.forEach((mask, offset) => {
    flushes[mask] = rank + offset
  })
  rank += 10

  for (const quad of HIGH_TO_LOW) {
    for (const kicker of HIGH_TO_LOW) {
      if (kicker === quad) continue
      setProduct([quad, quad, quad, quad, kicker], rank)
      rank += 1
    }
  }

  for (const trips of HIGH_TO_LOW) {
    for (const pair of HIGH_TO_LOW) {
      if (pair === trips) continue
      setProduct([trips, trips, trips, pair, pair], rank)
      rank += 1
    }
  }

  const highCardMasks = combinations(HIGH_TO_LOW, 5)
    .map(maskOf)
    .filter((mask) => !STRAIGHT_MASKS.includes(mask))

  highCardMasks.forEach((mask, offset) => {
    flushes[mask] = 323 + offset
  })
  rank += 1277

  STRAIGHT_MASKS.forEach((mask, offset) => {
    unique5[mask] = rank + offset
  })
  rank += 10

  for (const trips of HIGH_TO_LOW) {
    const others = HIGH_TO_LOW.filter((rankIndex) => rankIndex !== trips)
    for (const [high, low] of combinations(others, 2)) {
      setProduct([trips, trips, trips, high, low], rank)
      rank += 1
    }
  }

  for (const high of HIGH_TO_LOW) {
    for (const low of HIGH_TO_LOW) {
      if (low >= high) continue
      const others = HIGH_TO_LOW.filter((rankIndex) => rankIndex !== high && rankIndex !== low)
      for (const kicker of others) {
        setProduct([high, high, low, low, kicker], rank)
        rank += 1
      }
    }
  }

  for (const pair of HIGH_TO_LOW) {
    const others = HIGH_TO_LOW.filter((rankIndex) => rankIndex !== pair)
    for (const kickers of combinations(others, 3)) {
      setProduct([pair, pair, ...kickers], rank)
      rank += 1
    }
  }

  highCardMasks.forEach((mask, offset) => {
    unique5[mask] = 6186 + offset
  })
  rank += 1277

  if (rank !== 7463) {
    throw new Error(`lookup tables: expected to assign 7462 ranks, ended at ${rank - 1}`)
  }
  if (products.size !== 156 + 156 + 858 + 858 + 2860) {
    throw new Error(`lookup tables: unexpected product count ${products.size}`)
  }

  return { flushes, unique5, products }
}

let cache
export function getTables() {
  if (!cache) cache = buildTables()
  return cache
}
