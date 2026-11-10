import { Card } from './Card.jsx'

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const SUITS = ['s', 'h', 'd', 'c']

/** Dev-only grid so every rank and suit can be checked. Open /?cards=1 */
export function CardAtlas() {
  return (
    <div className="card-atlas">
      <h1>ChipTalk card atlas</h1>
      <p>Every rank should show that many central pips. Corners are extra labels.</p>
      {SUITS.map((suit) => (
        <div key={suit} className="atlas-row">
          {RANKS.map((rank) => (
            <Card key={`${rank}${suit}`} rank={rank} suit={suit} faceUp size="lg" />
          ))}
        </div>
      ))}
    </div>
  )
}
