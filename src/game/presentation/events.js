import { HERO_ID } from '../constants.js'
import { formatActionLabel } from '../formatActionLabel.js'

export function snapshotEngine(engine) {
  if (!engine) return null
  return {
    handNumber: engine.handNumber,
    street: engine.street,
    settled: engine.settled,
    dealerSeat: engine.dealerSeat,
    currentActor: engine.currentActor,
    currentBet: engine.currentBet ?? 0,
    community: (engine.community ?? []).map((card) => ({ rank: card.rank, suit: card.suit })),
    results: engine.results
      ? {
          reason: engine.results.reason,
          payouts: (engine.results.payouts ?? []).map((pot) => ({
            amount: pot.amount,
            winnerIds: [...(pot.winnerIds ?? [])],
          })),
        }
      : null,
    players: engine.players.map((player) => ({
      id: player.id,
      seat: player.seat,
      stack: player.stack,
      roundBet: player.roundBet ?? 0,
      committed: player.committed ?? 0,
      folded: player.folded,
      allIn: player.allIn,
      busted: player.busted,
      holeCount: player.holeCards?.length ?? 0,
    })),
  }
}

export function dealSequence(players, dealerSeat) {
  const live = [...players].filter((player) => !player.busted).sort((a, b) => a.seat - b.seat)
  const start = live.findIndex((player) => player.seat > dealerSeat)
  const order = start < 0 ? live : [...live.slice(start), ...live.slice(0, start)]
  const cards = []
  for (let pass = 0; pass < 2; pass += 1) {
    for (const player of order) {
      cards.push({
        playerId: player.id,
        pass,
        isHero: player.id === HERO_ID,
      })
    }
  }
  return cards
}

function winningsFor(playerId, results) {
  if (!results?.payouts) return 0
  return results.payouts.reduce((sum, pot) => {
    if (!pot.winnerIds?.includes(playerId)) return sum
    const split = Math.max(1, pot.winnerIds.length)
    return sum + Math.floor(pot.amount / split)
  }, 0)
}

function streetBetAfter(prevPlayer, nextPlayer, nextSnap) {
  if (!nextSnap.settled) return nextPlayer.roundBet
  const won = winningsFor(nextPlayer.id, nextSnap.results)
  const stackAfterStreet = Math.max(0, nextPlayer.stack - won)
  const contributed = Math.max(0, prevPlayer.stack - stackAfterStreet)
  return prevPlayer.roundBet + contributed
}

function actorIdFrom(prev, intent) {
  if (intent?.action?.playerId) return intent.action.playerId
  if (prev?.currentActor == null) return null
  return prev.players.find((player) => player.seat === prev.currentActor)?.id ?? null
}

function betFromIntent(prev, intent) {
  const action = intent?.action
  if (!action || !prev) return null
  const actorId = actorIdFrom(prev, intent)
  const player = prev.players.find((row) => row.id === actorId)
  if (!player) return null
  if (action.type === 'fold' || action.type === 'check') return null
  let to = player.roundBet
  if (action.type === 'call') {
    to = Math.min(player.roundBet + player.stack, Math.max(prev.currentBet ?? 0, player.roundBet))
  } else if (action.type === 'bet' || action.type === 'raise') {
    to = action.amount ?? player.roundBet
  } else if (action.type === 'allIn') {
    to = player.roundBet + player.stack
  } else {
    return null
  }
  if (to <= player.roundBet) return null
  return {
    playerId: player.id,
    from: player.roundBet,
    to,
    delta: to - player.roundBet,
    allIn: action.type === 'allIn' || to >= player.roundBet + player.stack,
    stackAfter: player.stack - (to - player.roundBet),
  }
}

function actedFrom(prev, next, intent) {
  const playerId = actorIdFrom(prev, intent)
  if (!playerId) return null
  const prevPlayer = prev.players.find((row) => row.id === playerId)
  const nextPlayer = next.players.find((row) => row.id === playerId)
  if (!prevPlayer || !nextPlayer) return null

  const action = intent?.action ?? {}
  let type = action.type
  const allIn = action.type === 'allIn' || (nextPlayer.allIn && !prevPlayer.allIn)
  if (!type) {
    if (!prevPlayer.folded && nextPlayer.folded) type = 'fold'
    else if (allIn) type = 'allIn'
    else if (nextPlayer.roundBet > prevPlayer.roundBet) {
      const current = prev.currentBet ?? 0
      if (prevPlayer.roundBet < current && nextPlayer.roundBet <= current) type = 'call'
      else if (current > 0 && nextPlayer.roundBet > current) type = 'raise'
      else type = 'bet'
    } else if (intent?.action || intent?.kind === 'action') type = 'check'
  }
  const text = formatActionLabel({
    type,
    allIn,
    amount: action.amount ?? nextPlayer.roundBet,
    to: nextPlayer.roundBet,
    from: prevPlayer.roundBet,
    delta: Math.max(0, nextPlayer.roundBet - prevPlayer.roundBet),
  })
  if (!text) return null
  return {
    type: 'acted',
    id: `h${next.handNumber}:acted:${playerId}:${type ?? text}`,
    playerId,
    text,
  }
}

function boardEvents(prev, next, handNumber) {
  const events = []
  const prevLen = prev.community.length
  const nextLen = next.community.length
  if (nextLen <= prevLen) return events

  const gathered = prev.players
    .map((player) => ({ playerId: player.id, amount: player.roundBet }))
    .filter((row) => row.amount > 0)
  const potBehindAfter = prev.players.reduce((sum, player) => sum + player.committed, 0)
  events.push({
    type: 'gather',
    id: `h${handNumber}:gather:${prev.street}:${next.street}:${prevLen}:${nextLen}`,
    fromStreet: prev.street,
    bets: gathered,
    potBehindAfter,
  })

  const newCards = next.community.slice(prevLen)
  if (prevLen === 0 && newCards.length >= 3) {
    events.push({
      type: 'flop',
      id: `h${handNumber}:flop`,
      cards: newCards.slice(0, 3),
    })
    newCards.slice(3).forEach((card, index) => {
      events.push({
        type: 'boardCard',
        id: `h${handNumber}:board:${3 + index}`,
        card,
        index: 3 + index,
      })
    })
  } else {
    newCards.forEach((card, index) => {
      events.push({
        type: 'boardCard',
        id: `h${handNumber}:board:${prevLen + index}`,
        card,
        index: prevLen + index,
      })
    })
  }
  return events
}

/**
 * Pure engine-diff events. Identifiers are stable across Strict Mode rerenders.
 * Animations never call the engine; they only describe what the UI should show.
 */
export function eventsFromTransition(prev, next, intent = null) {
  if (!next) return []

  if (!prev || prev.handNumber !== next.handNumber) {
    const dealt = next.players.filter((player) => !player.busted)
    return [
      {
        type: 'deal',
        id: `h${next.handNumber}:deal`,
        handNumber: next.handNumber,
        dealerSeat: next.dealerSeat,
        cards: dealSequence(dealt, next.dealerSeat),
        players: dealt.map((player) => ({
          id: player.id,
          seat: player.seat,
          stack: player.stack + player.roundBet,
          isHero: player.id === HERO_ID,
        })),
      },
      {
        type: 'blinds',
        id: `h${next.handNumber}:blinds`,
        posts: next.players
          .filter((player) => player.roundBet > 0)
          .map((player) => ({
            playerId: player.id,
            amount: player.roundBet,
            stackAfter: player.stack,
          })),
      },
    ]
  }

  const events = []
  const handNumber = next.handNumber
  const fromIntent = betFromIntent(prev, intent)

  for (const nextPlayer of next.players) {
    const prevPlayer = prev.players.find((row) => row.id === nextPlayer.id)
    if (!prevPlayer) continue
    if (!prevPlayer.folded && nextPlayer.folded) {
      events.push({
        type: 'fold',
        id: `h${handNumber}:fold:${nextPlayer.id}`,
        playerId: nextPlayer.id,
      })
    }
  }

  if (fromIntent) {
    events.push({
      type: 'bet',
      id: `h${handNumber}:bet:${fromIntent.playerId}:${fromIntent.from}:${fromIntent.to}`,
      ...fromIntent,
    })
  } else {
    const actorId = actorIdFrom(prev, intent)
    for (const nextPlayer of next.players) {
      const prevPlayer = prev.players.find((row) => row.id === nextPlayer.id)
      if (!prevPlayer || nextPlayer.id !== actorId) continue
      const to = streetBetAfter(prevPlayer, nextPlayer, next)
      if (to > prevPlayer.roundBet) {
        events.push({
          type: 'bet',
          id: `h${handNumber}:bet:${nextPlayer.id}:${prevPlayer.roundBet}:${to}`,
          playerId: nextPlayer.id,
          from: prevPlayer.roundBet,
          to,
          delta: to - prevPlayer.roundBet,
          allIn: nextPlayer.allIn && !prevPlayer.allIn,
          stackAfter: Math.max(0, prevPlayer.stack - (to - prevPlayer.roundBet)),
        })
      }
    }
  }

  const acted = actedFrom(prev, next, intent)
  if (acted) events.push(acted)

  events.push(...boardEvents(prev, next, handNumber))

  if (!prev.settled && next.settled) {
    const alreadyGathered = events.some((event) => event.type === 'gather')
    const leftover = prev.players
      .map((player) => ({ playerId: player.id, amount: player.roundBet }))
      .filter((row) => row.amount > 0)
    if (!alreadyGathered && leftover.length) {
      events.push({
        type: 'gather',
        id: `h${handNumber}:gather:settle:${prev.street}`,
        fromStreet: prev.street,
        bets: leftover,
        potBehindAfter: prev.players.reduce((sum, player) => sum + player.committed, 0),
      })
    }
    if (next.results?.reason === 'showdown') {
      events.push({
        type: 'showdown',
        id: `h${handNumber}:showdown`,
        winnerIds: [...new Set((next.results.payouts ?? []).flatMap((pot) => pot.winnerIds))],
        payouts: next.results.payouts,
      })
    }
    events.push({
      type: 'payout',
      id: `h${handNumber}:payout`,
      reason: next.results?.reason ?? 'fold',
      payouts: next.results?.payouts ?? [],
      stacksAfter: Object.fromEntries(next.players.map((player) => [player.id, player.stack])),
    })
  }

  return events
}
