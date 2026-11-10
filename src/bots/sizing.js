/**
 * Bet/raise `amount` is the player's TOTAL contribution for this street
 * (engine convention), not the increment.
 *
 * Preflop: size from the big blind. Postflop: size from the pot.
 * Never snap a large target up to the remaining stack — that was turning
 * ordinary raises into all-ins.
 */
export function isVoluntaryAllIn(action, view) {
  if (!action) return false
  if (action.type === 'allIn') return true
  if (action.type !== 'bet' && action.type !== 'raise') return false
  const max = action.type === 'bet' ? view.legal.maxBet : view.legal.maxRaise
  return action.amount === max
}

export function isCallAllIn(action, view) {
  return action?.type === 'call' && view.toCall >= view.stack
}

export function wantsAllIn(view, style, score) {
  const bb = Math.max(1, view.bigBlind ?? 100)
  const stackBb = view.stack / bb
  const short = stackBb <= style.shortStackBb
  if (short && score >= style.shortAllInEquity) return true
  if (stackBb > style.shortStackBb && view.street === 'preflop') return false
  if (score >= style.nutEquity && view.street === 'river' && view.opponentsInHand === 1) {
    return true
  }
  return false
}

export function pickSized(view, style, kind, { allowAllIn = false } = {}) {
  const legal = view.legal
  const min = kind === 'bet' ? legal.minBet : legal.minRaise
  const max = kind === 'bet' ? legal.maxBet : legal.maxRaise
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 1) return null

  const bb = view.bigBlind ?? 100
  const currentBet = view.currentBet ?? view.roundBet + (view.toCall ?? 0)
  const remainingTotal = view.roundBet + view.stack

  let desired
  if (view.street === 'preflop') {
    const extraBb = kind === 'bet' ? style.preflopBetBb : style.preflopRaiseBb
    desired = kind === 'bet' ? extraBb * bb : currentBet + extraBb * bb
  } else {
    const frac = kind === 'bet' ? style.betPotFraction : style.raisePotFraction
    const extra = Math.round(view.pot * frac)
    desired = kind === 'bet' ? Math.max(min, extra) : currentBet + extra
  }

  desired = Math.round(desired)
  if (desired < min) desired = min

  const commitCap = Math.max(min, Math.floor(remainingTotal * style.maxCommitFraction))
  if (desired > commitCap && !allowAllIn) desired = commitCap

  if (desired < min) return null
  if (desired >= max) {
    if (allowAllIn && legal.types.includes('allIn')) return { type: 'allIn' }
    if (min < max) return { type: kind, amount: min }
    return null
  }
  return { type: kind, amount: desired }
}
