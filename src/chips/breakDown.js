/** Standard casino colours, highest first. */
export const CHIP_DENOMS = [
  { value: 1000, color: '#d4a017', edge: '#fff8d0', ring: '#fff3c4', name: 'gold' },
  { value: 500, color: '#6b3fa0', edge: '#f4e8ff', ring: '#d7b8f0', name: 'purple' },
  { value: 100, color: '#1a1a1a', edge: '#f3d15a', ring: '#f0d36a', name: 'black' },
  { value: 25, color: '#1f9d4a', edge: '#fff', ring: '#d7f0c8', name: 'green' },
  { value: 5, color: '#c62828', edge: '#fff', ring: '#ffd4d4', name: 'red' },
  { value: 1, color: '#f4f1ea', edge: '#8a8478', ring: '#d9d3c7', name: 'white' },
]

const DEFAULT_MAX_CHIPS = 12
const DEFAULT_MAX_PER_DENOM = 8

/**
 * Greedy chip breakdown for drawing a pile, not for accounting.
 * Caps how many disks are painted so a 25,000 stack stays a handful of nodes.
 */
export function breakDownAmount(amount, options = {}) {
  const maxChips = options.maxChips ?? DEFAULT_MAX_CHIPS
  const maxPerDenom = options.maxPerDenom ?? DEFAULT_MAX_PER_DENOM
  const raw = Number(amount)
  let remaining = Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : 0
  if (remaining === 0 || maxChips <= 0) return []

  const piles = []
  let drawn = 0

  for (const denom of CHIP_DENOMS) {
    if (drawn >= maxChips) break
    const want = Math.floor(remaining / denom.value)
    const count = Math.min(want, maxPerDenom, maxChips - drawn)
    if (count <= 0) continue
    piles.push({ ...denom, count })
    remaining -= count * denom.value
    drawn += count
  }

  if (remaining > 0 && drawn < maxChips) {
    const white = CHIP_DENOMS[CHIP_DENOMS.length - 1]
    const existing = piles.find((pile) => pile.value === 1)
    const extra = Math.min(remaining, maxPerDenom - (existing?.count ?? 0), maxChips - drawn)
    if (extra > 0) {
      if (existing) existing.count += extra
      else piles.push({ ...white, count: extra })
    }
  }

  if (piles.length === 0 && Number(amount) > 0) {
    piles.push({ ...CHIP_DENOMS[CHIP_DENOMS.length - 1], count: 1 })
  }

  return piles
}
