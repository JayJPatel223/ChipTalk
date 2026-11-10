import { Chip } from './Chip.jsx'
import { RevealedCard } from './Card.jsx'
import { formatChips } from '../config.js'

const BOARD_SLOTS = [0, 1, 2, 3, 4]

export function Pot({
  amount,
  potBehind = 0,
  community = [],
  streetLabel,
  register,
  reducedMotion = false,
  winningKeys = [],
  highlightWins = false,
}) {
  const wins = new Set(winningKeys)
  return (
    <div className="pot-center">
      <div className="pot-meta">
        {streetLabel && <p className="pot-street">{streetLabel}</p>}
        <p className="pot-label">
          <span className="pot-kicker">Pot</span>
          <span className="pot-value">{formatChips(amount)}</span>
        </p>
      </div>
      <div className="community-row">
        {BOARD_SLOTS.map((index) => {
          const card = community[index]
          return (
            <div key={`slot-${index}`} className={`board-slot ${card ? 'has-card' : 'is-empty'}`}>
              {card?.faceUp ? (
                <RevealedCard
                  rank={card.rank}
                  suit={card.suit}
                  size="md"
                  reducedMotion={reducedMotion}
                  className={
                    highlightWins
                      ? wins.has(`${card.rank}${card.suit}`)
                        ? 'is-win-card'
                        : 'is-dim-card'
                      : ''
                  }
                />
              ) : null}
            </div>
          )
        })}
      </div>
      <div className="pot-chips" ref={register}>
        {potBehind > 0 && <Chip amount={potBehind} showAmount={false} />}
      </div>
    </div>
  )
}
