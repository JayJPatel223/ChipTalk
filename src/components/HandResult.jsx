import { formatChips } from '../config.js'

export function HandResult({
  view,
  onNextHand,
  onBackToSetup,
  onRematch,
  nextHandDisabled = false,
  stats = null,
}) {
  if (!view?.settled) return null
  const session = view.session
  const ended = session?.over
  const hero = view.seats?.find((seat) => seat.isHero)

  return (
    <section className="hand-result" aria-live="polite">
      <div className="hand-result-copy">
        {ended && (
          <>
            <p className="hand-result-kicker">{session.title}</p>
            <p className="hand-result-detail">{session.message}</p>
            {stats && (
              <p className="session-stats">
                <span>Hands {stats.handsPlayed}</span>
                <span>Biggest pot won {formatChips(stats.biggestPotWon)}</span>
                <span>Stack {formatChips(hero?.stack ?? 0)}</span>
              </p>
            )}
          </>
        )}
        {!ended && (
          <p className="hand-result-kicker">{view.splitPot ? 'Split pot' : 'Hand result'}</p>
        )}
        <ul className="hand-result-payouts">
          {view.resultLines.map((line) => (
            <li key={`${line.title}-${line.amount}`}>
              <strong>{line.title}</strong>
              {line.detail && <span className="hand-result-cat"> · {line.detail}</span>}
              {line.amount > 0 && (
                <span className="hand-result-amount"> — {formatChips(line.amount)}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
      {ended ? (
        <div className="hand-result-actions">
          {onRematch && (
            <button type="button" className="start-game-btn hand-result-btn" onClick={onRematch}>
              Rematch
            </button>
          )}
          <button type="button" className="back-setup-btn" onClick={onBackToSetup}>
            Back to Setup
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="start-game-btn hand-result-btn"
          onClick={onNextHand}
          disabled={nextHandDisabled}
        >
          Next Hand
        </button>
      )}
    </section>
  )
}
