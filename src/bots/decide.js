import { isLatePosition } from './info.js'
import { resolveProfile } from './profiles.js'
import { pickSized, wantsAllIn } from './sizing.js'
import { startingHandScore } from './startingHands.js'
import { estimateEquity } from './equity.js'

export function legalFallback(legal) {
  if (legal.types.includes('check')) return { type: 'check' }
  if (legal.types.includes('fold')) return { type: 'fold' }
  return null
}

function can(legal, type) {
  return legal.types.includes(type)
}

function strength(view, rng, injectedEquity) {
  if (view.street === 'preflop') return startingHandScore(view.holeCards)
  if (typeof injectedEquity === 'number') return injectedEquity
  return estimateEquity({
    holeCards: view.holeCards,
    community: view.community,
    opponentCount: view.opponentsInHand,
    street: view.street,
    rng,
  })
}

function facingOpen(view) {
  const bb = view.bigBlind ?? 100
  const currentBet = view.currentBet ?? view.roundBet + (view.toCall ?? 0)
  return currentBet > bb
}

/**
 * Choose one legal action. Invalid proposals fall back to check, else fold.
 */
export function decide(view, profile, rng = Math.random, options = {}) {
  const legal = view.legal
  if (!legal?.types?.length) return legalFallback(legal ?? { types: [] })

  try {
    const style = resolveProfile(profile, rng)
    const late = isLatePosition(view) ? style.lateBonus : 0
    const score = strength(view, rng, options.equity)
    const toCall = view.toCall ?? 0
    const potOdds = toCall <= 0 ? 0 : toCall / Math.max(1, view.pot + toCall)
    const opened = facingOpen(view)
    const multiway = view.opponentsInHand >= 2
    const bb = view.bigBlind ?? 100
    const currentBet = view.currentBet ?? view.roundBet + toCall
    const bloated = currentBet >= style.maxContinueBb * bb
    const bluff = rng() < style.bluffFreq * (opened ? 0.2 : 1) && !multiway
    const goAllIn = wantsAllIn(view, style, score)

    if (toCall === 0) {
      const openLine = view.street === 'preflop' ? style.preflopOpen : style.postflopBet
      if ((score + late >= openLine || bluff) && can(legal, 'bet')) {
        return (
          pickSized(view, style, 'bet', { allowAllIn: goAllIn }) ??
          (can(legal, 'check') ? { type: 'check' } : legalFallback(legal))
        )
      }
      if ((score + late >= openLine || bluff) && can(legal, 'raise')) {
        return pickSized(view, style, 'raise', { allowAllIn: goAllIn }) ?? (can(legal, 'check') ? { type: 'check' } : legalFallback(legal))
      }
      if (can(legal, 'check')) return { type: 'check' }
      return legalFallback(legal)
    }

    const raiseLine = opened
      ? style.threeBet
      : view.street === 'preflop'
        ? style.preflopRaise
        : style.postflopRaise
    const needed = multiway ? Math.max(raiseLine, style.multiwayRaise) : raiseLine
    const callLine = view.street === 'preflop' ? style.preflopCall : potOdds - style.potOddsSlack
    const pricedIn = score + late >= callLine || score + style.potOddsSlack >= potOdds

    if (goAllIn && can(legal, 'allIn') && score >= style.allInEquity) {
      return { type: 'allIn' }
    }

    const mayRaise = !bloated && (score >= needed || (bluff && !opened)) && can(legal, 'raise')
    if (mayRaise) {
      const sized = pickSized(view, style, 'raise', { allowAllIn: goAllIn })
      if (sized && sized.type !== 'allIn') return sized
      if (sized?.type === 'allIn' && goAllIn) return sized
    }

    if (pricedIn && can(legal, 'call')) return { type: 'call' }
    if (can(legal, 'check')) return { type: 'check' }
    if (can(legal, 'fold')) return { type: 'fold' }
    return legalFallback(legal)
  } catch {
    return legalFallback(legal)
  }
}

export function ensureLegal(decision, legal) {
  if (!decision || !legal?.types?.includes(decision.type)) return legalFallback(legal)
  if ((decision.type === 'bet' || decision.type === 'raise') && !Number.isInteger(decision.amount)) {
    return legalFallback(legal)
  }
  if (decision.type === 'bet') {
    const allInTotal = legal.maxBet
    if (decision.amount > allInTotal) return legalFallback(legal)
    if (decision.amount < legal.minBet && decision.amount !== allInTotal) return legalFallback(legal)
  }
  if (decision.type === 'raise') {
    const allInTotal = legal.maxRaise
    if (decision.amount > allInTotal) return legalFallback(legal)
    if (decision.amount < legal.minRaise && decision.amount !== allInTotal) return legalFallback(legal)
  }
  return decision
}
