import { waitMs } from './timing.js'

const MIN_BOX = 2

/** Felt-relative centre. Returns null instead of the felt origin when measurement is not ready. */
export function relativeCenter(el, root) {
  if (!el || !root) return null
  const box = el.getBoundingClientRect()
  const frame = root.getBoundingClientRect()
  if (box.width < MIN_BOX || box.height < MIN_BOX || frame.width < MIN_BOX || frame.height < MIN_BOX) {
    return null
  }
  return {
    x: box.left - frame.left + box.width / 2,
    y: box.top - frame.top + box.height / 2,
  }
}

export function isUsablePoint(point) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return false
  // (0, 0) is the felt origin fallback we must not use for dealing.
  if (point.x === 0 && point.y === 0) return false
  return true
}

export function waitForFrame(signal) {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve()
      return
    }
    const id = requestAnimationFrame(() => resolve())
    const onAbort = () => {
      cancelAnimationFrame(id)
      resolve()
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export function measureDealLayout(registry, playerIds) {
  const deck = relativeCenter(registry.deck, registry.felt)
  if (!isUsablePoint(deck)) return null
  const holes = {}
  for (const id of playerIds) {
    const hole =
      relativeCenter(registry.holes[id], registry.felt) ??
      relativeCenter(registry.seats[id], registry.felt)
    if (!isUsablePoint(hole)) return null
    holes[id] = hole
  }
  return { deck, holes }
}

export async function waitForDealLayout(registry, playerIds, signal, attempts = 30) {
  for (let i = 0; i < attempts; i += 1) {
    if (signal?.aborted) return null
    const layout = measureDealLayout(registry, playerIds)
    if (layout) return layout
    await waitForFrame(signal)
    await waitMs(16, signal)
  }
  return null
}
