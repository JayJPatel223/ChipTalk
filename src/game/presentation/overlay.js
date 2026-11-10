export function overlayView(view, display, blocking) {
  if (!view) return view

  if (!display) {
    return {
      ...view,
      isHeroTurn: view.isHeroTurn && !blocking,
      activeSeatId: blocking ? null : view.activeSeatId,
      presentation: { blocking, flights: [], dealCards: [] },
    }
  }

  const catchingUp = display.handNumber != null && view.handNumber != null && display.handNumber !== view.handNumber
  const revealed = catchingUp ? 0 : Math.min(display.revealedCommunity ?? 0, view.community.length)
  const bets = catchingUp ? {} : (display.bets ?? {})
  const stacks = display.stacks ?? {}
  const holeCounts = catchingUp ? {} : (display.holeCounts ?? {})
  const potBehind = catchingUp ? 0 : (display.potBehind ?? view.potBehind)
  const betTotal = view.seats.reduce((sum, seat) => sum + (bets[seat.id] ?? 0), 0)
  const potLabel = catchingUp || display.settledPot ? 0 : potBehind + betTotal

  return {
    ...view,
    pot: catchingUp ? 0 : potLabel,
    potBehind,
    community: view.community.slice(0, revealed).map((card) => ({ ...card, faceUp: true })),
    isHeroTurn: view.isHeroTurn && !blocking,
    activeSeatId: blocking ? null : view.activeSeatId,
    presentation: {
      blocking,
      flights: display.flights ?? [],
      dealCards: display.dealCards ?? [],
      reducedMotion: display.reducedMotion,
      allInPulse: display.allInPulse,
      showdownOn: display.showdownOn,
    },
    seats: view.seats.map((seat) => {
      const folding = Boolean(display.folding?.[seat.id])
      const dealt = holeCounts[seat.id] ?? (display.holesReady && !catchingUp ? seat.cards.length : 0)
      let cards = seat.cards.slice(0, Math.max(0, dealt))
      let discarded = seat.discarded
      if (folding) {
        cards = [
          { rank: '?', suit: '?', faceUp: false },
          { rank: '?', suit: '?', faceUp: false },
        ]
        discarded = []
      } else if (seat.folded) {
        cards = []
        discarded = seat.discarded
      }
      return {
        ...seat,
        bet: display.settledPot || catchingUp ? 0 : (bets[seat.id] ?? 0),
        stack: stacks[seat.id] ?? seat.stack,
        cards,
        discarded,
        folding,
        isThinking: !blocking && seat.isThinking,
        allInPulse: display.allInPulse === seat.id,
        showdownLost: Boolean(display.showdownOn && !seat.folded && !seat.isWinner && view.isShowdown),
        heroFlip: display.heroFlip?.[seat.id] ?? dealt,
        actionLabel: display.actionLabels?.[seat.id] ?? null,
      }
    }),
  }
}
