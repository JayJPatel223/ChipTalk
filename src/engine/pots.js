import { evaluateHand } from './evaluate.js'
import { clockwiseFromDealer } from './positions.js'

/** Return chips no opponent matched to the player who put them in. */
export function returnUncalledExcess(players) {
  const amounts = players.map((player) => player.committed).sort((a, b) => b - a)
  const highest = amounts[0] ?? 0
  const second = amounts[1] ?? 0
  const excess = highest - second
  if (excess <= 0) return players
  const leaders = players.filter((player) => player.committed === highest)
  if (leaders.length !== 1) return players
  const id = leaders[0].id
  return players.map((player) =>
    player.id === id
      ? {
          ...player,
          stack: player.stack + excess,
          committed: player.committed - excess,
          roundBet: Math.max(0, player.roundBet - excess),
        }
      : player,
  )
}

export function buildPots(players) {
  const contributors = players.filter((player) => player.committed > 0)
  const levels = [...new Set(contributors.map((player) => player.committed))].sort(
    (a, b) => a - b,
  )
  const pots = []
  let previous = 0
  for (const level of levels) {
    const layer = level - previous
    const inLayer = contributors.filter((player) => player.committed >= level)
    const amount = layer * inLayer.length
    const eligibleIds = inLayer.filter((player) => !player.folded).map((player) => player.id)
    if (amount > 0) pots.push({ amount, eligibleIds })
    previous = level
  }
  return mergeIdenticalPots(pots)
}

function mergeIdenticalPots(pots) {
  const merged = []
  for (const pot of pots) {
    const key = pot.eligibleIds.slice().sort().join(',')
    const existing = merged.find((entry) => entry.eligibleIds.slice().sort().join(',') === key)
    if (existing) existing.amount += pot.amount
    else merged.push({ amount: pot.amount, eligibleIds: pot.eligibleIds.slice() })
  }
  return merged
}

function pay(players, playerId, chips) {
  return players.map((player) =>
    player.id === playerId ? { ...player, stack: player.stack + chips } : player,
  )
}

/**
 * Award each pot to the best eligible hand. Odd leftover chips go clockwise
 * among tied winners, starting left of the dealer.
 */
export function awardPots(players, pots, community, dealerSeat) {
  const seatCount = players.length
  const payouts = []
  let nextPlayers = players.map((player) => ({ ...player, committed: 0, roundBet: 0 }))

  for (const pot of pots) {
    const eligible = nextPlayers.filter((player) => pot.eligibleIds.includes(player.id))
    if (eligible.length === 0 || pot.amount <= 0) continue

    let winnerIds
    if (eligible.length === 1 || community.length < 5) {
      winnerIds = eligible.map((player) => player.id)
    } else {
      const scored = eligible.map((player) => ({
        id: player.id,
        seat: player.seat,
        rank: evaluateHand([...player.holeCards, ...community]),
      }))
      const best = Math.min(...scored.map((row) => row.rank))
      winnerIds = scored.filter((row) => row.rank === best).map((row) => row.id)
    }

    const share = Math.floor(pot.amount / winnerIds.length)
    let leftover = pot.amount - share * winnerIds.length
    const winnerSeats = winnerIds.map((id) => nextPlayers.find((player) => player.id === id).seat)
    const oddOrder = clockwiseFromDealer(winnerSeats, dealerSeat, seatCount)

    for (const id of winnerIds) {
      nextPlayers = pay(nextPlayers, id, share)
    }
    for (const seat of oddOrder) {
      if (leftover <= 0) break
      const id = nextPlayers.find((player) => player.seat === seat).id
      nextPlayers = pay(nextPlayers, id, 1)
      leftover -= 1
    }

    payouts.push({ amount: pot.amount, winnerIds })
  }

  return {
    players: nextPlayers.map((player) => ({
      ...player,
      busted: player.stack === 0,
      allIn: false,
      acted: false,
    })),
    payouts,
  }
}

export function totalChips(players) {
  return players.reduce((sum, player) => sum + player.stack + player.committed, 0)
}
