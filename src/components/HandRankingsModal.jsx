import { Card } from './Card.jsx'

const HAND_EXAMPLES = [
  { name: 'Royal Flush', cards: [['A', 's'], ['K', 's'], ['Q', 's'], ['J', 's'], ['10', 's']] },
  { name: 'Straight Flush', cards: [['9', 'h'], ['8', 'h'], ['7', 'h'], ['6', 'h'], ['5', 'h']] },
  { name: 'Four of a Kind', cards: [['A', 's'], ['A', 'h'], ['A', 'd'], ['A', 'c'], ['9', 's']] },
  { name: 'Full House', cards: [['K', 's'], ['K', 'h'], ['K', 'd'], ['10', 'c'], ['10', 's']] },
  { name: 'Flush', cards: [['A', 'd'], ['J', 'd'], ['9', 'd'], ['6', 'd'], ['3', 'd']] },
  { name: 'Straight', cards: [['10', 's'], ['9', 'h'], ['8', 'd'], ['7', 'c'], ['6', 's']] },
  { name: 'Three of a Kind', cards: [['8', 's'], ['8', 'h'], ['8', 'd'], ['K', 'c'], ['2', 's']] },
  { name: 'Two Pair', cards: [['A', 's'], ['A', 'h'], ['J', 'd'], ['J', 'c'], ['4', 's']] },
  { name: 'One Pair', cards: [['Q', 's'], ['Q', 'h'], ['A', 'd'], ['9', 'c'], ['3', 's']] },
  { name: 'High Card', cards: [['A', 's'], ['K', 'h'], ['8', 'd'], ['5', 'c'], ['2', 's']] },
]

export function HandRankingsModal({ onClose }) {
  return (
    <div className="rank-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="rank-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rank-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="rank-modal-head">
          <h2 id="rank-modal-title">How to play</h2>
          <button type="button" className="rank-modal-close" onClick={onClose} aria-label="Close">
            Close
          </button>
        </div>
        <p className="rank-modal-lead">
          Texas Hold&apos;em: two hole cards, five community cards. Best five-card hand wins. Hand
          ranks from strongest to weakest:
        </p>
        <ol className="rank-list">
          {HAND_EXAMPLES.map((hand) => (
            <li key={hand.name} className="rank-row">
              <span className="rank-name">{hand.name}</span>
              <span className="rank-cards">
                {hand.cards.map(([rank, suit]) => (
                  <Card key={`${hand.name}-${rank}${suit}`} rank={rank} suit={suit} faceUp size="sm" />
                ))}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
