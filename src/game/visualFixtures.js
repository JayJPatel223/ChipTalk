import {
  applyAction,
  createTable,
  encodeCard,
  legalActions,
  startHand,
} from '../engine/index.js'
import { continueHand } from './gameReducer.js'
import { HERO_ID, botId, botName } from './constants.js'

export function fixtureNames(playerCount) {
  const names = { [HERO_ID]: 'You' }
  for (let index = 1; index < playerCount; index += 1) {
    names[botId(index)] = botName(index)
  }
  return names
}

function card(id) {
  const rank = id.slice(0, -1)
  const suit = id.slice(-1)
  return { rank, suit, code: encodeCard(rank, suit) }
}

function table(stacks) {
  return createTable({
    players: stacks.map((stack, index) => ({
      id: index === 0 ? HERO_ID : botId(index),
      stack,
      seat: index,
    })),
    smallBlind: 50,
    bigBlind: 100,
    dealerSeat: 0,
  })
}

function act(state, type, amount) {
  const legal = legalActions(state)
  return continueHand(
    applyAction(state, amount == null ? { type, playerId: legal.playerId } : { type, playerId: legal.playerId, amount }),
  )
}

function checkDown(state) {
  let next = state
  while (!next.settled) {
    if (next.roundOpen) {
      const legal = legalActions(next)
      if (legal.types.includes('check')) next = act(next, 'check')
      else if (legal.types.includes('call')) next = act(next, 'call')
      else next = act(next, 'fold')
    } else {
      next = continueHand(next)
    }
  }
  return next
}

/** Three-handed: Bot 1 folds, the hand is still live. */
export function fixtureBotFold() {
  let state = startHand(table([1000, 1000, 1000]))
  state = act(state, 'call')
  state = act(state, 'fold')
  return state
}

/** Heads-up check-down showdown with a known board. */
export function fixtureShowdown() {
  const deck = [
    card('As'),
    card('Kh'),
    card('Ad'),
    card('Kc'),
    card('2c'),
    card('9s'),
    card('8d'),
    card('4s'),
    card('3c'),
    card('7h'),
    card('5d'),
    card('6c'),
    card('2h'),
    card('10d'),
  ]
  let state = startHand(table([1000, 1000]), { deck })
  state = act(state, 'call')
  state = act(state, 'check')
  return checkDown(state)
}

/** All-in before the flop; board runs out and both hands are shown. */
export function fixtureAllInShowdown() {
  const deck = [
    card('As'),
    card('2c'),
    card('Ah'),
    card('3d'),
    card('4c'),
    card('9s'),
    card('8d'),
    card('7c'),
    card('5h'),
    card('6d'),
    card('Qc'),
    card('Jd'),
    card('10h'),
  ]
  let state = startHand(table([300, 300]), { deck })
  state = act(state, 'allIn')
  state = act(state, 'allIn')
  return state
}

/** Everyone folds to Bot 1; no showdown. */
export function fixtureFoldWin() {
  let state = startHand(table([1000, 1000, 1000]))
  state = act(state, 'fold')
  state = act(state, 'fold')
  return state
}
