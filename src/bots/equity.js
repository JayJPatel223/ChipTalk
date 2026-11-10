import { cardKey, createDeck, evaluateHand } from '../engine/index.js'

/**
 * Sample budget (kept small so the UI stays responsive):
 *   flop  40  — board still has 2 cards unknown; variance is highest
 *   turn  32
 *   river 24  — only opponent hole cards are unknown
 *
 * This is not a precise equity calculator. It ranks strong vs weak hands
 * well enough for a heuristic bot. Do not pass the real remaining deck;
 * unknown cards are always "full deck minus known public + hero cards".
 */
export const EQUITY_SAMPLES = {
  flop: 40,
  turn: 32,
  river: 24,
}

export function unknownPool(holeCards, community) {
  const known = new Set([...holeCards, ...community].map((card) => cardKey(card)))
  return createDeck().filter((card) => !known.has(cardKey(card)))
}

function shuffleCopy(cards, rng) {
  const next = cards.map((card) => ({ ...card }))
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

/**
 * Estimate hero win+tie share versus `opponentCount` random hands.
 * `rng` must be injected for tests.
 */
export function estimateEquity({
  holeCards,
  community,
  opponentCount,
  street,
  rng,
  sampleCount,
}) {
  const boardNeed = Math.max(0, 5 - community.length)
  const samples = sampleCount ?? EQUITY_SAMPLES[street] ?? 24
  const villains = Math.max(1, opponentCount)
  const pool = unknownPool(holeCards, community)
  if (pool.length < villains * 2 + boardNeed) return 0.5

  let share = 0
  for (let i = 0; i < samples; i += 1) {
    const draw = shuffleCopy(pool, rng)
    let offset = 0
    const opponents = []
    for (let v = 0; v < villains; v += 1) {
      opponents.push([draw[offset], draw[offset + 1]])
      offset += 2
    }
    const board = [...community, ...draw.slice(offset, offset + boardNeed)]
    const heroRank = evaluateHand([...holeCards, ...board])
    const villainRanks = opponents.map((hand) => evaluateHand([...hand, ...board]))
    const bestVillain = Math.min(...villainRanks)
    if (heroRank < bestVillain) share += 1
    else if (heroRank === bestVillain) share += 0.5
  }
  return share / samples
}
