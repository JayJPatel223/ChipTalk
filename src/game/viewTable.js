import { legalActions } from '../engine/index.js'
import { GAME_CONFIG, formatChips } from '../config.js'
import { HERO_ID, STREET_LABELS } from './constants.js'
import { formatHandName, winningCardKeys } from './handDescribe.js'

export const EMPTY_LEGAL = {
  playerId: null,
  types: [],
  toCall: 0,
  minBet: 0,
  maxBet: 0,
  minRaise: 0,
  maxRaise: 0,
}

export function buildView(engine, names) {
  if (!engine) return null

  const isShowdown = engine.settled && engine.results?.reason === 'showdown'
  const winnerIds = new Set(
    isShowdown || engine.results?.reason === 'fold'
      ? (engine.results?.payouts ?? []).flatMap((pot) => pot.winnerIds)
      : [],
  )
  const winnerPots = winnerPotLabels(engine)
  const actor = engine.players.find((player) => player.seat === engine.currentActor)
  const dealer = engine.players.find((player) => player.seat === engine.dealerSeat)
  const streetBets = engine.players.reduce((sum, player) => sum + (player.roundBet ?? 0), 0)
  const committed = engine.players.reduce((sum, player) => sum + (player.committed ?? 0), 0)
  // Seat chips show this street. The center pile is only previous streets so
  // the same chips are not drawn twice. The label is the full pot in play.
  const potBehind = Math.max(0, committed - streetBets)
  const potLabel = engine.settled ? 0 : committed

  const seats = engine.players.map((player) => {
    const isHero = player.id === HERO_ID
    const botNumber = isHero ? null : Number.parseInt(String(player.id).replace('bot-', ''), 10)
    const holes = holeCardsForDisplay(player, { isHero, isShowdown })
    return {
      id: player.id,
      name: names[player.id] ?? player.id,
      botNumber: Number.isFinite(botNumber) ? botNumber : null,
      isHero,
      stack: player.stack,
      bet: engine.settled ? 0 : player.roundBet,
      folded: player.folded,
      allIn: player.allIn,
      busted: player.busted,
      isWinner: winnerIds.has(player.id),
      winnerPots: winnerPots.get(player.id) ?? [],
      isBlindSb: player.seat === engine.sbSeat,
      isBlindBb: player.seat === engine.bbSeat,
      isThinking:
        !engine.settled &&
        engine.roundOpen &&
        actor?.id === player.id &&
        !isHero &&
        !player.folded,
      cards: holes.cards,
      discarded: holes.discarded,
    }
  })

  const legal = engine.settled ? EMPTY_LEGAL : legalActions(engine)
  const splitPot =
    isShowdown && (engine.results?.payouts ?? []).some((pot) => (pot.winnerIds?.length ?? 0) > 1)
  const winners = engine.players.filter((player) => winnerIds.has(player.id) && !player.folded)
  const winKeys = isShowdown ? winningCardKeys(winners, engine.community) : []

  return {
    pot: potLabel,
    potBehind,
    dealerSeatId: dealer?.id ?? null,
    activeSeatId: engine.settled || !engine.roundOpen ? null : actor?.id ?? null,
    blinds: `${formatChips(GAME_CONFIG.smallBlind)} / ${formatChips(GAME_CONFIG.bigBlind)}`,
    street: engine.street,
    handNumber: engine.handNumber,
    streetLabel: STREET_LABELS[engine.street] ?? engine.street,
    community: engine.community.map((card) => ({ ...card, faceUp: true })),
    seats,
    legal,
    isHeroTurn: legal.playerId === HERO_ID && engine.roundOpen && !engine.settled,
    settled: engine.settled,
    isShowdown,
    splitPot,
    winningKeys: winKeys,
    results: engine.results,
    resultLines: resultLines(engine, names),
    session: sessionCopy(engine, names),
  }
}

function holeCardsForDisplay(player, { isHero, isShowdown }) {
  if (player.holeCards.length === 0) return { cards: [], discarded: [] }
  if (player.folded) {
    return {
      cards: [],
      discarded: player.holeCards.map(() => ({ rank: '?', suit: '?', faceUp: false })),
    }
  }
  if (isHero || isShowdown) {
    return {
      cards: player.holeCards.map((card) => ({ rank: card.rank, suit: card.suit, faceUp: true })),
      discarded: [],
    }
  }
  return {
    cards: player.holeCards.map(() => ({ rank: '?', suit: '?', faceUp: false })),
    discarded: [],
  }
}

function winnerPotLabels(engine) {
  const labels = new Map()
  if (!engine.settled || !engine.results?.payouts) return labels
  const many = engine.results.payouts.length > 1
  engine.results.payouts.forEach((pot, index) => {
    const label = many ? (index === 0 ? 'Main pot' : `Side pot ${index}`) : 'Winner'
    for (const id of pot.winnerIds) {
      const list = labels.get(id) ?? []
      list.push(label)
      labels.set(id, list)
    }
  })
  return labels
}

function sessionCopy(engine, names) {
  if (!engine.settled) return null
  const hero = engine.players.find((player) => player.id === HERO_ID)
  const withChips = engine.players.filter((player) => player.stack > 0)
  if (hero && hero.stack === 0) {
    return {
      over: true,
      title: 'Session over',
      message: 'You are out of chips.',
    }
  }
  if (withChips.length <= 1) {
    const winner = withChips[0]
    const youWon = winner?.id === HERO_ID
    return {
      over: true,
      title: youWon ? 'You won the table' : 'Session over',
      message: youWon
        ? 'You are the only player with chips left.'
        : `${names[winner?.id] ?? 'A bot'} is the only player with chips left.`,
    }
  }
  return { over: false }
}

function resultLines(engine, names) {
  if (!engine.settled || !engine.results) return []
  const { reason, payouts } = engine.results
  const split = payouts.some((pot) => (pot.winnerIds?.length ?? 0) > 1)

  if (reason === 'fold') {
    const winnerId = payouts[0]?.winnerIds[0]
    const winnerName = names[winnerId] ?? winnerId
    return [
      {
        title: winnerId === HERO_ID ? `${winnerName} win` : `${winnerName} wins`,
        detail: 'Everyone else folded.',
        amount: payouts.reduce((sum, pot) => sum + pot.amount, 0),
      },
    ]
  }

  return payouts.map((pot, index) => {
    const winnerNames = pot.winnerIds.map((id) => names[id] ?? id)
    const namesList = pot.winnerIds
      .map((id) => {
        const player = engine.players.find((row) => row.id === id)
        if (!player || engine.community.length < 5) return null
        return formatHandName([...(player.holeCards ?? []), ...engine.community])
      })
      .filter(Boolean)
    const potLabel = payouts.length > 1 ? (index === 0 ? 'Main pot' : `Side pot ${index}`) : split ? 'Split pot' : 'Pot'
    const uniqueNames = [...new Set(namesList)]
    return {
      title: `${potLabel}: ${winnerNames.join(' & ')}`,
      detail: uniqueNames.length ? uniqueNames.join(', ') : null,
      amount: pot.amount,
    }
  })
}
