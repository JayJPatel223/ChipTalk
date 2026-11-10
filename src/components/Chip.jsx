import { formatChips } from '../config.js'
import { breakDownAmount } from '../chips/breakDown.js'

function ChipDisk({ color, edge, ring, index }) {
  const offset = index * 4
  const nudge = (index % 3) - 1
  return (
    <svg
      className="chip-disk"
      viewBox="0 0 72 22"
      width="36"
      height="11"
      style={{ bottom: `${offset}px`, left: `${nudge}px` }}
      aria-hidden="true"
    >
      <ellipse cx="36" cy="14" rx="32" ry="7" fill="#111" opacity="0.35" />
      <ellipse cx="36" cy="10" rx="32" ry="7" fill={color} />
      <ellipse
        cx="36"
        cy="10"
        rx="32"
        ry="7"
        fill="none"
        stroke={edge}
        strokeWidth="3.2"
        strokeDasharray="4.2 5.6"
      />
      <ellipse cx="36" cy="10" rx="26" ry="5.2" fill="none" stroke={ring ?? edge} strokeWidth="1.1" opacity="0.9" />
      <ellipse cx="36" cy="8.4" rx="32" ry="7" fill={color} opacity="0.45" />
    </svg>
  )
}

export function Chip({ amount, compact = false, showAmount = true }) {
  const piles = breakDownAmount(amount, {
    maxChips: compact ? 6 : 12,
    maxPerDenom: compact ? 5 : 8,
  })

  return (
    <div className={`chip-stack ${compact ? 'is-compact' : ''}`}>
      <div className="chip-piles" aria-hidden="true">
        {piles.map((pile) => (
          <div key={pile.name} className="chip-pile">
            {Array.from({ length: pile.count }, (_, index) => (
              <ChipDisk key={index} color={pile.color} edge={pile.edge} ring={pile.ring} index={index} />
            ))}
          </div>
        ))}
      </div>
      {showAmount && <span className="chip-amount">{formatChips(amount)}</span>}
    </div>
  )
}
