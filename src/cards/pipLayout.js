/**
 * Traditional pip coordinates on a 140 x 196 card face.
 * Bottom-half pips are flipped so they read correctly in a real deck.
 */
const L = 40
const C = 70
const R = 100

function pip(x, y, flip = false) {
  return { x, y, flip }
}

export const PIP_LAYOUTS = {
  A: [pip(C, 100)],
  2: [pip(C, 48), pip(C, 148, true)],
  3: [pip(C, 48), pip(C, 100), pip(C, 148, true)],
  4: [pip(L, 48), pip(R, 48), pip(L, 148, true), pip(R, 148, true)],
  5: [pip(L, 48), pip(R, 48), pip(C, 100), pip(L, 148, true), pip(R, 148, true)],
  6: [
    pip(L, 48),
    pip(R, 48),
    pip(L, 100),
    pip(R, 100),
    pip(L, 148, true),
    pip(R, 148, true),
  ],
  7: [
    pip(L, 48),
    pip(R, 48),
    pip(C, 72),
    pip(L, 100),
    pip(R, 100),
    pip(L, 148, true),
    pip(R, 148, true),
  ],
  8: [
    pip(L, 48),
    pip(R, 48),
    pip(C, 72),
    pip(L, 100),
    pip(R, 100),
    pip(C, 124, true),
    pip(L, 148, true),
    pip(R, 148, true),
  ],
  9: [
    pip(L, 44),
    pip(R, 44),
    pip(L, 78),
    pip(R, 78),
    pip(C, 100),
    pip(L, 122, true),
    pip(R, 122, true),
    pip(L, 152, true),
    pip(R, 152, true),
  ],
  10: [
    pip(L, 44),
    pip(R, 44),
    pip(C, 62),
    pip(L, 80),
    pip(R, 80),
    pip(L, 120, true),
    pip(R, 120, true),
    pip(C, 138, true),
    pip(L, 152, true),
    pip(R, 152, true),
  ],
}

export const FACE_RANKS = new Set(['J', 'Q', 'K'])
