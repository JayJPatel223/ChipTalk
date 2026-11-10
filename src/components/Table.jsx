import { PlayerSeat } from './PlayerSeat.jsx'
import { Pot } from './Pot.jsx'
import { FlightLayer } from './FlightLayer.jsx'
import { Card } from './Card.jsx'

const BET_SIDES_BY_COUNT = {
  2: ['north', 'south'],
  3: ['north', 'east', 'west'],
  4: ['north', 'east', 'south', 'west'],
  5: ['north', 'east', 'south', 'south', 'west'],
}

function layoutSeats(seats) {
  const hero = seats.find((seat) => seat.isHero)
  const bots = seats.filter((seat) => !seat.isHero)
  return [hero, ...bots].filter(Boolean)
}

function isRightSeat(playerCount, index) {
  if (playerCount === 3) return index === 2
  if (playerCount === 4) return index === 3
  if (playerCount === 5) return index === 3 || index === 4
  return false
}

export function Table({ table, registry, reducedMotion = false, thinkDelayMs = 1200, strengthHint = null }) {
  const placed = layoutSeats(table.seats)
  const betSides = BET_SIDES_BY_COUNT[placed.length] ?? BET_SIDES_BY_COUNT[5]
  const flights = table.presentation?.flights ?? []

  return (
    <div className="table-stage">
      <div className="table-rail">
        <div
          className={`table-felt seats-${placed.length} ${table.isShowdown ? 'is-showdown' : ''} ${table.presentation?.allInPulse ? 'is-allin-flash' : ''}`}
          ref={registry?.felt}
        >
          <div className="felt-mark" aria-hidden="true">
            <span className="felt-ring" />
            <p className="felt-watermark">ChipTalk</p>
          </div>
          <div className="deck-slot" ref={registry?.deck} aria-hidden="true">
            <Card rank="?" suit="?" faceUp={false} size="sm" />
            <Card rank="?" suit="?" faceUp={false} size="sm" />
            <Card rank="?" suit="?" faceUp={false} size="sm" />
          </div>
          <Pot
            amount={table.pot}
            potBehind={table.potBehind}
            community={table.community}
            streetLabel={table.streetLabel}
            register={registry?.pot}
            reducedMotion={reducedMotion}
            winningKeys={table.winningKeys}
            highlightWins={Boolean(table.presentation?.showdownOn)}
          />
          {placed.map((seat, index) => (
            <PlayerSeat
              key={seat.id}
              seat={seat}
              slot={index}
              betSide={betSides[index] ?? 'north'}
              isDealer={seat.id === table.dealerSeatId}
              isActive={seat.id === table.activeSeatId}
              isRight={isRightSeat(placed.length, index)}
              reducedMotion={reducedMotion}
              thinkDelayMs={thinkDelayMs}
              strengthHint={seat.isHero ? strengthHint : null}
              winningKeys={table.presentation?.showdownOn ? table.winningKeys : []}
              register={{
                seat: registry?.seat?.(seat.id),
                hole: registry?.hole?.(seat.id),
                bet: registry?.bet?.(seat.id),
                stack: registry?.stack?.(seat.id),
              }}
            />
          ))}
          <FlightLayer flights={flights} reducedMotion={reducedMotion} />
        </div>
      </div>
    </div>
  )
}
