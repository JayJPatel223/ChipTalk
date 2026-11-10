import { formatChips } from '../config.js'

/** Pot-to-call ratio, e.g. 2.5 for a 250 pot facing a 100 call. */
export function potOddsRatio(toCall, pot) {
  const call = Number(toCall)
  if (!Number.isFinite(call) || call <= 0) return null
  const potNow = Number(pot)
  const total = Number.isFinite(potNow) ? Math.max(0, potNow) : 0
  return total / call
}

export function formatPotOdds(toCall, pot) {
  const ratio = potOddsRatio(toCall, pot)
  if (ratio == null) return null
  const rounded = Math.round(ratio * 10) / 10
  const label = Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1)
  return `${label}:1`
}

/** Subtitle under Check/Call. */
export function callSubtitle(toCall, pot) {
  const call = Number(toCall)
  if (!Number.isFinite(call) || call <= 0) return 'Check'
  const odds = formatPotOdds(call, pot)
  return odds ? `to call ${formatChips(call)} · ${odds}` : `to call ${formatChips(call)}`
}
