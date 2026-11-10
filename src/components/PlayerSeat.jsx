import { motion } from 'framer-motion'
import { Card, RevealedCard } from './Card.jsx'
import { Chip } from './Chip.jsx'
import { Avatar } from './Avatar.jsx'
import { AnimatedNumber } from './AnimatedNumber.jsx'
import { formatChips } from '../config.js'

const RING_R = 34
const RING_C = 2 * Math.PI * RING_R

function TurnRing({ isHero, durationMs, reducedMotion }) {
  const seconds = Math.max(0.8, (durationMs ?? 1200) / 1000)
  return (
    <svg className={`turn-ring ${isHero ? 'is-hero' : 'is-bot'}`} viewBox="0 0 80 80" aria-hidden="true">
      <circle className="turn-ring-track" cx="40" cy="40" r={RING_R} />
      <circle
        className="turn-ring-progress"
        cx="40"
        cy="40"
        r={RING_R}
        style={
          isHero || reducedMotion
            ? undefined
            : {
                strokeDasharray: RING_C,
                strokeDashoffset: RING_C,
                animationDuration: `${seconds}s`,
              }
        }
      />
    </svg>
  )
}

export function PlayerSeat({
  seat,
  isDealer,
  isActive,
  slot,
  betSide = 'north',
  isRight = false,
  register,
  reducedMotion = false,
  thinkDelayMs = 1200,
  strengthHint = null,
  winningKeys = [],
}) {
  const winSet = new Set(winningKeys)
  const showdownPaint = winSet.size > 0
  const status = seat.folded
    ? 'Folded'
    : seat.isThinking
      ? null
      : seat.busted
        ? 'Busted'
        : seat.allIn
          ? 'All-in'
          : seat.isWinner
            ? seat.winnerPots.join(' · ')
            : null

  const heroFlip = seat.heroFlip ?? 0

  function cardTone(card) {
    if (!showdownPaint || !card.faceUp) return ''
    return winSet.has(`${card.rank}${card.suit}`) ? 'is-win-card' : 'is-dim-card'
  }

  function holeCard(card, index, size) {
    const tone = cardTone(card)
    if (seat.isHero && card.faceUp && index < heroFlip) {
      return (
        <RevealedCard
          key={`${seat.id}-${index}`}
          rank={card.rank}
          suit={card.suit}
          size={size}
          reducedMotion={reducedMotion}
          className={tone}
        />
      )
    }
    if (!seat.isHero && card.faceUp) {
      return (
        <RevealedCard
          key={`${seat.id}-${index}-sd`}
          rank={card.rank}
          suit={card.suit}
          size={size}
          reducedMotion={reducedMotion}
          className={tone}
        />
      )
    }
    const faceUp = seat.isHero ? index < heroFlip && card.faceUp : false
    return (
      <Card
        key={`${seat.id}-${index}`}
        rank={card.rank}
        suit={card.suit}
        faceUp={faceUp}
        size={size}
        className={tone}
      />
    )
  }

  const discardMotion = reducedMotion
    ? {}
    : {
        initial: { y: seat.isHero ? 36 : -28, rotate: 0, opacity: 1 },
        animate: { y: 0, rotate: 0, opacity: 1 },
        transition: { duration: 0.34, ease: 'easeOut' },
      }

  const seatLabel = [seat.name, `stack ${seat.stack}`, status].filter(Boolean).join(', ')

  return (
    <div
      ref={register?.seat}
      className={`player-seat slot-${slot} ${seat.isHero ? 'is-hero' : ''} ${isActive ? 'is-active' : ''} ${isRight ? 'is-right' : ''} ${seat.folded ? 'is-folded' : ''} ${seat.busted ? 'is-busted' : ''} ${seat.isWinner ? 'is-winner' : ''} ${seat.showdownLost ? 'is-showdown-lost' : ''} ${seat.allInPulse ? 'is-allin-pulse' : ''} ${seat.folding ? 'is-folding' : ''}`}
      aria-label={seatLabel}
    >
      {seat.isHero && (
        <div className="hero-cards" ref={register?.hole}>
          {!seat.folding &&
            seat.cards.map((card, index) => (
              <div key={`${seat.id}-wrap-${index}`} className={`hero-card is-${index}`}>
                {holeCard(card, index, 'lg')}
              </div>
            ))}
          {strengthHint && <p className="hero-strength">{strengthHint}</p>}
        </div>
      )}

      {!seat.isHero && (
        <div className="seat-cards" ref={register?.hole}>
          {!seat.folding && seat.cards.map((card, index) => holeCard(card, index, 'sm'))}
        </div>
      )}

      {(seat.discarded?.length ?? 0) > 0 && (
        <motion.div className="folded-discard" aria-label="Folded cards, face down" {...discardMotion}>
          {seat.discarded.map((card, index) => (
            <Card key={`${seat.id}-muck-${index}`} {...card} size="sm" />
          ))}
        </motion.div>
      )}

      {seat.folding && (
        <motion.div
          className="folded-discard is-sliding"
          aria-hidden="true"
          initial={reducedMotion ? false : { y: seat.isHero ? 42 : -32, rotate: 0 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.34, ease: 'easeOut' }}
        >
          {seat.cards.map((card, index) => (
            <Card key={`${seat.id}-folding-${index}`} rank="?" suit="?" faceUp={false} size="sm" />
          ))}
        </motion.div>
      )}

      <div className="seat-anchor">
      <div
        className={`seat-bet bet-${betSide} ${seat.bet > 0 ? 'has-chips' : 'is-anchor'}`}
        ref={register?.bet}
      >
        {seat.bet > 0 && (
          <div className="bet-pill">
            <Chip amount={seat.bet} compact showAmount={false} />
            <span className="bet-pill-amount">{formatChips(seat.bet)}</span>
          </div>
        )}
      </div>

      <div className="seat-identity" ref={register?.stack}>
        <div className="seat-avatar-wrap">
          {isActive && (
            <TurnRing
              isHero={seat.isHero}
              durationMs={thinkDelayMs ?? 1200}
              reducedMotion={reducedMotion}
            />
          )}
          <Avatar name={seat.name} isHero={seat.isHero} botNumber={seat.botNumber ?? null} />
          {seat.botNumber != null && <span className="seat-num">{seat.botNumber}</span>}
          {seat.isThinking && (
            <span className="think-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          )}
          <div className="seat-markers">
            {isDealer && (
              <span className="dealer-button" title="Dealer">
                D
              </span>
            )}
            {seat.isBlindSb && (
              <span className="blind-tag sb-tag" title="Small blind">
                SB
              </span>
            )}
            {seat.isBlindBb && (
              <span className="blind-tag bb-tag" title="Big blind">
                BB
              </span>
            )}
          </div>
        </div>
        {seat.actionLabel?.text && (
          <p key={seat.actionLabel.stamp} className="seat-action-label">
            {seat.actionLabel.text}
          </p>
        )}
        <div className="seat-plaque">
          <p className="seat-name">{seat.name}</p>
          <p className="seat-stack">
            <AnimatedNumber value={seat.stack} reducedMotion={reducedMotion} />
          </p>
          {status && (
            <p className={`seat-status ${seat.folded ? 'is-folded-label' : ''} ${seat.isWinner ? 'is-winner-label' : ''} ${seat.isThinking ? 'is-thinking' : ''}`}>
              {status}
            </p>
          )}
        </div>
        <div className="seat-stack-chips">
          <Chip amount={seat.stack} showAmount={false} />
        </div>
      </div>
      </div>
    </div>
  )
}
