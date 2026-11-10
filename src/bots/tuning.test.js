import assert from 'node:assert/strict'
import { test } from 'node:test'
import { GAME_CONFIG } from '../config.js'
import { PROFILES, decide, ensureLegal } from './index.js'
import { isVoluntaryAllIn, pickSized } from './sizing.js'
import { simulateTable } from './simulate.js'

const rngHigh = () => 0.99

function holes(a, b) {
  return [
    { rank: a.slice(0, -1), suit: a.slice(-1) },
    { rank: b.slice(0, -1), suit: b.slice(-1) },
  ]
}

function openingView() {
  return {
    playerId: 'bot-1',
    holeCards: holes('Ah', 'Kh'),
    community: [],
    street: 'preflop',
    pot: 150,
    bigBlind: 100,
    smallBlind: 50,
    toCall: 0,
    currentBet: 0,
    roundBet: 0,
    stack: 10_000,
    dealerSeat: 0,
    opponentsInHand: 2,
    players: [{ id: 'bot-1', seat: 1, stack: 10_000, folded: false, allIn: false, busted: false, roundBet: 0, committed: 0 }],
    legal: {
      playerId: 'bot-1',
      types: ['fold', 'check', 'bet', 'allIn'],
      toCall: 0,
      minBet: 100,
      maxBet: 10_000,
      minRaise: 100,
      maxRaise: 10_000,
    },
  }
}

function facingRaiseView(hole, extra = {}) {
  return {
    playerId: 'bot-1',
    holeCards: holes(...hole),
    community: extra.community ?? [],
    street: extra.street ?? 'preflop',
    pot: extra.pot ?? 450,
    bigBlind: 100,
    smallBlind: 50,
    toCall: extra.toCall ?? 200,
    currentBet: extra.currentBet ?? 250,
    roundBet: extra.roundBet ?? 50,
    stack: extra.stack ?? 9950,
    dealerSeat: 0,
    opponentsInHand: extra.opponentsInHand ?? 2,
    players: extra.players ?? [],
    legal: extra.legal ?? {
      playerId: 'bot-1',
      types: ['fold', 'call', 'raise', 'allIn'],
      toCall: 200,
      minBet: 100,
      maxBet: 10_000,
      minRaise: 400,
      maxRaise: 10_000,
      callTotal: 250,
    },
  }
}

test('GAME_CONFIG blinds are 50 / 100 with a 25,000 stack', () => {
  assert.equal(GAME_CONFIG.smallBlind, 50)
  assert.equal(GAME_CONFIG.bigBlind, 100)
  assert.equal(GAME_CONFIG.startingStack, 25_000)
})

test('opening bets stay near a few big blinds, not the stack', () => {
  const view = openingView()
  const sized = pickSized(view, PROFILES.maniac, 'bet')
  assert.equal(sized.type, 'bet')
  assert.ok(sized.amount <= 6 * view.bigBlind, `open ${sized.amount}`)
  assert.ok(sized.amount >= view.legal.minBet)
  assert.equal(isVoluntaryAllIn(sized, view), false)
})

test('a medium hand facing a raise does not voluntary all-in', () => {
  const view = facingRaiseView(['9h', '8h'])
  for (const id of ['rock', 'shark', 'trickster', 'maniac']) {
    const action = ensureLegal(decide(view, PROFILES[id], rngHigh), view.legal)
    assert.equal(isVoluntaryAllIn(action, view), false, id)
    assert.ok(['fold', 'call'].includes(action.type), `${id} ${action.type}`)
  }
})

test('junk never chooses a voluntary all-in', () => {
  const view = facingRaiseView(['7c', '2d'])
  const action = ensureLegal(decide(view, PROFILES.maniac, rngHigh), view.legal)
  assert.notEqual(action.type, 'allIn')
  assert.equal(isVoluntaryAllIn(action, view), false)
})

test('sizing never snaps a raise to the remaining stack', () => {
  const view = facingRaiseView(['Ah', 'Kh'], { pot: 8000, toCall: 200, currentBet: 250 })
  view.legal.maxRaise = 10_000
  const sized = pickSized(view, PROFILES.maniac, 'raise')
  assert.ok(sized)
  assert.notEqual(sized.type, 'allIn')
  assert.ok(sized.amount < 0.3 * (view.roundBet + view.stack))
})

test('rock folds junk; shark raises premiums; maniac is loosest', () => {
  const junk = facingRaiseView(['7c', '2d'])
  const premiums = facingRaiseView(['Ah', 'As'])
  assert.equal(decide(junk, PROFILES.rock, rngHigh).type, 'fold')
  const shark = decide(premiums, PROFILES.shark, rngHigh)
  assert.ok(['raise', 'call'].includes(shark.type), shark.type)
  if (shark.type === 'raise') assert.ok(shark.amount <= 12 * 100)
  const maniacJunk = decide(junk, PROFILES.maniac, rngHigh)
  assert.ok(['call', 'fold'].includes(maniacJunk.type))
})

test('simulated tables stay call/check/fold-heavy with rare voluntary all-ins', () => {
  const rows = [2, 3, 5].map((seats) => simulateTable({ seats, hands: 48, seed: 7 }))
  for (const row of rows) {
    const passive = row.rates.fold + row.rates.check + row.rates.call
    const minPassive = row.seats === 2 ? 0.58 : 0.65
    assert.ok(row.counts.total > 20, `seats ${row.seats} produced ${row.counts.total} actions`)
    assert.ok(row.rates.voluntaryAllIn < 0.04, `seats ${row.seats} vol AI ${row.rates.voluntaryAllIn}`)
    assert.ok(passive > minPassive, `seats ${row.seats} passive ${passive}`)
    assert.ok(row.medianRaise === 0 || row.medianRaise <= 12 * row.bigBlind, `median raise ${row.medianRaise}`)
    assert.ok(row.medianBet === 0 || row.medianBet <= 8 * row.bigBlind, `median bet ${row.medianBet}`)
    console.log(
      `sim seats=${row.seats} n=${row.counts.total} fold=${row.rates.fold.toFixed(2)} check=${row.rates.check.toFixed(2)} call=${row.rates.call.toFixed(2)} bet=${row.rates.bet.toFixed(2)} raise=${row.rates.raise.toFixed(2)} volAI=${row.rates.voluntaryAllIn.toFixed(3)} callAI=${row.rates.callAllIn.toFixed(3)} medBet=${row.medianBet} medRaise=${row.medianRaise}`,
    )
  }
})
