import { useState } from 'react'
import { Table } from './components/Table.jsx'
import { ActionBar } from './components/ActionBar.jsx'
import { CardAtlas } from './components/CardAtlas.jsx'
import { SetupScreen } from './components/SetupScreen.jsx'
import { HandResult } from './components/HandResult.jsx'
import { HandHistoryDrawer } from './components/HandHistoryDrawer.jsx'
import { SoundControls } from './components/SoundControls.jsx'
import { useGameState } from './game/GameProvider.jsx'
import { HERO_ID } from './game/constants.js'
import { EMPTY_LEGAL } from './game/viewTable.js'
import { describeHeroStrength } from './game/handDescribe.js'
import { tableAnnouncement } from './game/handHistory.js'

function App() {
  const showAtlas = new URLSearchParams(window.location.search).get('cards') === '1'
  const {
    screen,
    botCount,
    view,
    error,
    startGame,
    setBotCount,
    applyPlayerAction,
    nextHand,
    backToSetup,
    rematch,
    blocking,
    registry,
    reducedMotion,
    sound,
    thinkDelayMs,
    sessionStats,
  } = useGameState()
  const [showHint, setShowHint] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  if (showAtlas) {
    return <CardAtlas />
  }

  if (screen === 'setup') {
    return (
      <SetupScreen
        botCount={botCount}
        onBotCountChange={setBotCount}
        onStart={() => startGame(botCount)}
        sound={sound}
      />
    )
  }

  const hero = view?.seats.find((seat) => seat.id === HERO_ID)
  const thinkingSeat = view?.seats.find((seat) => seat.isThinking)
  const liveText = tableAnnouncement(view, blocking)

  return (
    <div className={`app-shell ${view?.presentation?.allInPulse ? 'is-allin-flash' : ''}`}>
      <p className="sr-live" role="status" aria-live="polite">
        {liveText}
      </p>
      <header className="table-hud">
        <div className="hud-brand">
          <span className="brand-kicker">Team ZEROX</span>
          <h1 className="brand-title">ChipTalk</h1>
        </div>
        <div className="hud-actions">
          {view && <p className="hud-blinds">{view.blinds}</p>}
          <button
            type="button"
            className={`hint-toggle ${showHint ? 'is-on' : ''}`}
            aria-pressed={showHint}
            aria-label="Hand strength hint"
            onClick={() => setShowHint((on) => !on)}
          >
            Hint
          </button>
          <button
            type="button"
            className={`hint-toggle ${showHistory ? 'is-on' : ''}`}
            aria-pressed={showHistory}
            aria-label="Hand history"
            onClick={() => setShowHistory((on) => !on)}
          >
            History
          </button>
          {sound && (
            <SoundControls
              prefs={sound.prefs}
              onMute={sound.setMuted}
              onVolume={sound.setVolume}
              onAmbient={sound.setAmbient}
            />
          )}
          <button type="button" className="back-setup-btn" onClick={backToSetup}>
            Back to Setup
          </button>
        </div>
      </header>
      {view && (
        <Table
          table={view}
          registry={registry}
          reducedMotion={reducedMotion}
          thinkDelayMs={thinkDelayMs}
          strengthHint={
            showHint && hero && !hero.folded
              ? describeHeroStrength(hero.cards, view.community)
              : null
          }
        />
      )}
      <HandHistoryDrawer
        open={showHistory}
        history={sessionStats?.history ?? []}
        onClose={() => setShowHistory(false)}
      />
      {error && (
        <p className="action-error" role="alert">
          {error}
        </p>
      )}
      {thinkingSeat && !blocking && <p className="turn-hint">{thinkingSeat.name} is thinking</p>}
      {view?.settled ? (
        <HandResult
          view={view}
          onNextHand={nextHand}
          onBackToSetup={backToSetup}
          onRematch={rematch}
          nextHandDisabled={blocking}
          stats={sessionStats}
        />
      ) : (
        <ActionBar
          legal={view?.isHeroTurn ? view.legal : EMPTY_LEGAL}
          isHeroTurn={Boolean(view?.isHeroTurn) && !blocking}
          heroStack={hero?.stack ?? 0}
          pot={view?.pot ?? 0}
          disabled={blocking}
          onAction={applyPlayerAction}
        />
      )}
    </div>
  )
}

export default App
