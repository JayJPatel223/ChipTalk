import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  applyAction,
  chipCount,
  createTable,
  encodeCard,
  isRoundComplete,
  legalActions,
  settleHand,
  startHand,
  advanceRound,
} from './index.js'

function card(id) {
  const rank = id.slice(0, -1)
  const suit = id.slice(-1)
  return { rank, suit, code: encodeCard(rank, suit) }
}

function table(stacks, extra = {}) {
  return createTable({
    players: stacks.map((stack, index) => ({ id: `p${index}`, stack, seat: index })),
    smallBlind: extra.smallBlind ?? 50,
    bigBlind: extra.bigBlind ?? 100,
    dealerSeat: extra.dealerSeat ?? 0,
  })
}

function byId(state, id) {
  return state.players.find((player) => player.id === id)
}

function act(state, type, amount) {
  const playerId = legalActions(state).playerId
  return applyAction(state, amount == null ? { type, playerId } : { type, playerId, amount })
}

test('posts blinds, caps short stacks, and starts three-handed action left of the BB', () => {
  const started = startHand(table([1000, 1000, 40]))
  assert.equal(started.street, 'preflop')
  assert.equal(started.sbSeat, 1)
  assert.equal(started.bbSeat, 2)
  assert.equal(byId(started, 'p1').committed, 50)
  assert.equal(byId(started, 'p2').committed, 40)
  assert.equal(byId(started, 'p2').allIn, true)
  assert.equal(started.currentBet, 50)
  assert.equal(byId(started, legalActions(started).playerId).id, 'p0')
  assert.equal(chipCount(started), 2040)
})

test('heads-up dealer posts the small blind and acts first preflop, then the BB acts first after the flop', () => {
  let state = startHand(table([1000, 1000], { dealerSeat: 0 }))
  assert.equal(state.headsUp, true)
  assert.equal(state.sbSeat, 0)
  assert.equal(state.bbSeat, 1)
  assert.equal(legalActions(state).playerId, 'p0')
  state = act(state, 'call')
  state = act(state, 'check')
  assert.equal(isRoundComplete(state), true)
  state = advanceRound(state)
  assert.equal(state.street, 'flop')
  assert.equal(legalActions(state).playerId, 'p1')
  state = act(state, 'fold')
  const next = startHand(state)
  assert.equal(next.dealerSeat, 1)
  assert.equal(next.sbSeat, 1)
  assert.equal(next.bbSeat, 0)
})

test('legal checks, calls, bets, raises, folds, and all-ins', () => {
  let state = startHand(table([1000, 1000, 1000]))
  assert.deepEqual(legalActions(state).types.sort(), ['allIn', 'call', 'fold', 'raise'].sort())
  state = act(state, 'call')
  state = act(state, 'call')
  const option = legalActions(state)
  assert.equal(option.playerId, 'p2')
  assert.ok(option.types.includes('check'))
  assert.ok(option.types.includes('raise'))
  state = act(state, 'check')
  state = advanceRound(state)
  assert.ok(legalActions(state).types.includes('bet'))
  state = act(state, 'bet', 100)
  state = act(state, 'raise', 250)
  state = act(state, 'fold')
  state = act(state, 'call')
  assert.equal(byId(state, 'p0').folded, true)
  assert.equal(isRoundComplete(state), true)
})

test('invalid actions throw and leave the original state unchanged', () => {
  const state = startHand(table([1000, 1000, 1000]))
  const snapshot = structuredClone(state)
  assert.throws(() => applyAction(state, { type: 'check', playerId: 'p0' }))
  assert.throws(() => applyAction(state, { type: 'fold', playerId: 'p1' }))
  assert.throws(() => applyAction(state, { type: 'raise', playerId: 'p0', amount: 150 }))
  assert.deepEqual(state, snapshot)
})

test('minimum full raise and short all-ins, including reopening', () => {
  let state = startHand(table([1000, 1000, 250]))
  state = act(state, 'raise', 200)
  assert.equal(legalActions(state).minRaise, 300)
  state = act(state, 'call')
  const short = act(state, 'allIn')
  assert.equal(byId(short, 'p2').roundBet, 250)
  const facingShort = legalActions(short)
  assert.equal(facingShort.playerId, 'p0')
  assert.equal(facingShort.types.includes('raise'), false)
  assert.ok(facingShort.types.includes('call'))

  let reopen = startHand(table([1000, 1000, 400]))
  reopen = act(reopen, 'raise', 200)
  reopen = act(reopen, 'call')
  reopen = act(reopen, 'allIn')
  const afterFull = legalActions(reopen)
  assert.equal(afterFull.playerId, 'p0')
  assert.ok(afterFull.types.includes('raise'))

  let stacked = startHand(table([1000, 250, 300]))
  stacked = act(stacked, 'raise', 200)
  stacked = act(stacked, 'allIn')
  assert.equal(byId(stacked, 'p0').acted, true)
  stacked = act(stacked, 'allIn')
  const afterStack = legalActions(stacked)
  assert.equal(afterStack.playerId, 'p0')
  assert.equal(byId(stacked, 'p0').acted, false)
  assert.ok(afterStack.types.includes('raise'))
})

test("big blind keeps the option after everyone calls", () => {
  let state = startHand(table([1000, 1000, 1000]))
  state = act(state, 'call')
  state = act(state, 'call')
  const bb = legalActions(state)
  assert.equal(bb.playerId, 'p2')
  assert.ok(bb.types.includes('check'))
  assert.ok(bb.types.includes('raise'))
  state = act(state, 'check')
  assert.equal(isRoundComplete(state), true)
})

test('round completes after checks, calls, and a raise that is called', () => {
  let state = startHand(table([1000, 1000, 1000]))
  state = act(state, 'call')
  state = act(state, 'call')
  state = act(state, 'check')
  assert.equal(state.roundOpen, false)
  state = advanceRound(state)
  state = act(state, 'check')
  state = act(state, 'check')
  state = act(state, 'check')
  assert.equal(state.roundOpen, false)
  state = advanceRound(state)
  state = act(state, 'bet', 100)
  state = act(state, 'call')
  state = act(state, 'call')
  assert.equal(state.roundOpen, false)
})

test('everyone folding to one player awards the pot without showdown', () => {
  let state = startHand(table([1000, 1000, 1000]))
  const chips = chipCount(state)
  state = act(state, 'fold')
  state = act(state, 'fold')
  assert.equal(state.settled, true)
  assert.equal(state.results.reason, 'fold')
  assert.equal(state.community.length, 0)
  assert.equal(byId(state, 'p2').stack, 1050)
  assert.equal(chipCount(state), chips)
  const again = settleHand(state)
  assert.equal(byId(again, 'p2').stack, 1050)
})

test('uncalled excess is returned before pots are awarded', () => {
  let state = startHand(table([1000, 1000, 1000]))
  state = act(state, 'raise', 400)
  state = act(state, 'fold')
  state = act(state, 'fold')
  assert.equal(byId(state, 'p0').stack, 1150)
  assert.equal(chipCount(state), 3000)
})

test('busted players are skipped on the next hand', () => {
  const deck = [
    card('2c'),
    card('7d'),
    card('As'),
    card('3c'),
    card('2d'),
    card('Ah'),
    card('4c'),
    card('9s'),
    card('8h'),
    card('5s'),
    card('6c'),
    card('Qc'),
    card('Jd'),
    card('10h'),
  ]
  let state = startHand(table([1000, 1000, 100]), { deck })
  state = act(state, 'raise', 1000)
  state = act(state, 'fold')
  if (state.roundOpen) state = act(state, 'allIn')
  assert.equal(state.settled, true)
  assert.equal(byId(state, 'p2').stack, 0)
  const next = startHand(state)
  assert.equal(byId(next, 'p2').holeCards.length, 0)
  assert.equal(next.players.filter((player) => player.holeCards.length === 2).length, 2)
  assert.equal(next.dealerSeat, 1)
})

function threeHandedDeck() {
  return [
    card('As'),
    card('2c'),
    card('Kh'),
    card('Ad'),
    card('3d'),
    card('7c'),
    card('4c'),
    card('9s'),
    card('8d'),
    card('4s'),
    card('5h'),
    card('Qc'),
    card('5d'),
    card('Jh'),
  ]
}

function checkDown(state) {
  let next = state
  while (!next.settled) {
    if (next.roundOpen) {
      const legal = legalActions(next)
      if (legal.types.includes('check')) next = act(next, 'check')
      else if (legal.types.includes('call')) next = act(next, 'call')
      else next = act(next, 'fold')
    } else if (next.street === 'river') {
      next = settleHand(next)
    } else {
      next = advanceRound(next)
    }
  }
  return next
}

test('multiple side pots with different winners', () => {
  let state = startHand(table([1000, 150, 1000]), { deck: threeHandedDeck() })
  const chips = chipCount(state)
  state = act(state, 'raise', 200)
  state = act(state, 'allIn')
  state = act(state, 'call')
  state = checkDown(state)
  assert.equal(state.settled, true)
  assert.equal(state.pots.length, 2)
  assert.deepEqual(state.pots[0].eligibleIds, ['p0', 'p1', 'p2'])
  assert.deepEqual(state.pots[1].eligibleIds, ['p0', 'p2'])
  assert.equal(byId(state, 'p1').stack, 450)
  assert.equal(byId(state, 'p0').stack, 900)
  assert.equal(byId(state, 'p2').stack, 800)
  assert.equal(chipCount(state), chips)
})

test('folded players contribute but cannot win, and all-in runs the board once', () => {
  const deck = [
    card('As'),
    card('Kh'),
    card('2c'),
    card('Ad'),
    card('Ks'),
    card('3d'),
    card('4c'),
    card('9c'),
    card('8d'),
    card('4s'),
    card('5c'),
    card('6h'),
    card('5d'),
    card('10h'),
  ]
  let state = startHand(table([300, 300, 300]), { deck })
  const chips = chipCount(state)
  state = act(state, 'allIn')
  state = act(state, 'fold')
  state = act(state, 'allIn')
  assert.equal(state.settled, true)
  assert.equal(state.community.length, 5)
  assert.equal(state.results.reason, 'showdown')
  assert.equal(byId(state, 'p1').stack, 250)
  assert.equal(chipCount(state), chips)
  const twice = settleHand(state)
  assert.deepEqual(
    twice.players.map((player) => player.stack),
    state.players.map((player) => player.stack),
  )
})

test('tied pots give leftover chips to the first winner left of the dealer', () => {
  const deck = [
    card('As'),
    card('2c'),
    card('Ah'),
    card('Ks'),
    card('3d'),
    card('Kh'),
    card('4c'),
    card('Ac'),
    card('Ad'),
    card('9s'),
    card('5c'),
    card('8h'),
    card('6d'),
    card('7d'),
  ]
  let state = startHand(table([51, 51, 51], { smallBlind: 1, bigBlind: 2, dealerSeat: 0 }), { deck })
  const chips = chipCount(state)
  state = act(state, 'allIn')
  state = act(state, 'allIn')
  state = act(state, 'allIn')
  assert.equal(state.settled, true)
  assert.equal(byId(state, 'p0').stack, 76)
  assert.equal(byId(state, 'p1').stack, 77)
  assert.equal(byId(state, 'p2').stack, 0)
  assert.equal(chipCount(state), chips)
})

