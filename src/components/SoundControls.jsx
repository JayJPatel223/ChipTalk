function IconSound({ muted }) {
  return (
    <svg viewBox="0 0 24 24" className="sound-icon" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 9v6h4l5 4V5L8 9H4zm13.5 3c0-1.8-1-3.3-2.5-4.1v8.2c1.5-.8 2.5-2.3 2.5-4.1z"
      />
      {muted && <path fill="none" stroke="currentColor" strokeWidth="2" d="M4 4l16 16" />}
    </svg>
  )
}

function IconVolume() {
  return (
    <svg viewBox="0 0 24 24" className="sound-icon" aria-hidden="true">
      <path fill="currentColor" d="M5 11h3l4-4v10l-4-4H5v-2zm10.2-3.2 1.4-1.4A8 8 0 0 1 19 12a8 8 0 0 1-2.4 5.6l-1.4-1.4A6 6 0 0 0 17 12a6 6 0 0 0-1.8-4.2z" />
    </svg>
  )
}

function IconAmbience() {
  return (
    <svg viewBox="0 0 24 24" className="sound-icon" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6 18c1.7 0 3-1.3 3-3V5H7v10c0 .6-.4 1-1 1s-1-.4-1-1V8H3v7c0 1.7 1.3 3 3 3zm8 0c1.7 0 3-1.3 3-3V5h-2v10c0 .6-.4 1-1 1s-1-.4-1-1V8h-2v7c0 1.7 1.3 3 3 3z"
      />
    </svg>
  )
}

export function SoundControls({ prefs, onMute, onVolume, onAmbient }) {
  return (
    <div className="sound-controls" role="group" aria-label="Sound">
      <button
        type="button"
        className={`sound-btn ${prefs.muted ? 'is-muted' : 'is-on'}`}
        onClick={() => onMute(!prefs.muted)}
        aria-pressed={!prefs.muted}
        aria-label={prefs.muted ? 'Sound off' : 'Sound on'}
      >
        <IconSound muted={prefs.muted} />
        {prefs.muted ? 'Off' : 'Sound'}
      </button>
      <label className="sound-volume">
        <IconVolume />
        <span className="sound-volume-label">Vol</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={prefs.volume}
          disabled={prefs.muted}
          aria-label="Volume"
          onChange={(event) => onVolume(Number(event.target.value))}
        />
      </label>
      <button
        type="button"
        className={`sound-btn ${prefs.ambient && !prefs.muted ? 'is-on' : ''}`}
        onClick={() => onAmbient(!prefs.ambient)}
        aria-pressed={Boolean(prefs.ambient) && !prefs.muted}
        disabled={prefs.muted}
        aria-label={prefs.ambient ? 'Ambience on' : 'Ambience off'}
      >
        <IconAmbience />
        Ambience
      </button>
    </div>
  )
}
