/** Event motions (ms). Looping CSS handles turn glow separately. */
export const TIMING = {
  dealTravel: 380,
  dealStagger: 70,
  dealFlip: 280,
  chipTravel: 320,
  allInTravel: 420,
  gatherTravel: 360,
  flopStagger: 90,
  boardFlip: 300,
  foldTravel: 340,
  showdownFlip: 360,
  payoutTravel: 480,
  reducedFade: 90,
  safetyPad: 120,
}

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function waitMs(ms, signal) {
  const duration = Math.max(0, ms)
  if (duration === 0) return Promise.resolve()
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, duration)
    const onAbort = () => {
      clearTimeout(timer)
      resolve()
    }
    if (signal) {
      if (signal.aborted) {
        onAbort()
        return
      }
      signal.addEventListener('abort', onAbort, { once: true })
    }
  })
}

export function durationFor(reduced, fullMs) {
  return reduced ? TIMING.reducedFade : fullMs
}
