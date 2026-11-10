import { formatChips } from '../config.js'

function amountOf(action) {
  const value = action.delta ?? action.toCall ?? action.amount ?? 0
  return Number.isFinite(value) ? value : 0
}

function raiseTo(action) {
  const value = action.to ?? action.amount ?? 0
  return Number.isFinite(value) ? value : 0
}

/** Short seat label derived from an engine action / snapshot diff. */
export function formatActionLabel(action) {
  if (!action || !action.type) return null
  if (action.allIn || action.type === 'allIn') return 'All-in'
  if (action.type === 'fold') return 'Fold'
  if (action.type === 'check') return 'Check'
  if (action.type === 'call') {
    const chips = amountOf(action)
    return chips > 0 ? `Call ${formatChips(chips)}` : 'Call'
  }
  if (action.type === 'raise') return `Raise to ${formatChips(raiseTo(action))}`
  if (action.type === 'bet') return `Bet ${formatChips(raiseTo(action))}`
  return null
}
