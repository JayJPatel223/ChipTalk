const SUIT_NAME = {
  s: 'spades',
  h: 'hearts',
  d: 'diamonds',
  c: 'clubs',
}

const RANK_NAME = {
  A: 'Ace',
  K: 'King',
  Q: 'Queen',
  J: 'Jack',
  10: 'Ten',
  9: 'Nine',
  8: 'Eight',
  7: 'Seven',
  6: 'Six',
  5: 'Five',
  4: 'Four',
  3: 'Three',
  2: 'Two',
}

export function formatCardName(rank, suit, faceUp = true) {
  if (!faceUp || !rank || rank === '?') return 'Face-down card'
  const rankName = RANK_NAME[rank] ?? String(rank)
  const suitName = SUIT_NAME[suit] ?? 'unknown'
  return `${rankName} of ${suitName}`
}
