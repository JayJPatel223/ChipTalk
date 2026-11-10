import { useEffect, useState } from 'react'
import { GAME_CONFIG, formatChips } from '../config.js'
import { SoundControls } from './SoundControls.jsx'
import { HandRankingsModal } from './HandRankingsModal.jsx'

const BOT_OPTIONS = Array.from(
  { length: GAME_CONFIG.maxBots - GAME_CONFIG.minBots + 1 },
  (_, index) => GAME_CONFIG.minBots + index,
)

export function SetupScreen({ botCount, onBotCountChange, onStart, sound }) {
  const totalPlayers = botCount + 1
  const [ranksOpen, setRanksOpen] = useState(false)

  useEffect(() => {
    if (!ranksOpen) return undefined
    function onKey(event) {
      if (event.key === 'Escape') setRanksOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ranksOpen])

  return (
    <div className="setup-shell">
      <div className="setup-panel">
        <div className="setup-logo-wrap">
          <div className="setup-float" aria-hidden="true">
            <span className="setup-float-card is-a" />
            <span className="setup-float-chip" />
            <span className="setup-float-card is-b" />
          </div>
          <p className="brand-kicker">Team ZEROX</p>
          <h1 className="setup-title">ChipTalk</h1>
          <p className="setup-tagline">Sit down. Read the table. Let the chips talk.</p>
        </div>

        <fieldset className="setup-field">
          <legend>How many bots will you face?</legend>
          <p className="setup-help">
            This number is computer opponents only. You are not included.
            The table will seat {botCount} {botCount === 1 ? 'bot' : 'bots'} plus
            you ({totalPlayers} players total).
          </p>
          <div className="bot-picker" role="group" aria-label="Bot count">
            {BOT_OPTIONS.map((count) => (
              <button
                key={count}
                type="button"
                className={`bot-option ${count === botCount ? 'is-selected' : ''}`}
                onClick={() => onBotCountChange(count)}
                aria-pressed={count === botCount}
                aria-label={`${count} ${count === 1 ? 'bot' : 'bots'} plus you`}
              >
                <span className="bot-option-count">{count}</span>
                <span className="bot-option-seats" aria-hidden="true">
                  {Array.from({ length: count + 1 }, (_, index) => (
                    <i key={index} className={index === 0 ? 'is-you' : ''} />
                  ))}
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <p className="setup-stack">
          Starting stack <strong>{formatChips(GAME_CONFIG.startingStack)}</strong> chips
          each
        </p>

        {sound && (
          <SoundControls
            prefs={sound.prefs}
            onMute={sound.setMuted}
            onVolume={sound.setVolume}
            onAmbient={sound.setAmbient}
          />
        )}

        <button type="button" className="ranks-link" onClick={() => setRanksOpen(true)}>
          How to play / hand rankings
        </button>

        <button type="button" className="start-game-btn" onClick={onStart}>
          Start Game
        </button>
      </div>
      {ranksOpen && <HandRankingsModal onClose={() => setRanksOpen(false)} />}
    </div>
  )
}
