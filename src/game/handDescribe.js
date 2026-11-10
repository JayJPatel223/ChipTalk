import { cardKey, categoryForRank, evaluateHand, RANKS } from '../engine/index.js'

const GROUP = {
  A: 'Aces',
  K: 'Kings',
  Q: 'Queens',
  J: 'Jacks',
  10: 'Tens',
}

const HIGH = {
  A: 'Ace',
  K: 'King',
  Q: 'Queen',
  J: 'Jack',
  10: 'Ten',
}

function liveCards(cards) {
  return (cards ?? []).filter((card) => card && card.rank && card.rank !== '?' && card.suit)
}

function rankIndex(rank) {
  return RANKS.indexOf(rank)
}

function groupName(rank) {
  return GROUP[rank] ?? `${rank}s`
}

function highName(rank) {
  return HIGH[rank] ?? String(rank)
}

function countRanks(cards) {
  const counts = {}
  for (const card of cards) {
    counts[card.rank] = (counts[card.rank] ?? 0) + 1
  }
  return counts
}

function ranksByCount(cards) {
  return Object.entries(countRanks(cards)).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]
    return rankIndex(b[0]) - rankIndex(a[0])
  })
}

function highestRank(cards) {
  return [...cards].sort((a, b) => rankIndex(b.rank) - rankIndex(a.rank))[0]?.rank
}

function combinations(cards, k) {
  const out = []
  const walk = (start, chosen) => {
    if (chosen.length === k) {
      out.push(chosen.slice())
      return
    }
    for (let index = start; index < cards.length; index += 1) {
      chosen.push(cards[index])
      walk(index + 1, chosen)
      chosen.pop()
    }
  }
  walk(0, [])
  return out
}

export function bestFiveCards(cards) {
  const live = liveCards(cards)
  if (live.length <= 5) return live
  let best = live.slice(0, 5)
  let bestRank = 7463
  for (const five of combinations(live, 5)) {
    try {
      const rank = evaluateHand(five)
      if (rank < bestRank) {
        bestRank = rank
        best = five
      }
    } catch {
      /* skip illegal sets */
    }
  }
  return best
}

export function formatHandName(cards) {
  const five = bestFiveCards(cards)
  if (five.length < 5) return null
  let category
  try {
    category = categoryForRank(evaluateHand(five))
  } catch {
    return null
  }
  const ranked = ranksByCount(five)
  const high = highestRank(five)
  if (category === 'straight flush') {
    const royal = five.every((card) => ['10', 'J', 'Q', 'K', 'A'].includes(card.rank))
    return royal ? 'Royal Flush' : `Straight Flush, ${highName(high)} high`
  }
  if (category === 'four of a kind') return `Four of a Kind, ${groupName(ranked[0][0])}`
  if (category === 'full house') return `Full House, ${groupName(ranked[0][0])} over ${groupName(ranked[1][0])}`
  if (category === 'flush') return `Flush, ${highName(high)} high`
  if (category === 'straight') return `Straight, ${highName(high)} high`
  if (category === 'three of a kind') return `Three of a Kind, ${groupName(ranked[0][0])}`
  if (category === 'two pair') return `Two Pair, ${groupName(ranked[0][0])} and ${groupName(ranked[1][0])}`
  if (category === 'one pair') return `Pair of ${groupName(ranked[0][0])}`
  return `${highName(high)} high`
}

function hasFlushDraw(cards) {
  const suits = {}
  for (const card of cards) suits[card.suit] = (suits[card.suit] ?? 0) + 1
  const max = Math.max(0, ...Object.values(suits))
  return max === 4
}

function uniqueRankIndexes(cards) {
  return [...new Set(cards.map((card) => rankIndex(card.rank)).filter((index) => index >= 0))].sort((a, b) => a - b)
}

function hasStraightDraw(cards) {
  const indexes = uniqueRankIndexes(cards)
  if (indexes.length < 4) return false
  const wheel = [0, 1, 2, 3, 12]
  const withWheel = indexes.includes(12) ? [...indexes, -1].sort((a, b) => a - b) : indexes
  for (let i = 0; i <= withWheel.length - 4; i += 1) {
    const span = withWheel[i + 3] - withWheel[i]
    if (span <= 4) return true
  }
  const wheelHits = wheel.filter((index) => indexes.includes(index) || (index === 12 && indexes.includes(12)))
  return wheelHits.length >= 4
}

function holeOnlyLabel(hole) {
  if (hole.length < 2) return null
  if (hole[0].rank === hole[1].rank) return `Pair of ${groupName(hole[0].rank)}`
  const ordered = [...hole].sort((a, b) => rankIndex(b.rank) - rankIndex(a.rank))
  const suited = hole[0].suit === hole[1].suit ? ' suited' : ''
  return `${highName(ordered[0].rank)}-${highName(ordered[1].rank)}${suited}`
}

/** Player-only strength text from hole cards plus the visible board. */
export function describeHeroStrength(hole, board) {
  const holes = liveCards(hole)
  const community = liveCards(board)
  const cards = [...holes, ...community]
  if (cards.length < 2) return null
  if (cards.length < 5) {
    if (hasFlushDraw(cards)) return 'Flush draw'
    if (hasStraightDraw(cards)) return 'Straight draw'
    return holeOnlyLabel(holes)
  }
  const name = formatHandName(cards)
  try {
    const five = bestFiveCards(cards)
    const category = categoryForRank(evaluateHand(five))
    if (category === 'high card' || category === 'one pair') {
      if (hasFlushDraw(cards)) return 'Flush draw'
      if (hasStraightDraw(cards) && category === 'high card') return 'Straight draw'
    }
  } catch {
    /* keep made-hand name */
  }
  return name
}

export function winningCardKeys(winners, community) {
  const keys = new Set()
  for (const player of winners ?? []) {
    const five = bestFiveCards([...(player.holeCards ?? []), ...(community ?? [])])
    for (const card of five) keys.add(cardKey(card))
  }
  return [...keys]
}
