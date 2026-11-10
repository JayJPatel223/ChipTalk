import { GAME_CONFIG } from '../config.js'

const COMMUNITY = [
  { rank: '10', suit: 's', faceUp: true },
  { rank: '5', suit: 'h', faceUp: true },
  { rank: 'K', suit: 'd', faceUp: true },
  { rank: '8', suit: 'c', faceUp: true },
  { rank: 'A', suit: 's', faceUp: true },
]

const FACE_DOWN = [
  { rank: '?', suit: '?', faceUp: false },
  { rank: '?', suit: '?', faceUp: false },
]

/** Dummy bets sized to the GAME_CONFIG starting stack. */
const HERO_BET = 400
const BOT_BETS = [200, 150, 400, 100]

function botSeat(index, bet) {
  return {
    id: `bot-${index}`,
    name: `Bot ${index + 1}`,
    botNumber: index + 1,
    personality: GAME_CONFIG.personalities[index] ?? null,
    isHero: false,
    stack: GAME_CONFIG.startingStack - bet,
    bet,
    cards: FACE_DOWN,
  }
}

export function createDummyTable(botCount) {
  const count = Math.min(
    GAME_CONFIG.maxBots,
    Math.max(GAME_CONFIG.minBots, botCount),
  )
  const bots = Array.from({ length: count }, (_, index) =>
    botSeat(index, BOT_BETS[index] ?? 100),
  )
  const pot = HERO_BET + bots.reduce((sum, seat) => sum + seat.bet, 0)

  return {
    pot,
    dealerSeatId: bots[0]?.id ?? 'hero',
    activeSeatId: 'hero',
    blinds: `${GAME_CONFIG.smallBlind} / ${GAME_CONFIG.bigBlind}`,
    community: COMMUNITY,
    action: {
      canCheck: false,
      toCall: HERO_BET,
      minRaise: HERO_BET * 2,
      maxRaise: GAME_CONFIG.startingStack - HERO_BET,
      raiseTo: Math.max(HERO_BET * 2, pot),
      halfPot: Math.round(pot * 1.5),
      potRaise: pot * 2,
      step: 50,
    },
    seats: [
      {
        id: 'hero',
        name: 'You',
        personality: null,
        isHero: true,
        stack: GAME_CONFIG.startingStack - HERO_BET,
        bet: HERO_BET,
        cards: [
          { rank: 'J', suit: 'h', faceUp: true },
          { rank: 'Q', suit: 'h', faceUp: true },
        ],
      },
      ...bots,
    ],
  }
}
