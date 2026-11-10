const RANK_VALUE = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
}

/** Rough 0..1 starting-hand strength. Pairs and broadway aces rank highest. */
export function startingHandScore(holeCards) {
  if (!holeCards || holeCards.length !== 2) return 0
  const ranks = holeCards.map((card) => RANK_VALUE[card.rank] ?? 0)
  const high = Math.max(...ranks)
  const low = Math.min(...ranks)
  const suited = holeCards[0].suit === holeCards[1].suit
  const pair = ranks[0] === ranks[1]
  if (pair) return Math.min(1, 0.48 + (high / 14) * 0.52)

  let score = (high / 14) * 0.5 + (low / 14) * 0.14
  if (suited) score += 0.08
  const gap = high - low
  if (gap === 1) score += 0.1
  else if (gap === 2) score += 0.05
  else if (gap >= 5) score -= 0.06
  if (high === 14 && low >= 10) score += 0.14
  return Math.max(0, Math.min(1, score))
}
