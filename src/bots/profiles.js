/** Hidden heuristic profiles. Never show these ids in the UI. */
export const PROFILE_IDS = ['shark', 'rock', 'maniac', 'trickster']

/**
 * Thresholds are 0..1 hand/equity scores.
 * Preflop bet/raise sizes are in big blinds (total street contribution for
 * an opening bet; extra chips above the current bet for a raise).
 * Postflop sizes are fractions of the pot, added as extra chips for raises.
 */
export const PROFILES = {
  shark: {
    id: 'shark',
    preflopOpen: 0.5,
    preflopCall: 0.4,
    preflopRaise: 0.78,
    threeBet: 0.84,
    postflopBet: 0.7,
    postflopRaise: 0.82,
    bluffFreq: 0.04,
    potOddsSlack: 0.02,
    lateBonus: 0.05,
    preflopBetBb: 2.5,
    preflopRaiseBb: 2.5,
    betPotFraction: 0.33,
    raisePotFraction: 0.4,
    maxCommitFraction: 0.16,
    maxContinueBb: 12,
    allInEquity: 0.93,
    nutEquity: 0.97,
    multiwayRaise: 0.88,
    shortStackBb: 10,
    shortAllInEquity: 0.72,
  },
  rock: {
    id: 'rock',
    preflopOpen: 0.62,
    preflopCall: 0.52,
    preflopRaise: 0.88,
    threeBet: 0.92,
    postflopBet: 0.8,
    postflopRaise: 0.9,
    bluffFreq: 0.01,
    potOddsSlack: 0.0,
    lateBonus: 0.03,
    preflopBetBb: 2.2,
    preflopRaiseBb: 2.2,
    betPotFraction: 0.28,
    raisePotFraction: 0.33,
    maxCommitFraction: 0.12,
    maxContinueBb: 8,
    allInEquity: 0.96,
    nutEquity: 0.98,
    multiwayRaise: 0.94,
    shortStackBb: 8,
    shortAllInEquity: 0.8,
  },
  maniac: {
    id: 'maniac',
    preflopOpen: 0.26,
    preflopCall: 0.18,
    preflopRaise: 0.48,
    threeBet: 0.62,
    postflopBet: 0.45,
    postflopRaise: 0.55,
    bluffFreq: 0.12,
    potOddsSlack: 0.06,
    lateBonus: 0.06,
    preflopBetBb: 3,
    preflopRaiseBb: 3,
    betPotFraction: 0.45,
    raisePotFraction: 0.5,
    maxCommitFraction: 0.22,
    maxContinueBb: 18,
    allInEquity: 0.88,
    nutEquity: 0.94,
    multiwayRaise: 0.72,
    shortStackBb: 12,
    shortAllInEquity: 0.62,
  },
  trickster: {
    id: 'trickster',
    /** Probability of using the maniac line; otherwise the rock line. */
    mixManiac: 0.32,
    preflopOpen: 0.42,
    preflopCall: 0.34,
    preflopRaise: 0.72,
    threeBet: 0.8,
    postflopBet: 0.62,
    postflopRaise: 0.74,
    bluffFreq: 0.07,
    potOddsSlack: 0.03,
    lateBonus: 0.05,
    preflopBetBb: 2.5,
    preflopRaiseBb: 2.5,
    betPotFraction: 0.36,
    raisePotFraction: 0.42,
    maxCommitFraction: 0.15,
    maxContinueBb: 12,
    allInEquity: 0.92,
    nutEquity: 0.96,
    multiwayRaise: 0.86,
    shortStackBb: 10,
    shortAllInEquity: 0.7,
  },
}

export function resolveProfile(profile, rng) {
  if (profile.id !== 'trickster') return profile
  return rng() < profile.mixManiac ? PROFILES.maniac : PROFILES.rock
}

/**
 * Unique random assignment. `rng` is a [0, 1) function so tests can inject
 * a stream. Assignment happens outside the reducer.
 */
export function assignUniqueProfiles(botIds, rng = Math.random) {
  const pool = PROFILE_IDS.slice()
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const map = {}
  botIds.forEach((id, index) => {
    map[id] = pool[index % pool.length]
  })
  return map
}
