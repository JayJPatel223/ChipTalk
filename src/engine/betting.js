import { createDeck } from './cards.js'
import { shuffle } from './shuffle.js'
import {
  blindSeats,
  firstPostflopSeat,
  firstPreflopSeat,
  liveForHand,
  nextSeat,
  playerAtSeat,
  rotateDealer,
} from './positions.js'
import { awardPots, buildPots, returnUncalledExcess, totalChips } from './pots.js'

const STREETS = ['preflop', 'flop', 'turn', 'river']

function clone(state) {
  return {
    ...state,
    players: state.players.map((player) => ({
      ...player,
      holeCards: player.holeCards ? player.holeCards.map((card) => ({ ...card })) : [],
    })),
    community: state.community.map((card) => ({ ...card })),
    deck: state.deck.map((card) => ({ ...card })),
    pots: state.pots.map((pot) => ({ ...pot, eligibleIds: pot.eligibleIds.slice() })),
    results: state.results
      ? { ...state.results, payouts: state.results.payouts.map((row) => ({ ...row, winnerIds: row.winnerIds.slice() })) }
      : null,
  }
}

function take(deck, count) {
  if (deck.length < count) throw new Error('betting: not enough cards in the deck')
  return { cards: deck.slice(0, count), deck: deck.slice(count) }
}

function canPutChips(player) {
  return !player.folded && !player.busted && !player.allIn && player.stack > 0
}

function needsToAct(state, player) {
  if (!canPutChips(player)) return false
  if (player.roundBet < state.currentBet) return true
  return !player.acted
}

function nextActor(state, fromSeat) {
  return nextSeat(state.players, fromSeat, (player) => needsToAct(state, player))
}

function inHand(player) {
  return !player.busted && player.holeCards.length > 0
}

function putIn(player, add, markedActed = true) {
  if (add < 0) throw new Error('betting: cannot withdraw chips mid-hand')
  if (add > player.stack) throw new Error('betting: not enough chips')
  const stack = player.stack - add
  return {
    ...player,
    stack,
    roundBet: player.roundBet + add,
    committed: player.committed + add,
    allIn: stack === 0,
    acted: markedActed,
  }
}

/**
 * Bet/raise `amount` is the player's total chips in for THIS street (roundBet),
 * not the increment. Example: facing 100, a raise to 300 uses amount: 300.
 */
function setRoundTotal(player, total) {
  return putIn(player, total - player.roundBet)
}

function replacePlayer(players, updated) {
  return players.map((player) => (player.id === updated.id ? updated : player))
}

function bettingPossible(state) {
  const contenders = state.players.filter((player) => !player.folded && inHand(player))
  const withChips = contenders.filter((player) => player.stack > 0 && !player.allIn)
  if (withChips.length === 0) return false
  if (withChips.length === 1) {
    const leader = withChips[0]
    return leader.roundBet < state.currentBet
  }
  return true
}

function roundComplete(state) {
  return state.players.every((player) => !needsToAct(state, player))
}

function resetStreet(players) {
  return players.map((player) => ({
    ...player,
    roundBet: 0,
    acted: player.folded || player.allIn || player.busted,
  }))
}

export function createTable({
  players,
  smallBlind,
  bigBlind,
  dealerSeat = 0,
}) {
  if (!Number.isInteger(smallBlind) || !Number.isInteger(bigBlind) || smallBlind < 1 || bigBlind < smallBlind) {
    throw new Error('createTable: invalid blinds')
  }
  const seated = players.map((player, index) => ({
    id: player.id,
    seat: player.seat ?? index,
    stack: player.stack,
    holeCards: [],
    folded: false,
    allIn: false,
    busted: player.stack === 0,
    roundBet: 0,
    committed: 0,
    acted: false,
  }))
  return {
    smallBlind,
    bigBlind,
    players: seated,
    dealerSeat,
    street: 'complete',
    community: [],
    deck: [],
    currentBet: 0,
    lastFullRaiseSize: bigBlind,
    lastFullBet: 0,
    currentActor: null,
    roundOpen: false,
    settled: true,
    pots: [],
    results: null,
    handNumber: 0,
    totalChips: totalChips(seated),
  }
}

function postBlind(player, amount) {
  const posted = Math.min(player.stack, amount)
  return putIn(player, posted, false)
}

function dealHoles(players, deck, dealerSeat, dealtIds) {
  const order = []
  let seat = dealerSeat
  const live = players.filter((player) => dealtIds.has(player.id))
  for (let i = 0; i < live.length; i += 1) {
    seat = nextSeat(players, seat, (player) => dealtIds.has(player.id))
    order.push(seat)
  }
  let nextDeck = deck
  let nextPlayers = players.map((player) => ({ ...player, holeCards: [] }))
  for (let round = 0; round < 2; round += 1) {
    for (const target of order) {
      const dealt = take(nextDeck, 1)
      nextDeck = dealt.deck
      nextPlayers = nextPlayers.map((player) =>
        player.seat === target
          ? { ...player, holeCards: [...player.holeCards, dealt.cards[0]] }
          : player,
      )
    }
  }
  return { players: nextPlayers, deck: nextDeck }
}

function dealCommunity(state, count) {
  const burn = take(state.deck, 1)
  const dealt = take(burn.deck, count)
  return {
    ...state,
    deck: dealt.deck,
    community: [...state.community, ...dealt.cards],
  }
}

export function startHand(state, options = {}) {
  if (!state.settled && state.street !== 'complete') {
    throw new Error('startHand: previous hand is still open')
  }
  const starting = clone(state)
  const shouldRotate = starting.handNumber > 0
  const dealerSeat = shouldRotate
    ? rotateDealer(starting.players, starting.dealerSeat)
    : starting.dealerSeat
  const { sbSeat, bbSeat, headsUp } = blindSeats(starting.players, dealerSeat)

  let players = starting.players.map((player) => ({
    ...player,
    holeCards: [],
    folded: false,
    allIn: false,
    busted: player.stack === 0,
    roundBet: 0,
    committed: 0,
    acted: false,
  }))
  const dealtIds = new Set(players.filter((player) => player.stack > 0).map((player) => player.id))

  const sb = postBlind(playerAtSeat(players, sbSeat), starting.smallBlind)
  players = replacePlayer(players, sb)
  const bb = postBlind(playerAtSeat(players, bbSeat), starting.bigBlind)
  players = replacePlayer(players, bb)

  const sourceDeck = options.deck ? options.deck.map((card) => ({ ...card })) : shuffle(createDeck())
  const dealt = dealHoles(players, sourceDeck, dealerSeat, dealtIds)
  players = dealt.players

  const currentBet = Math.max(...players.map((player) => player.roundBet))
  let actor = firstPreflopSeat(players, dealerSeat, bbSeat, headsUp)
  const preview = { players, currentBet }
  if (actor != null && !needsToAct(preview, playerAtSeat(players, actor))) {
    actor = nextSeat(players, actor, (player) => needsToAct(preview, player))
  }

  return {
    ...starting,
    players,
    dealerSeat,
    sbSeat,
    bbSeat,
    headsUp,
    street: 'preflop',
    community: [],
    deck: dealt.deck,
    currentBet,
    lastFullRaiseSize: starting.bigBlind,
    lastFullBet: currentBet,
    currentActor: actor,
    roundOpen: true,
    settled: false,
    pots: [],
    results: null,
    handNumber: starting.handNumber + 1,
    totalChips: totalChips(players),
  }
}

function raiseWindow(state, player) {
  const remainingTotal = player.roundBet + player.stack
  const toCall = Math.max(0, state.currentBet - player.roundBet)
  const minRaiseTo =
    state.currentBet === 0 ? state.bigBlind : state.currentBet + state.lastFullRaiseSize
  const canOpen = state.currentBet === 0 && player.stack > 0
  // A short all-in does not set acted=false on earlier players, so they cannot reraise.
  const raiseLegal = state.currentBet > 0 && remainingTotal > state.currentBet && !player.acted

  return {
    toCall,
    remainingTotal,
    minBet: state.bigBlind,
    maxBet: remainingTotal,
    minRaise: minRaiseTo,
    maxRaise: remainingTotal,
    canOpen,
    raiseLegal,
  }
}

export function legalActions(state) {
  if (!state.roundOpen || state.currentActor == null || state.settled) {
    return { playerId: null, types: [], toCall: 0, minBet: 0, maxBet: 0, minRaise: 0, maxRaise: 0 }
  }
  const player = playerAtSeat(state.players, state.currentActor)
  const window = raiseWindow(state, player)
  const types = []
  if (needsToAct(state, player)) {
    types.push('fold')
    if (window.toCall === 0) types.push('check')
    else types.push('call')
    if (window.canOpen && player.stack > 0) types.push('bet')
    if (window.raiseLegal) types.push('raise')
    if (player.stack > 0) types.push('allIn')
  }
  return {
    playerId: player.id,
    types,
    toCall: window.toCall,
    callTotal: player.roundBet + window.toCall,
    minBet: window.minBet,
    maxBet: window.maxBet,
    minRaise: window.minRaise,
    maxRaise: window.maxRaise,
    allInTotal: window.remainingTotal,
  }
}

function assertTurn(state, playerId) {
  const actor = playerAtSeat(state.players, state.currentActor)
  if (!actor || actor.id !== playerId) {
    throw new Error('applyAction: out of turn')
  }
  if (actor.folded || actor.allIn || actor.busted) {
    throw new Error('applyAction: player cannot act')
  }
}

function applyContribution(state, player, total) {
  const previousBet = state.currentBet
  const updated = setRoundTotal(player, total)
  const newBet = Math.max(previousBet, updated.roundBet)
  let lastFullRaiseSize = state.lastFullRaiseSize
  let lastFullBet = state.lastFullBet
  let reopen = false

  if (newBet > previousBet) {
    const fromLastFull = newBet - lastFullBet
    if (fromLastFull >= lastFullRaiseSize) {
      lastFullRaiseSize = fromLastFull
      lastFullBet = newBet
      reopen = true
    }
  }

  let players = replacePlayer(state.players, updated)
  if (reopen) {
    players = players.map((row) =>
      row.id === updated.id || row.folded || row.allIn || row.busted
        ? row
        : { ...row, acted: false },
    )
  }

  return {
    ...state,
    players,
    currentBet: newBet,
    lastFullRaiseSize,
    lastFullBet,
  }
}

function afterAction(state, fromSeat) {
  const next = { ...state }
  if (next.players.filter((player) => !player.folded && inHand(player)).length === 1) {
    return finishByFold(next)
  }
  if (!roundComplete(next)) {
    next.currentActor = nextActor(next, fromSeat)
    return next
  }
  next.roundOpen = false
  next.currentActor = null
  if (!bettingPossible(next) && next.street !== 'river') {
    return autoRunout(next)
  }
  if (!bettingPossible(next) && next.street === 'river') {
    return settleHand(next)
  }
  return next
}

function finishByFold(state) {
  const withReturn = { ...state, players: returnUncalledExcess(state.players) }
  const pots = buildPots(withReturn.players)
  const awarded = awardPots(withReturn.players, pots, [], withReturn.dealerSeat)
  return {
    ...withReturn,
    players: awarded.players,
    pots,
    street: 'complete',
    roundOpen: false,
    currentActor: null,
    settled: true,
    results: { reason: 'fold', payouts: awarded.payouts },
    totalChips: totalChips(awarded.players),
  }
}

function autoRunout(state) {
  let next = state
  while (next.street !== 'river') {
    next = advanceRound(next)
  }
  if (!roundComplete(next) && bettingPossible(next)) return next
  return settleHand({ ...next, roundOpen: false, currentActor: null })
}

export function applyAction(state, action) {
  if (state.settled || !state.roundOpen) {
    throw new Error('applyAction: betting is closed')
  }
  const legal = legalActions(state)
  if (!legal.types.includes(action.type)) {
    throw new Error(`applyAction: ${action.type} is not legal`)
  }
  const playerId = action.playerId ?? legal.playerId
  assertTurn(state, playerId)

  const next = clone(state)
  const player = playerAtSeat(next.players, next.currentActor)
  const window = raiseWindow(next, player)
  let updated = next

  if (action.type === 'fold') {
    updated.players = replacePlayer(next.players, { ...player, folded: true, acted: true })
  } else if (action.type === 'check') {
    if (window.toCall !== 0) throw new Error('applyAction: cannot check')
    updated.players = replacePlayer(next.players, { ...player, acted: true })
  } else if (action.type === 'call') {
    const callTotal = Math.min(player.roundBet + player.stack, next.currentBet)
    updated.players = replacePlayer(next.players, setRoundTotal(player, callTotal))
  } else if (action.type === 'bet') {
    const amount = action.amount
    if (next.currentBet !== 0) throw new Error('applyAction: bet only when no current bet')
    if (amount !== player.roundBet + player.stack && amount < next.bigBlind) {
      throw new Error('applyAction: min opening bet is the big blind')
    }
    if (amount > player.roundBet + player.stack) throw new Error('applyAction: amount exceeds stack')
    updated = applyContribution(next, player, amount)
  } else if (action.type === 'raise') {
    const amount = action.amount
    const allInTotal = player.roundBet + player.stack
    if (amount > allInTotal) throw new Error('applyAction: amount exceeds stack')
    if (amount <= next.currentBet) throw new Error('applyAction: raise must exceed current bet')
    const isAllIn = amount === allInTotal
    if (!isAllIn && amount < window.minRaise) {
      throw new Error('applyAction: raise is below the minimum full raise')
    }
    updated = applyContribution(next, player, amount)
  } else if (action.type === 'allIn') {
    updated = applyContribution(next, player, player.roundBet + player.stack)
  } else {
    throw new Error(`applyAction: unknown type ${action.type}`)
  }

  updated.totalChips = totalChips(updated.players)
  if (updated.totalChips !== state.totalChips) {
    throw new Error('applyAction: chip conservation failed')
  }
  return afterAction(updated, player.seat)
}

export function advanceRound(state) {
  if (state.settled) throw new Error('advanceRound: hand already settled')
  if (state.roundOpen && !roundComplete(state)) {
    throw new Error('advanceRound: betting round is still open')
  }
  if (state.street === 'river' || state.street === 'showdown' || state.street === 'complete') {
    throw new Error('advanceRound: no further streets')
  }

  const index = STREETS.indexOf(state.street)
  const nextStreet = STREETS[index + 1]
  let next = clone(state)
  const count = nextStreet === 'flop' ? 3 : 1
  next = dealCommunity(next, count)
  next.street = nextStreet
  next.players = resetStreet(next.players)
  next.currentBet = 0
  next.lastFullRaiseSize = next.bigBlind
  next.lastFullBet = 0
  next.roundOpen = bettingPossible(next)
  next.currentActor = next.roundOpen
    ? firstPostflopSeat(next.players, next.dealerSeat)
    : null
  if (next.roundOpen && next.currentActor != null) {
    const actor = playerAtSeat(next.players, next.currentActor)
    if (!actor || actor.folded || !needsToAct(next, actor)) {
      next.currentActor = nextSeat(next.players, next.dealerSeat, (player) => needsToAct(next, player))
    }
  }
  return next
}

export function settleHand(state) {
  if (state.settled) return clone(state)
  const next = clone(state)
  if (next.street !== 'river' && next.players.filter((player) => !player.folded && inHand(player)).length > 1) {
    throw new Error('settleHand: board is not complete')
  }
  const withReturn = { ...next, players: returnUncalledExcess(next.players) }
  const pots = buildPots(withReturn.players)
  const board = withReturn.community
  const awarded = awardPots(withReturn.players, pots, board, withReturn.dealerSeat)
  return {
    ...withReturn,
    players: awarded.players,
    pots,
    street: 'complete',
    roundOpen: false,
    currentActor: null,
    settled: true,
    results: { reason: 'showdown', payouts: awarded.payouts },
    totalChips: totalChips(awarded.players),
  }
}

export function chipCount(state) {
  return totalChips(state.players)
}

export function isRoundComplete(state) {
  return roundComplete(state)
}
