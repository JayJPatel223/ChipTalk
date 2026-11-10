/**
 * Cactus Kev integer encoding (Kevin Suffecool):
 *
 *   bit  0-7   prime of rank  (2=2, 3=3, 5=5, …, A=41)
 *   bit  8-11  rank index     (2=0 … A=12)
 *   bit 12-15  suit bit       (cdhs: clubs=0x8, diamonds=0x4, hearts=0x2, spades=0x1)
 *   bit 16-28  rank bit       (one bit set at 16 + rank index)
 *
 * UI cards use the same rank/suit strings as the table scaffold
 * ({ rank: 'A', suit: 's' }). `code` is the evaluator integer.
 */

export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
export const SUITS = ['c', 'd', 'h', 's']

export const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41]

const SUIT_BITS = {
  c: 0x8000,
  d: 0x4000,
  h: 0x2000,
  s: 0x1000,
}

const RANK_INDEX = Object.fromEntries(RANKS.map((rank, index) => [rank, index]))

export function encodeCard(rank, suit) {
  const rankIndex = RANK_INDEX[rank]
  const suitBits = SUIT_BITS[suit]
  if (rankIndex === undefined || suitBits === undefined) {
    throw new Error(`encodeCard: unknown card ${rank}${suit}`)
  }
  return PRIMES[rankIndex] | (rankIndex << 8) | suitBits | (1 << (16 + rankIndex))
}

export function decodeCard(code) {
  const rankIndex = (code >> 8) & 0xf
  let suit
  if (code & 0x8000) suit = 'c'
  else if (code & 0x4000) suit = 'd'
  else if (code & 0x2000) suit = 'h'
  else if (code & 0x1000) suit = 's'
  else throw new Error(`decodeCard: missing suit bits in ${code}`)
  return { rank: RANKS[rankIndex], suit, code }
}

export function toCardCode(card) {
  if (typeof card === 'number') return card
  if (card && typeof card.code === 'number') return card.code
  if (card && card.rank && card.suit) return encodeCard(card.rank, card.suit)
  throw new Error('toCardCode: expected a card integer or { rank, suit }')
}

export function cardKey(card) {
  const { rank, suit } = typeof card === 'number' ? decodeCard(card) : card
  return `${rank}${suit}`
}

/** Fresh 52-card deck. Order is clubs→spades, deuce→ace. */
export function createDeck() {
  const deck = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, code: encodeCard(rank, suit) })
    }
  }
  return deck
}
