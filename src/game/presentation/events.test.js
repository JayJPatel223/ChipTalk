import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyAction, createTable, legalActions, startHand } from '../../engine/index.js'
import { continueHand } from '../gameReducer.js'
import { HERO_ID } from '../constants.js'
import { dealSequence, eventsFromTransition, snapshotEngine } from './events.js'
import { isUsablePoint, relativeCenter } from './layout.js'
import { overlayView } from './overlay.js'

function table(stacks) {
  return createTable({
    players: stacks.map((stack, index) => ({
      id: index === 0 ? HERO_ID : `bot-${index}`,
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

test('deal sequence is one card per seat before the second pass', () => {
  const cards = dealSequence(
    [
      { id: HERO_ID, seat: 0, busted: false },
      { id: 'bot-1', seat: 1, busted: false },
      { id: 'bot-2', seat: 2, busted: false },
    ],
    0,
  )
  assert.equal(cards.length, 6)
  assert.deepEqual(
    cards.map((card) => card.playerId),
    ['bot-1', 'bot-2', HERO_ID, 'bot-1', 'bot-2', HERO_ID],
  )
})

test('new hands emit a deal then blinds, not a shove', () => {
  const next = snapshotEngine(startHand(table([25_000, 25_000, 25_000])))
  const events = eventsFromTransition(null, next)
  assert.equal(events[0].type, 'deal')
  assert.equal(events[1].type, 'blinds')
  assert.ok(events[1].posts.every((post) => post.amount === 50 || post.amount === 100))
})

test('a fold event keeps later showdown private', () => {
  let state = startHand(table([25_000, 25_000, 25_000]))
  const before = snapshotEngine(state)
  state = act(state, 'fold')
  const events = eventsFromTransition(before, snapshotEngine(state), { action: { type: 'fold' } })
  assert.ok(events.some((event) => event.type === 'fold'))
  assert.equal(events.find((event) => event.type === 'acted')?.text, 'Fold')
  assert.equal(events.some((event) => event.type === 'showdown'), false)
})

test('street change gathers street bets then reveals the flop as three cards', () => {
  let state = startHand(table([25_000, 25_000]))
  state = act(state, 'call')
  const before = snapshotEngine(state)
  state = act(state, 'check')
  const events = eventsFromTransition(before, snapshotEngine(state), { action: { type: 'check' } })
  const types = events.map((event) => event.type)
  assert.ok(types.includes('gather'))
  assert.ok(types.includes('flop'))
  assert.equal(events.find((event) => event.type === 'flop').cards.length, 3)
})

test('all-in runout sequences remaining streets then showdown and payouts', () => {
  let state = startHand(table([300, 300]))
  state = act(state, 'allIn')
  const before = snapshotEngine(state)
  const legal = legalActions(state)
  state = act(state, 'allIn')
  const events = eventsFromTransition(before, snapshotEngine(state), {
    action: { type: 'allIn', playerId: legal.playerId },
  })
  const types = events.map((event) => event.type)
  assert.ok(types.includes('bet'))
  assert.ok(types.includes('gather'))
  assert.ok(types.includes('flop'))
  assert.equal(types.filter((type) => type === 'boardCard').length, 2)
  assert.ok(types.includes('showdown'))
  assert.ok(types.includes('payout'))
  assert.ok(types.indexOf('flop') < types.indexOf('showdown'))
  assert.ok(types.indexOf('showdown') < types.indexOf('payout'))
})

test('payout events keep engine winner ids and amounts', () => {
  let state = startHand(table([25_000, 25_000, 25_000]))
  state = act(state, 'fold')
  const before = snapshotEngine(state)
  state = act(state, 'fold')
  const events = eventsFromTransition(before, snapshotEngine(state), { action: { type: 'fold' } })
  const payout = events.find((event) => event.type === 'payout')
  assert.equal(payout.reason, 'fold')
  assert.ok(payout.payouts[0].amount > 0)
  assert.ok(payout.payouts[0].winnerIds.length >= 1)
})

test('overlay does not draw street bets in the centre pile', () => {
  const view = {
    handNumber: 1,
    pot: 150,
    potBehind: 0,
    community: [],
    isHeroTurn: true,
    activeSeatId: HERO_ID,
    isShowdown: false,
    settled: false,
    seats: [
      { id: HERO_ID, bet: 0, stack: 25000, cards: [], discarded: [], folded: false, isHero: true },
      { id: 'bot-1', bet: 50, stack: 24950, cards: [], discarded: [], folded: false, isHero: false },
      { id: 'bot-2', bet: 100, stack: 24900, cards: [], discarded: [], folded: false, isHero: false },
    ],
  }
  const presented = overlayView(
    view,
    {
      handNumber: 1,
      revealedCommunity: 0,
      bets: { [HERO_ID]: 0, 'bot-1': 50, 'bot-2': 100 },
      stacks: { [HERO_ID]: 25000, 'bot-1': 24950, 'bot-2': 24900 },
      potBehind: 0,
      holeCounts: { [HERO_ID]: 2, 'bot-1': 2, 'bot-2': 2 },
      holesReady: true,
      settledPot: false,
    },
    false,
  )
  assert.equal(presented.potBehind, 0)
  assert.equal(presented.pot, 150)
  assert.equal(presented.seats.find((seat) => seat.id === 'bot-2').bet, 100)
})

test('deal layout measurement rejects the felt origin fallback', () => {
  assert.equal(isUsablePoint(null), false)
  assert.equal(isUsablePoint({ x: 0, y: 0 }), false)
  assert.equal(isUsablePoint({ x: 180, y: 220 }), true)
  assert.equal(relativeCenter(null, {}), null)
})
