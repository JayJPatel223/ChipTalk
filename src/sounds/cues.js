import { HERO_ID } from '../game/constants.js'

/**
 * Map a presentation cue to sound ids. Pure, so tests do not load Howler.
 * Gameplay never waits on these ids.
 */
export function soundsForCue(cue, context = {}) {
  if (!cue?.type) return []
  const heroId = context.heroId ?? HERO_ID
  const personalities = context.personalities ?? {}

  if (cue.type === 'dealCard') return ['deal']
  if (cue.type === 'flop' || cue.type === 'boardCard') return ['flip']
  if (cue.type === 'heroFlip') return ['flip']

  if (cue.type === 'blinds') return ['clink']
  if (cue.type === 'bet') {
    if (cue.allIn || cue.actionType === 'allIn') {
      return withBot(['allin'], cue.playerId, heroId, personalities)
    }
    if (cue.actionType === 'raise') {
      return withBot(['raise'], cue.playerId, heroId, personalities)
    }
    return withBot(['clink'], cue.playerId, heroId, personalities)
  }

  if (cue.type === 'fold') return withBot(['fold'], cue.playerId, heroId, personalities)

  if (cue.type === 'payout') {
    const winnerIds = (cue.payouts ?? []).flatMap((pot) => pot.winnerIds ?? [])
    if (winnerIds.includes(heroId)) return ['win']
    if (cue.reason === 'showdown') return ['fold']
    return []
  }

  return []
}

function withBot(ids, playerId, heroId, personalities) {
  if (!playerId || playerId === heroId) return ids
  const profile = personalities[playerId]
  if (profile && ['shark', 'rock', 'maniac', 'trickster'].includes(profile)) {
    return [...ids, profile]
  }
  return ids
}
