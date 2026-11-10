import { createDeck } from '../engine/cards.js'
import { applyAction, createTable, legalActions, startHand } from '../engine/index.js'
import { continueHand } from '../game/gameReducer.js'
import { GAME_CONFIG } from '../config.js'
import { assignUniqueProfiles, botView, decide, ensureLegal, PROFILES } from './index.js'
import { isCallAllIn, isVoluntaryAllIn } from './sizing.js'

export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffleDeck(rng) {
  const deck = createDeck()
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

function median(values) {
  if (!values.length) return 0
  const sorted = values.slice().sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

function classify(action, view) {
  if (action.type === 'fold') return 'fold'
  if (action.type === 'check') return 'check'
  if (action.type === 'call') return isCallAllIn(action, view) ? 'callAllIn' : 'call'
  if (isVoluntaryAllIn(action, view)) return 'voluntaryAllIn'
  if (action.type === 'bet') return 'bet'
  if (action.type === 'raise') return 'raise'
  return action.type
}

/**
 * All-bot table. Hero is just another heuristic seat so money flow is
 * unbiased. Does not alter engine shuffling, evaluation, or payouts.
 */
export function simulateTable({
  seats = 3,
  hands = 60,
  seed = 1,
  smallBlind = GAME_CONFIG.smallBlind,
  bigBlind = GAME_CONFIG.bigBlind,
  stack = GAME_CONFIG.startingStack,
} = {}) {
  const rng = mulberry32(seed)
  const ids = Array.from({ length: seats }, (_, index) => (index === 0 ? 'hero' : `bot-${index}`))
  const personalities = { hero: 'shark', ...assignUniqueProfiles(ids.slice(1), rng) }
  const counts = {
    fold: 0,
    check: 0,
    call: 0,
    bet: 0,
    raise: 0,
    voluntaryAllIn: 0,
    callAllIn: 0,
    total: 0,
  }
  const betSizes = []
  const raiseSizes = []
  const raiseToStack = []

  let engine = startHand(
    createTable({
      players: ids.map((id, seat) => ({ id, seat, stack })),
      smallBlind,
      bigBlind,
    }),
    { deck: shuffleDeck(rng) },
  )

  for (let hand = 0; hand < hands; hand += 1) {
    if (hand > 0) {
      const live = engine.players.filter((player) => player.stack > 0)
      if (live.length < 2) break
      engine = startHand(engine, { deck: shuffleDeck(rng) })
    }
    while (!engine.settled) {
      if (!engine.roundOpen) {
        engine = continueHand(engine)
        continue
      }
      const legal = legalActions(engine)
      if (!legal.playerId) {
        engine = continueHand(engine)
        continue
      }
      const view = botView(engine, legal.playerId)
      const profile = PROFILES[personalities[legal.playerId]] ?? PROFILES.rock
      const action = ensureLegal(decide(view, profile, rng), legal)
      const kind = classify(action, view)
      counts[kind] += 1
      counts.total += 1
      if (kind === 'bet') betSizes.push(action.amount)
      if (kind === 'raise') {
        raiseSizes.push(action.amount)
        raiseToStack.push(action.amount / (view.roundBet + view.stack))
      }
      engine = continueHand(applyAction(engine, { ...action, playerId: legal.playerId }))
    }
  }

  return {
    seats,
    hands,
    bigBlind,
    counts,
    rates: Object.fromEntries(
      Object.entries(counts)
        .filter(([key]) => key !== 'total')
        .map(([key, value]) => [key, counts.total ? value / counts.total : 0]),
    ),
    medianBet: median(betSizes),
    medianRaise: median(raiseSizes),
    medianRaiseStackFrac: median(raiseToStack),
  }
}
