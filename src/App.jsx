import { useEffect, useState } from 'react'
import { Table } from './components/Table.jsx'
import { ActionBar } from './components/ActionBar.jsx'
import { CardAtlas } from './components/CardAtlas.jsx'
import { SetupScreen } from './components/SetupScreen.jsx'
import { HandResult } from './components/HandResult.jsx'
import { HandHistoryDrawer } from './components/HandHistoryDrawer.jsx'
import { SoundControls } from './components/SoundControls.jsx'
import { TableMenu } from './components/TableMenu.jsx'
import { HandRankingsModal } from './components/HandRankingsModal.jsx'
import { IconBulb, IconHistory, IconSpeaker } from './components/Icons.jsx'
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
  const [showRules, setShowRules] = useState(false)

  useEffect(() => {
    if (!showRules && !showHistory) return undefined
    function onKey(event) {
      if (event.key !== 'Escape') return
      setShowRules(false)
      setShowHistory(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showRules, showHistory])

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
          {view && (
            <p className="hud-blinds" aria-label={`Blinds ${view.blinds}`}>
              <span className="hud-blinds-kicker">Blinds</span>
              {view.blinds.replace(/\s/g, '')}
            </p>
          )}
          <button
            type="button"
            className={`hud-btn ${showHint ? 'is-on' : ''}`}
            aria-pressed={showHint}
            aria-label="Hand strength hint"
            title="Hand strength hint"
            onClick={() => setShowHint((on) => !on)}
          >
            <IconBulb />
            <span className="hud-btn-label">Hint</span>
          </button>
          <button
            type="button"
            className={`hud-btn ${showHistory ? 'is-on' : ''}`}
            aria-pressed={showHistory}
            aria-label="Hand history"
            title="Hand history"
            onClick={() => setShowHistory((on) => !on)}
          >
            <IconHistory />
            <span className="hud-btn-label">History</span>
          </button>
          {sound && (
            <>
              <div className="hud-sound-inline">
                <SoundControls
                  prefs={sound.prefs}
                  onMute={sound.setMuted}
                  onVolume={sound.setVolume}
                  onAmbient={sound.setAmbient}
                />
              </div>
              <button
                type="button"
                className={`hud-btn hud-mute ${sound.prefs.muted ? '' : 'is-on'}`}
                aria-pressed={!sound.prefs.muted}
                aria-label={sound.prefs.muted ? 'Sound off' : 'Sound on'}
                title={sound.prefs.muted ? 'Sound off' : 'Sound on'}
                onClick={() => sound.setMuted(!sound.prefs.muted)}
              >
                <IconSpeaker muted={sound.prefs.muted} />
              </button>
            </>
          )}
          <TableMenu
            sound={sound}
            onShowRules={() => setShowRules(true)}
            onBackToSetup={backToSetup}
          />
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
      {thinkingSeat && !blocking && (
        <p className="turn-hint sr-live">{thinkingSeat.name} is thinking</p>
      )}
      <div className="table-dock">
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
      {showRules && <HandRankingsModal onClose={() => setShowRules(false)} />}
    </div>
  )
}

export default App
