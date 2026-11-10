import { legalActions } from '../engine/index.js'

/** Public snapshot a bot is allowed to see. No hidden opponent cards, no deck. */
export function botView(engine, playerId) {
  const me = engine.players.find((player) => player.id === playerId)
  if (!me) throw new Error('botView: unknown player')
  const legal = legalActions(engine)
  const pot = engine.players.reduce((sum, player) => sum + player.committed, 0)
  const live = engine.players.filter((player) => !player.folded && !player.busted && player.holeCards.length > 0)

  return {
    playerId,
    holeCards: me.holeCards.map((card) => ({ rank: card.rank, suit: card.suit })),
    community: engine.community.map((card) => ({ rank: card.rank, suit: card.suit })),
    street: engine.street,
    pot,
    bigBlind: engine.bigBlind,
    smallBlind: engine.smallBlind,
    toCall: legal.toCall,
    currentBet: me.roundBet + legal.toCall,
    legal: { ...legal, types: legal.types.slice() },
    roundBet: me.roundBet,
    stack: me.stack,
    dealerSeat: engine.dealerSeat,
    sbSeat: engine.sbSeat,
    bbSeat: engine.bbSeat,
    headsUp: engine.headsUp,
    opponentsInHand: live.filter((player) => player.id !== playerId).length,
    players: engine.players.map((player) => ({
      id: player.id,
      seat: player.seat,
      stack: player.stack,
      folded: player.folded,
      allIn: player.allIn,
      busted: player.busted,
      roundBet: player.roundBet,
      committed: player.committed,
    })),
  }
}

export function isLatePosition(view) {
  if (view.headsUp) return view.players.find((player) => player.id === view.playerId)?.seat === view.dealerSeat
  const me = view.players.find((player) => player.id === view.playerId)
  if (!me) return false
  return me.seat === view.dealerSeat
}
