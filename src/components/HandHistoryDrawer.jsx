import { formatChips } from '../config.js'

export function HandHistoryDrawer({ open, history = [], onClose }) {
  if (!open) return null
  return (
    <aside className="history-drawer" aria-label="Hand history">
      <div className="history-drawer-head">
        <h2>Last hands</h2>
        <button type="button" className="history-close" onClick={onClose} aria-label="Close hand history">
          Close
        </button>
      </div>
      {history.length === 0 ? (
        <p className="history-empty">No hands yet this session.</p>
      ) : (
        <ol className="history-list">
          {history.map((row) => (
            <li key={row.handNumber} className="history-row">
              <span className="history-hand">Hand {row.handNumber}</span>
              <span className="history-result">{row.result}</span>
              <span className="history-pot">Pot {formatChips(row.pot)}</span>
              <span className="history-name">{row.handName}</span>
            </li>
          ))}
        </ol>
      )}
    </aside>
  )
}
