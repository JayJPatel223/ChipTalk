import { useEffect, useId, useRef, useState } from 'react'
import { SoundControls } from './SoundControls.jsx'
import { IconBook, IconExit, IconMenu } from './Icons.jsx'

/**
 * Overflow menu for the table header. Holds sound settings (on small screens),
 * the hand-rankings guide, and the way back to setup, so the header stays one
 * tidy row on phones and tablets.
 */
export function TableMenu({ sound, onShowRules, onBackToSetup }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return undefined
    function onPointer(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    function onKey(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="hud-menu" ref={rootRef}>
      <button
        type="button"
        className={`hud-btn hud-menu-btn ${open ? 'is-on' : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Menu"
        title="Menu"
        onClick={() => setOpen((on) => !on)}
      >
        <IconMenu />
        <span className="hud-btn-label">Menu</span>
      </button>
      {open && (
        <div className="hud-menu-panel" id={panelId}>
          {sound && (
            <div className="hud-menu-section hud-menu-sound">
              <p className="hud-menu-heading">Sound</p>
              <SoundControls
                prefs={sound.prefs}
                onMute={sound.setMuted}
                onVolume={sound.setVolume}
                onAmbient={sound.setAmbient}
              />
            </div>
          )}
          <div className="hud-menu-section">
            <button
              type="button"
              className="hud-menu-item"
              onClick={() => {
                setOpen(false)
                onShowRules()
              }}
            >
              <IconBook />
              Hand rankings
            </button>
            <button
              type="button"
              className="hud-menu-item is-leave"
              onClick={() => {
                setOpen(false)
                onBackToSetup()
              }}
            >
              <IconExit />
              Back to Setup
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
