import { formatHandName } from './handDescribe.js'
import { HERO_ID } from './constants.js'

function heroShare(pot) {
  const winners = pot.winnerIds ?? []
  if (!winners.includes(HERO_ID) || winners.length === 0) return 0
  return Math.floor((pot.amount ?? 0) / winners.length)
}

/** Session-only summary of a settled engine hand. */
export function summarizeSettledHand(engine, names = {}) {
  if (!engine?.settled || !engine.results) return null
  const payouts = engine.results.payouts ?? []
  const pot = payouts.reduce((sum, row) => sum + (row.amount ?? 0), 0)
  const winnerIds = [...new Set(payouts.flatMap((row) => row.winnerIds ?? []))]
  const split = payouts.some((row) => (row.winnerIds?.length ?? 0) > 1)
  const winnerNames = winnerIds.map((id) => names[id] ?? id)
  const handNames = winnerIds
    .map((id) => {
      const player = engine.players.find((row) => row.id === id)
      if (!player || engine.community.length < 5) return null
      return formatHandName([...(player.holeCards ?? []), ...engine.community])
    })
    .filter(Boolean)

  let result
  let handName
  if (engine.results.reason === 'fold') {
    result = `${winnerNames[0] ?? 'A player'} wins`
    handName = 'Everyone else folded'
  } else if (split) {
    result = 'Split pot'
    handName = [...new Set(handNames)].join(', ') || 'Split pot'
  } else {
    result = `${winnerNames[0] ?? 'A player'} wins`
    handName = handNames[0] ?? 'Showdown'
  }

  return {
    handNumber: engine.handNumber,
    pot,
    result,
    handName,
    heroAmount: payouts.reduce((sum, row) => sum + heroShare(row), 0),
  }
}

export function tableAnnouncement(view, blocking) {
  if (!view) return ''
  if (view.settled && !blocking) {
    const prefix = view.session?.over
      ? view.session.title
      : view.splitPot
        ? 'Split pot'
        : 'Hand result'
    const lines = (view.resultLines ?? [])
      .map((line) => [line.title, line.detail].filter(Boolean).join(', '))
      .join('. ')
    return [prefix, lines].filter(Boolean).join('. ')
  }
  if (blocking) {
    return view.streetLabel ? `${view.streetLabel}` : 'Dealing'
  }
  if (view.isHeroTurn) return 'Your turn'
  const thinking = view.seats?.find((seat) => seat.isThinking)
  if (thinking) return `${thinking.name} is thinking`
  const acted = view.seats?.find((seat) => seat.actionLabel?.text)
  if (acted) return `${acted.name} ${acted.actionLabel.text}`
  return view.streetLabel ?? ''
}
