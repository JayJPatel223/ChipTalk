export const SUIT_META = {
  s: { name: 'spades', fill: '#12151c' },
  h: { name: 'hearts', fill: '#c43b2c' },
  d: { name: 'diamonds', fill: '#c43b2c' },
  c: { name: 'clubs', fill: '#12151c' },
}

/** Suit artwork in a 100x100 local box. */
export function SuitPath({ suit }) {
  if (suit === 'h') {
    return (
      <path d="M50 90 C22 66 6 48 6 28 C6 12 18 4 32 8 C41 11 47 18 50 28 C53 18 59 11 68 8 C82 4 94 12 94 28 C94 48 78 66 50 90 Z" />
    )
  }
  if (suit === 'd') {
    return <path d="M50 4 L94 50 L50 96 L6 50 Z" />
  }
  if (suit === 'c') {
    return (
      <path d="M50 8 C38 8 28 18 28 30 C28 38 32 44 38 48 C26 46 14 54 14 68 C14 82 28 90 42 86 L42 96 H58 L58 86 C72 90 86 82 86 68 C86 54 74 46 62 48 C68 44 72 38 72 30 C72 18 62 8 50 8 Z" />
    )
  }
  return (
    <path d="M50 4 C30 32 10 46 10 66 C10 82 22 92 36 86 L40 98 H60 L64 86 C78 92 90 82 90 66 C90 46 70 32 50 4 Z M44 78 L40 96 H60 L56 78 Z" />
  )
}

export function SuitMark({ suit, x, y, size, flip = false }) {
  const fill = SUIT_META[suit]?.fill ?? '#12151c'
  const scale = size / 100
  return (
    <g
      transform={`translate(${x} ${y}) rotate(${flip ? 180 : 0}) scale(${scale}) translate(-50 -50)`}
      fill={fill}
    >
      <SuitPath suit={suit} />
    </g>
  )
}
