export function playerAtSeat(players, seat) {
  return players.find((player) => player.seat === seat)
}

export function liveForHand(player) {
  return !player.busted && player.stack > 0
}

export function nextSeat(players, fromSeat, predicate) {
  const seats = [...players].sort((a, b) => a.seat - b.seat)
  const count = seats.length
  const start = seats.findIndex((player) => player.seat === fromSeat)
  for (let step = 1; step <= count; step += 1) {
    const player = seats[(start + step) % count]
    if (predicate(player)) return player.seat
  }
  return null
}

export function nextLiveSeat(players, fromSeat) {
  return nextSeat(players, fromSeat, liveForHand)
}

/** Clockwise from the dealer, skipping busted players with no chips. */
export function rotateDealer(players, dealerSeat) {
  return nextLiveSeat(players, dealerSeat)
}

export function blindSeats(players, dealerSeat) {
  const live = players.filter(liveForHand)
  if (live.length < 2) {
    throw new Error('startHand: need at least two players with chips')
  }
  if (live.length === 2) {
    const big = nextLiveSeat(players, dealerSeat)
    return { sbSeat: dealerSeat, bbSeat: big, headsUp: true }
  }
  const sbSeat = nextLiveSeat(players, dealerSeat)
  const bbSeat = nextLiveSeat(players, sbSeat)
  return { sbSeat, bbSeat, headsUp: false }
}

export function firstPreflopSeat(players, dealerSeat, bbSeat, headsUp) {
  if (headsUp) return dealerSeat
  return nextLiveSeat(players, bbSeat)
}

export function firstPostflopSeat(players, dealerSeat) {
  return nextSeat(
    players,
    dealerSeat,
    (player) => !player.folded && !player.allIn && !player.busted && player.stack > 0,
  )
}

export function clockwiseFromDealer(seats, dealerSeat, seatCount) {
  return [...seats].sort((left, right) => {
    const leftDist = (left - dealerSeat - 1 + seatCount * 2) % seatCount
    const rightDist = (right - dealerSeat - 1 + seatCount * 2) % seatCount
    return leftDist - rightDist
  })
}
