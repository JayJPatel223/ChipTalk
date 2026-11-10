import { useCallback, useEffect, useState } from 'react'
import { soundManager } from '../sounds/soundManager.js'

export function useSoundEffects() {
  const [prefs, setPrefs] = useState(() => soundManager.prefs())

  useEffect(() => {
    soundManager.prefs()
  }, [])

  const refresh = useCallback(() => {
    setPrefs({ ...soundManager.prefs() })
  }, [])

  const unlock = useCallback(() => {
    soundManager.unlock()
    refresh()
  }, [refresh])

  const setMuted = useCallback(
    (muted) => {
      soundManager.unlock()
      soundManager.setMuted(muted)
      refresh()
    },
    [refresh],
  )

  const setVolume = useCallback(
    (volume) => {
      soundManager.unlock()
      soundManager.setVolume(volume)
      refresh()
    },
    [refresh],
  )

  const setAmbient = useCallback(
    (on) => {
      soundManager.unlock()
      soundManager.setAmbient(on)
      refresh()
    },
    [refresh],
  )

  const cue = useCallback((event, context) => {
    soundManager.cue(event, context)
  }, [])

  return { prefs, unlock, setMuted, setVolume, setAmbient, cue }
}
