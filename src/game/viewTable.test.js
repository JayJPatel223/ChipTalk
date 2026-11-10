import assert from 'node:assert/strict'
import { test } from 'node:test'
import { startHand } from '../engine/index.js'
import { buildView } from './viewTable.js'
import { HERO_ID } from './constants.js'
import {
  fixtureAllInShowdown,
  fixtureBotFold,
  fixtureFoldWin,
  fixtureNames,
  fixtureShowdown,
} from './visualFixtures.js'

function seat(view, id) {
  return view.seats.find((row) => row.id === id)
}

test('folded bot shows a Folded label, dimmed seat, and face-down discards', () => {
  const engine = fixtureBotFold()
  const view = buildView(engine, fixtureNames(3))
  const bot = seat(view, 'bot-1')
  assert.equal(bot.folded, true)
  assert.equal(bot.cards.length, 0)
  assert.equal(bot.discarded.length, 2)
  assert.ok(bot.discarded.every((card) => card.faceUp === false && card.rank === '?'))
  assert.equal(view.isShowdown, false)
  assert.equal(seat(view, 'bot-2').cards.every((card) => card.faceUp === false), true)
  assert.equal(seat(view, HERO_ID).cards.every((card) => card.faceUp === true), true)
})

test('showdown reveals remaining players and marks winners from engine results', () => {
  const engine = fixtureShowdown()
  assert.equal(engine.results.reason, 'showdown')
  const view = buildView(engine, fixtureNames(2))
  assert.equal(view.isShowdown, true)
  assert.equal(view.street, 'complete')
  for (const row of view.seats) {
    assert.equal(row.folded, false)
    assert.equal(row.discarded.length, 0)
    assert.equal(row.cards.length, 2)
    assert.ok(row.cards.every((card) => card.faceUp === true && card.rank !== '?'))
  }
  assert.ok(view.seats.some((row) => row.isWinner))
})

test('all-in showdown still reveals hole cards of players who never folded', () => {
  const engine = fixtureAllInShowdown()
  assert.equal(engine.settled, true)
  assert.equal(engine.results.reason, 'showdown')
  const view = buildView(engine, fixtureNames(2))
  assert.equal(view.isShowdown, true)
  for (const row of view.seats) {
    assert.equal(row.folded, false)
    assert.equal(row.cards.length, 2)
    assert.ok(row.cards.every((card) => card.faceUp === true))
  }
})

test('a win by folds does not reveal bot hole cards', () => {
  const engine = fixtureFoldWin()
  assert.equal(engine.results.reason, 'fold')
  const view = buildView(engine, fixtureNames(3))
  assert.equal(view.isShowdown, false)
  const hero = seat(view, HERO_ID)
  const bot1 = seat(view, 'bot-1')
  const bot2 = seat(view, 'bot-2')
  assert.equal(hero.folded, true)
  assert.equal(bot1.folded, true)
  assert.equal(bot2.folded, false)
  assert.equal(bot2.isWinner, true)
  assert.equal(bot2.cards.length, 2)
  assert.ok(bot2.cards.every((card) => card.faceUp === false))
  assert.equal(bot1.discarded.length, 2)
  assert.ok(bot1.discarded.every((card) => card.faceUp === false))
})

test('next hand clears discards, folded labels, reveals, and winner marks', () => {
  const settled = fixtureFoldWin()
  const next = startHand(settled)
  const view = buildView(next, fixtureNames(3))
  assert.equal(next.settled, false)
  for (const row of view.seats) {
    assert.equal(row.folded, false)
    assert.equal(row.isWinner, false)
    assert.equal(row.discarded.length, 0)
    assert.equal(row.winnerPots.length, 0)
  }
  const bots = view.seats.filter((row) => !row.isHero)
  assert.ok(bots.every((row) => row.cards.every((card) => card.faceUp === false)))
})
