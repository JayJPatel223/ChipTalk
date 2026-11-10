import assert from 'node:assert/strict'
import { test } from 'node:test'
import { HERO_ID } from '../game/constants.js'
import { soundsForCue } from './cues.js'

test('deal and community cues stay short feedback sounds', () => {
  assert.deepEqual(soundsForCue({ type: 'dealCard' }), ['deal'])
  assert.deepEqual(soundsForCue({ type: 'heroFlip' }), ['flip'])
  assert.deepEqual(soundsForCue({ type: 'flop' }), ['flip'])
  assert.deepEqual(soundsForCue({ type: 'boardCard' }), ['flip'])
})

test('chip cues distinguish call, raise, and all-in', () => {
  assert.deepEqual(soundsForCue({ type: 'blinds' }), ['clink'])
  assert.deepEqual(soundsForCue({ type: 'bet', actionType: 'call', playerId: HERO_ID }), ['clink'])
  assert.deepEqual(soundsForCue({ type: 'bet', actionType: 'raise', playerId: HERO_ID }), ['raise'])
  assert.deepEqual(soundsForCue({ type: 'bet', allIn: true, playerId: HERO_ID }), ['allin'])
})

test('bot actions add a hidden personality stinger', () => {
  const context = { personalities: { 'bot-1': 'maniac' } }
  assert.deepEqual(soundsForCue({ type: 'fold', playerId: 'bot-1' }, context), ['fold', 'maniac'])
  assert.deepEqual(soundsForCue({ type: 'fold', playerId: HERO_ID }, context), ['fold'])
})

test('payout plays a win chime only for the user', () => {
  assert.deepEqual(
    soundsForCue({ type: 'payout', reason: 'showdown', payouts: [{ winnerIds: [HERO_ID], amount: 200 }] }),
    ['win'],
  )
  assert.deepEqual(
    soundsForCue({ type: 'payout', reason: 'showdown', payouts: [{ winnerIds: ['bot-1'], amount: 200 }] }),
    ['fold'],
  )
  assert.deepEqual(
    soundsForCue({ type: 'payout', reason: 'fold', payouts: [{ winnerIds: ['bot-1'], amount: 150 }] }),
    [],
  )
})
