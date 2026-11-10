const U32 = 0x1_0000_0000

function defaultRandomU32() {
  const buffer = new Uint32Array(1)
  crypto.getRandomValues(buffer)
  return buffer[0]
}

/** Values at or above this threshold are rejected so `value % n` is unbiased. */
export function indexLimit(n) {
  return Math.floor(U32 / n) * n
}

/**
 * Uniform index in [0, n). Uses rejection sampling on 32-bit values from
 * crypto.getRandomValues — never Math.random(), and never a raw `x % n`
 * on unrestricted input.
 */
export function unbiasedIndex(n, randomU32 = defaultRandomU32) {
  if (!Number.isInteger(n) || n < 1 || n > U32) {
    throw new Error(`unbiasedIndex: n must be an integer in 1..2^32, got ${n}`)
  }
  if (n === 1) return 0
  const limit = indexLimit(n)
  for (;;) {
    const value = randomU32()
    if (value < limit) return value % n
  }
}

/** Fisher-Yates shuffle. Returns a new array; `deck` is not modified. */
export function shuffle(deck, options = {}) {
  if (!Array.isArray(deck)) {
    throw new Error('shuffle: deck must be an array')
  }
  const randomU32 = options.randomU32 ?? defaultRandomU32
  const copy = deck.slice()
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = unbiasedIndex(i + 1, randomU32)
    const swap = copy[i]
    copy[i] = copy[j]
    copy[j] = swap
  }
  return copy
}
