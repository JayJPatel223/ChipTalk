export const HERO_ID = 'hero'

export const STREET_LABELS = {
  preflop: 'Preflop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
  showdown: 'Showdown',
  complete: 'Hand complete',
}

export function botId(index) {
  return `bot-${index}`
}

export function botName(index) {
  return `Bot ${index}`
}
