import { useEffect, useRef, useState } from 'react'
import {
  decide,
  ensureLegal,
  legalFallback,
  botView,
  scheduleBotAction,
  thinkingDelayMs,
  turnToken,
  tokensMatch,
  PROFILES,
} from '../bots/index.js'
import { legalActions } from '../engine/index.js'
import { HERO_ID } from './constants.js'

export function useBotTurn({ screen, engine, personalities, applyBotAction, hold = false, rng = Math.random }) {
  const latest = useRef({ screen, engine, personalities })
  latest.current = { screen, engine, personalities }

  const legal = engine && !engine.settled && engine.roundOpen ? legalActions(engine) : null
  const actorId = legal?.playerId ?? null
  const isBotTurn = Boolean(actorId && actorId !== HERO_ID && screen === 'table' && !hold)
  const [thinkDelayMs, setThinkDelayMs] = useState(null)

  useEffect(() => {
    if (!isBotTurn) {
      setThinkDelayMs(null)
      return undefined
    }

    const scheduled = turnToken(engine, actorId)
    const delayMs = thinkingDelayMs(rng)
    setThinkDelayMs(delayMs)

    return scheduleBotAction({
      delayMs,
      isStale: () => {
        const now = latest.current
        if (now.screen !== 'table' || !now.engine || now.engine.settled) return true
        const currentLegal = legalActions(now.engine)
        return !tokensMatch(scheduled, turnToken(now.engine, currentLegal.playerId))
      },
      onFire: () => {
        const now = latest.current
        if (now.screen !== 'table' || !now.engine || now.engine.settled) return
        const currentLegal = legalActions(now.engine)
        if (!tokensMatch(scheduled, turnToken(now.engine, currentLegal.playerId))) return
        const playerId = currentLegal.playerId
        if (!playerId || playerId === HERO_ID) return

        const profileId = now.personalities?.[playerId]
        const profile = PROFILES[profileId] ?? PROFILES.rock
        let decision
        try {
          const view = botView(now.engine, playerId)
          decision = ensureLegal(decide(view, profile, rng), currentLegal)
        } catch {
          decision = legalFallback(currentLegal)
        }
        if (!decision) return
        applyBotAction({ ...decision, playerId })
      },
    })
  }, [
    isBotTurn,
    hold,
    actorId,
    engine?.handNumber,
    engine?.street,
    engine?.currentActor,
    applyBotAction,
    rng,
  ])

  return thinkDelayMs
}
