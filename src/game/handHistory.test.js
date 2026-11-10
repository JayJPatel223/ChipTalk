import assert from 'node:assert/strict'
import { test } from 'node:test'
import { summarizeSettledHand, tableAnnouncement } from './handHistory.js'
import { fixtureFoldWin, fixtureNames, fixtureShowdown } from './visualFixtures.js'
import { HERO_ID } from './constants.js'

test('fold win summarizes pot, winner, and folded result', () => {
  const engine = fixtureFoldWin()
  const row = summarizeSettledHand(engine, fixtureNames(3))
  assert.equal(row.handNumber, engine.handNumber)
  assert.ok(row.pot > 0)
  assert.match(row.result, /wins/)
  assert.equal(row.handName, 'Everyone else folded')
})

test('showdown summary includes a hand name and pot', () => {
  const engine = fixtureShowdown()
  const row = summarizeSettledHand(engine, fixtureNames(2))
  assert.ok(row.pot > 0)
  assert.ok(row.handName.length > 3)
  assert.ok(row.result.includes('wins') || row.result === 'Split pot')
})

test('live announcements cover your turn, bot acts, and winners', () => {
  assert.equal(tableAnnouncement({ isHeroTurn: true, seats: [] }, false), 'Your turn')
  assert.equal(
    tableAnnouncement(
      { isHeroTurn: false, seats: [{ name: 'Bot 1', isThinking: true }] },
      false,
    ),
    'Bot 1 is thinking',
  )
  assert.equal(
    tableAnnouncement(
      {
        isHeroTurn: false,
        seats: [{ name: 'Bot 2', actionLabel: { text: 'Call 100' } }],
      },
      false,
    ),
    'Bot 2 Call 100',
  )
  assert.match(
    tableAnnouncement(
      {
        settled: true,
        splitPot: false,
        resultLines: [{ title: 'You win', detail: 'Pair of Aces' }],
        session: { over: false },
      },
      false,
    ),
    /You win/,
  )
  assert.equal(HERO_ID, 'hero')
})
