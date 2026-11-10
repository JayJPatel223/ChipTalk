/** Single source for table limits and starting money. */
export const GAME_CONFIG = {
  minBots: 1,
  maxBots: 4,
  startingStack: 25_000,
  smallBlind: 50,
  bigBlind: 100,
  personalities: ['Shark', 'Rock', 'Maniac', 'Trickster'],
}

export function formatChips(amount) {
  return new Intl.NumberFormat('en-US').format(amount)
}
