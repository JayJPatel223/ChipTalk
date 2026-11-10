import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  applyAction,
  createTable,
  legalActions,
  startHand,
} from '../engine/index.js'
import {
  PROFILES,
  assignUniqueProfiles,
  botView,
  decide,
  ensureLegal,
  legalFallback,
  scheduleBotAction,
  startingHandScore,
  tokensMatch,
  turnToken,
  unknownPool,
} from './index.js'

const rngHalf = () => 0.5
const rngHigh = () => 0.99

function holes(a, b) {
  return [
    { rank: a.slice(0, -1), suit: a.slice(-1) },
    { rank: b.slice(0, -1), suit: b.slice(-1) },
  ]
}

function facingBet(holeCards, extra = {}) {
  return {
    playerId: 'bot-1',
    holeCards,
    community: extra.community ?? [],
    street: extra.street ?? 'preflop',
    pot: extra.pot ?? 250,
    bigBlind: extra.bigBlind ?? 100,
    smallBlind: extra.smallBlind ?? 50,
    toCall: extra.toCall ?? 100,
    currentBet: extra.currentBet ?? 150,
    roundBet: extra.roundBet ?? 50,
    stack: extra.stack ?? 900,
    dealerSeat: 0,
    sbSeat: 1,
    bbSeat: 2,
    headsUp: false,
    opponentsInHand: extra.opponentsInHand ?? 2,
    players: extra.players ?? [
      { id: 'hero', seat: 0, stack: 900, folded: false, allIn: false, busted: false, roundBet: 100, committed: 100 },
      { id: 'bot-1', seat: 1, stack: 900, folded: false, allIn: false, busted: false, roundBet: 50, committed: 50 },
    ],
    legal: extra.legal ?? {
      playerId: 'bot-1',
      types: ['fold', 'call', 'raise', 'allIn'],
      toCall: 100,
      minBet: 100,
      maxBet: 950,
      minRaise: 200,
      maxRaise: 950,
      callTotal: 150,
    },
  }
}

test('rock folds junk while maniac continues, with the same RNG', () => {
  const junk = facingBet(holes('7c', '2d'))
  const rock = decide(junk, PROFILES.rock, rngHigh)
  const maniac = decide(junk, PROFILES.maniac, rngHigh)
  assert.equal(rock.type, 'fold')
  assert.ok(['call', 'raise', 'allIn'].includes(maniac.type), maniac.type)
})

test('premium hands stay aggressive across profiles', () => {
  const premiums = facingBet(holes('Ah', 'As'))
  const shark = decide(premiums, PROFILES.shark, rngHigh)
  const rock = decide(premiums, PROFILES.rock, rngHigh)
  assert.ok(['raise', 'call', 'allIn'].includes(shark.type))
  assert.ok(['raise', 'call', 'allIn'].includes(rock.type))
})

test('AA scores higher than 72 offsuit', () => {
  assert.ok(startingHandScore(holes('Ah', 'As')) > startingHandScore(holes('7c', '2d')))
})

test('bet and raise amounts stay inside engine limits', () => {
  const view = facingBet(holes('Ah', 'Kh'))
  const action = decide(view, PROFILES.maniac, rngHalf)
  if (action.type === 'raise' || action.type === 'bet') {
    const min = action.type === 'bet' ? view.legal.minBet : view.legal.minRaise
    const max = action.type === 'bet' ? view.legal.maxBet : view.legal.maxRaise
    assert.ok(action.amount >= min || action.amount === max)
    assert.ok(action.amount <= max)
    assert.equal(Number.isInteger(action.amount), true)
  }
  assert.ok(view.legal.types.includes(action.type))
})

test('invalid proposals fall back to check, otherwise fold', () => {
  const legal = { types: ['fold', 'call'] }
  assert.deepEqual(legalFallback({ types: ['check', 'fold'] }), { type: 'check' })
  assert.deepEqual(legalFallback(legal), { type: 'fold' })
  assert.deepEqual(ensureLegal({ type: 'raise', amount: 50 }, { types: ['fold', 'call'], minRaise: 200, maxRaise: 500 }), {
    type: 'fold',
  })
})

test('botView never includes opponent hole cards or the deck', () => {
  const table = createTable({
    players: [
      { id: 'hero', stack: 1000, seat: 0 },
      { id: 'bot-1', stack: 1000, seat: 1 },
    ],
    smallBlind: 50,
    bigBlind: 100,
  })
  const engine = startHand(table)
  const actor = legalActions(engine).playerId
  const botId = actor === 'hero' ? 'bot-1' : actor
  const view = botView(engine, botId)
  assert.equal('deck' in view, false)
  for (const player of view.players) {
    assert.equal('holeCards' in player, false)
  }
  const bot = engine.players.find((player) => player.id === botId)
  const hero = engine.players.find((player) => player.id === 'hero')
  const pool = unknownPool(bot.holeCards, engine.community)
  const own = new Set(bot.holeCards.map((card) => `${card.rank}${card.suit}`))
  assert.ok(pool.every((card) => !own.has(`${card.rank}${card.suit}`)))
  const heroKeys = hero.holeCards.map((card) => `${card.rank}${card.suit}`)
  assert.ok(heroKeys.every((key) => pool.some((card) => `${card.rank}${card.suit}` === key)))
})

test('assignUniqueProfiles gives each bot a different hidden profile', () => {
  const map = assignUniqueProfiles(['bot-1', 'bot-2', 'bot-3'], () => 0)
  const values = Object.values(map)
  assert.equal(new Set(values).size, 3)
  assert.ok(values.every((id) => ['shark', 'rock', 'maniac', 'trickster'].includes(id)))
})

test('scheduleBotAction cancel prevents a stale fire', async () => {
  let fired = 0
  const cancel = scheduleBotAction({
    delayMs: 20,
    onFire: () => {
      fired += 1
    },
  })
  cancel()
  await new Promise((resolve) => setTimeout(resolve, 40))
  assert.equal(fired, 0)
})

test('stale tokens skip the scheduled action', async () => {
  let fired = 0
  scheduleBotAction({
    delayMs: 15,
    isStale: () => true,
    onFire: () => {
      fired += 1
    },
  })
  await new Promise((resolve) => setTimeout(resolve, 35))
  assert.equal(fired, 0)
})

test('turn tokens distinguish hand, street, and actor', () => {
  const engine = { handNumber: 1, street: 'preflop', currentActor: 1 }
  assert.equal(tokensMatch(turnToken(engine, 'bot-1'), turnToken(engine, 'bot-1')), true)
  assert.equal(tokensMatch(turnToken(engine, 'bot-1'), turnToken({ ...engine, handNumber: 2 }, 'bot-1')), false)
})

test('short all-in raise below min full raise is allowed only as all-in sizing', () => {
  const legal = {
    types: ['fold', 'call', 'raise', 'allIn'],
    minRaise: 400,
    maxRaise: 250,
    toCall: 100,
  }
  const ok = ensureLegal({ type: 'raise', amount: 250 }, legal)
  assert.equal(ok.type, 'raise')
  const bad = ensureLegal({ type: 'raise', amount: 300 }, legal)
  assert.equal(bad.type, 'fold')
})

test('decide still works after a real engine applyAction', () => {
  const table = createTable({
    players: [
      { id: 'hero', stack: 1000, seat: 0 },
      { id: 'bot-1', stack: 1000, seat: 1 },
      { id: 'bot-2', stack: 1000, seat: 2 },
    ],
    smallBlind: 50,
    bigBlind: 100,
  })
  let engine = startHand(table)
  engine = applyAction(engine, { type: 'call', playerId: 'hero' })
  const legal = legalActions(engine)
  const view = botView(engine, legal.playerId)
  const action = ensureLegal(decide(view, PROFILES.shark, rngHalf), legal)
  assert.ok(legal.types.includes(action.type))
  const next = applyAction(engine, { ...action, playerId: legal.playerId })
  assert.ok(next)
})
