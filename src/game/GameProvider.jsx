import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { createDeck, shuffle } from '../engine/index.js'
import { assignUniqueProfiles } from '../bots/index.js'
import { gameReducer, initialGameState } from './gameReducer.js'
import { buildView } from './viewTable.js'
import { botId, HERO_ID } from './constants.js'
import { useBotTurn } from './useBotTurn.js'
import { snapshotEngine } from './presentation/events.js'
import { useTablePresentation } from './presentation/useTablePresentation.js'
import { useSoundEffects } from '../hooks/useSoundEffects.js'
import { soundManager } from '../sounds/soundManager.js'
import { summarizeSettledHand } from './handHistory.js'

const EMPTY_SESSION = { history: [], handsPlayed: 0, biggestPotWon: 0 }

const GameContext = createContext(null)

function freshDeck() {
  return shuffle(createDeck())
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState)
  const lockRef = useRef(false)
  const engineRef = useRef(state.engine)
  const intentRef = useRef({ seq: 0, kind: null, action: null, prevSnap: null })
  const blockingRef = useRef(false)
  const sound = useSoundEffects()
  const personalitiesRef = useRef(state.personalities)
  const [sessionStats, setSessionStats] = useState(EMPTY_SESSION)
  const recordedHandRef = useRef(null)
  engineRef.current = state.engine
  personalitiesRef.current = state.personalities

  useEffect(() => {
    lockRef.current = false
  }, [state])

  const commitIntent = useCallback((kind, action = null) => {
    intentRef.current = {
      seq: (intentRef.current.seq ?? 0) + 1,
      kind,
      action,
      prevSnap: snapshotEngine(engineRef.current),
    }
  }, [])

  const startGame = useCallback((botCount) => {
    if (lockRef.current) return
    lockRef.current = true
    const ids = Array.from({ length: botCount }, (_, index) => botId(index + 1))
    const personalities = assignUniqueProfiles(ids, Math.random)
    soundManager.unlock()
    commitIntent('start')
    recordedHandRef.current = null
    setSessionStats(EMPTY_SESSION)
    dispatch({ type: 'START_GAME', botCount, deck: freshDeck(), personalities })
  }, [commitIntent])

  const applyPlayerAction = useCallback((action) => {
    if (lockRef.current || blockingRef.current) return
    lockRef.current = true
    commitIntent('action', action)
    dispatch({ type: 'APPLY_ACTION', action })
  }, [commitIntent])

  const nextHand = useCallback(() => {
    if (lockRef.current || blockingRef.current) return
    lockRef.current = true
    commitIntent('nextHand')
    dispatch({ type: 'NEXT_HAND', deck: freshDeck() })
  }, [commitIntent])

  const backToSetup = useCallback(() => {
    commitIntent('leave')
    recordedHandRef.current = null
    setSessionStats(EMPTY_SESSION)
    dispatch({ type: 'BACK_TO_SETUP' })
  }, [commitIntent])

  const rematch = useCallback(() => {
    startGame(state.botCount)
  }, [startGame, state.botCount])

  useEffect(() => {
    const engine = state.engine
    if (state.screen !== 'table' || !engine?.settled) return
    const key = `${engine.handNumber}:${engine.results?.reason ?? 'done'}`
    if (recordedHandRef.current === key) return
    recordedHandRef.current = key
    const row = summarizeSettledHand(engine, state.names)
    if (!row) return
    setSessionStats((prev) => ({
      handsPlayed: prev.handsPlayed + 1,
      biggestPotWon: Math.max(prev.biggestPotWon, row.heroAmount),
      history: [row, ...prev.history].slice(0, 10),
    }))
  }, [state.engine, state.screen, state.names])

  const setBotCount = useCallback((botCount) => {
    dispatch({ type: 'SET_BOT_COUNT', botCount })
  }, [])

  const rawView = useMemo(() => buildView(state.engine, state.names), [state.engine, state.names])
  const onCue = useCallback((event) => {
    soundManager.cue(event, { heroId: HERO_ID, personalities: personalitiesRef.current })
  }, [])

  const presentation = useTablePresentation({
    engine: state.engine,
    screen: state.screen,
    view: rawView,
    intentRef,
    onCue,
  })
  blockingRef.current = presentation.blocking

  const thinkDelayMs = useBotTurn({
    screen: state.screen,
    engine: state.engine,
    personalities: state.personalities,
    applyBotAction: applyPlayerAction,
    hold: presentation.blocking,
  })

  const value = useMemo(() => {
    return {
      screen: state.screen,
      botCount: state.botCount,
      error: state.error,
      engine: state.engine,
      names: state.names,
      personalities: state.personalities,
      view: presentation.view,
      blocking: presentation.blocking,
      registry: presentation.registry,
      reducedMotion: presentation.reducedMotion,
      sound,
      thinkDelayMs,
      sessionStats,
      startGame,
      rematch,
      applyPlayerAction,
      nextHand,
      backToSetup,
      setBotCount,
    }
  }, [
    state,
    presentation.view,
    presentation.blocking,
    presentation.registry,
    presentation.reducedMotion,
    sound,
    thinkDelayMs,
    sessionStats,
    startGame,
    rematch,
    applyPlayerAction,
    nextHand,
    backToSetup,
    setBotCount,
  ])

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGameState() {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error('useGameState must be used within GameProvider')
  }
  return context
}
