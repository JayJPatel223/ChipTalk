export const THINK_MIN_MS = 800
export const THINK_MAX_MS = 1500

export function thinkingDelayMs(rng = Math.random) {
  return THINK_MIN_MS + Math.floor(rng() * (THINK_MAX_MS - THINK_MIN_MS + 1))
}

export function turnToken(engine, playerId) {
  if (!engine) return null
  return {
    handNumber: engine.handNumber,
    street: engine.street,
    actorId: playerId,
    currentActor: engine.currentActor,
  }
}

export function tokensMatch(left, right) {
  if (!left || !right) return false
  return (
    left.handNumber === right.handNumber &&
    left.street === right.street &&
    left.actorId === right.actorId &&
    left.currentActor === right.currentActor
  )
}

/**
 * Schedule a single bot action. Returns a cancel function.
 * Timers live outside React reducers. Strict Mode cleanup cancels the first run.
 */
export function scheduleBotAction({ delayMs, onFire, isStale }) {
  let cancelled = false
  const timer = setTimeout(() => {
    if (cancelled) return
    if (isStale && isStale()) return
    onFire()
  }, delayMs)
  return () => {
    cancelled = true
    clearTimeout(timer)
  }
}
