import {
  advanceRound,
  createTable,
  settleHand,
  startHand,
  applyAction,
} from '../engine/index.js'
import { GAME_CONFIG } from '../config.js'
import { HERO_ID, botId, botName } from './constants.js'

export const initialGameState = {
  screen: 'setup',
  botCount: 2,
  names: { [HERO_ID]: 'You' },
  personalities: {},
  engine: null,
  error: null,
}

/**
 * Advance at most one pending engine transition after an action.
 * applyAction already auto-runs the board and settles when no one can bet,
 * and it already settles fold-wins. React only steps a completed betting
 * round to the next street, or settles a finished river.
 */
export function continueHand(engine) {
  if (!engine || engine.settled || engine.roundOpen) return engine
  if (engine.street === 'river' || engine.street === 'showdown' || engine.street === 'complete') {
    return settleHand(engine)
  }
  return advanceRound(engine)
}

export function sessionFrom(engine) {
  if (!engine?.settled) return { over: false }
  const hero = engine.players.find((player) => player.id === HERO_ID)
  const withChips = engine.players.filter((player) => player.stack > 0)
  if (!hero || hero.stack === 0) {
    return { over: true, reason: 'busted' }
  }
  if (withChips.length <= 1) {
    return { over: true, reason: 'won', winnerId: withChips[0]?.id ?? HERO_ID }
  }
  return { over: false }
}

function buildRoster(botCount) {
  const count = Math.min(GAME_CONFIG.maxBots, Math.max(GAME_CONFIG.minBots, botCount))
  const names = { [HERO_ID]: 'You' }
  const players = [{ id: HERO_ID, seat: 0, stack: GAME_CONFIG.startingStack }]
  for (let index = 1; index <= count; index += 1) {
    const id = botId(index)
    names[id] = botName(index)
    players.push({ id, seat: index, stack: GAME_CONFIG.startingStack })
  }
  return { names, players }
}

function withEngine(state, engine, extra = {}) {
  return {
    ...state,
    engine,
    error: null,
    ...extra,
  }
}

export function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_BOT_COUNT':
      return { ...state, botCount: action.botCount }

    case 'START_GAME': {
      if (!action.deck) throw new Error('START_GAME requires a shuffled deck')
      const { names, players } = buildRoster(action.botCount ?? state.botCount)
      const table = createTable({
        players,
        smallBlind: GAME_CONFIG.smallBlind,
        bigBlind: GAME_CONFIG.bigBlind,
        dealerSeat: 0,
      })
      const engine = startHand(table, { deck: action.deck })
      return withEngine(
        {
          ...state,
          screen: 'table',
          botCount: players.length - 1,
          names,
          personalities: action.personalities ?? {},
        },
        engine,
      )
    }

    case 'APPLY_ACTION': {
      if (!state.engine || state.engine.settled) {
        return { ...state, error: 'The hand is already over.' }
      }
      try {
        const engine = continueHand(applyAction(state.engine, action.action))
        return withEngine(state, engine)
      } catch (error) {
        return { ...state, error: readableError(error) }
      }
    }

    case 'NEXT_HAND': {
      if (!state.engine) return state
      const session = sessionFrom(state.engine)
      if (session.over) {
        return { ...state, error: 'This session is over. Return to setup to play again.' }
      }
      if (!action.deck) throw new Error('NEXT_HAND requires a shuffled deck')
      try {
        const engine = startHand(state.engine, { deck: action.deck })
        return withEngine(state, engine)
      } catch (error) {
        return { ...state, error: readableError(error) }
      }
    }

    case 'BACK_TO_SETUP':
      return {
        ...initialGameState,
        botCount: state.botCount,
      }

    case 'SET_ERROR':
      return { ...state, error: action.message }

    case 'CLEAR_ERROR':
      return { ...state, error: null }

    default:
      return state
  }
}

function readableError(error) {
  const text = error instanceof Error ? error.message : String(error)
  return text.replace(/^(applyAction|startHand|advanceRound|settleHand):\s*/i, '')
}
