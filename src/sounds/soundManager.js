import { Howl, Howler } from 'howler'
import ambientUrl from './files/ambient.wav'
import allinUrl from './files/allin.wav'
import clinkUrl from './files/clink.wav'
import dealUrl from './files/deal.wav'
import flipUrl from './files/flip.wav'
import foldUrl from './files/fold.wav'
import maniacUrl from './files/maniac.wav'
import raiseUrl from './files/raise.wav'
import rockUrl from './files/rock.wav'
import sharkUrl from './files/shark.wav'
import tricksterUrl from './files/trickster.wav'
import winUrl from './files/win.wav'
import { soundsForCue } from './cues.js'

const SOURCES = {
  ambient: { src: ambientUrl, loop: true, volume: 0.18 },
  deal: { src: dealUrl, volume: 0.55 },
  flip: { src: flipUrl, volume: 0.5 },
  clink: { src: clinkUrl, volume: 0.45 },
  raise: { src: raiseUrl, volume: 0.5 },
  allin: { src: allinUrl, volume: 0.62 },
  win: { src: winUrl, volume: 0.55 },
  fold: { src: foldUrl, volume: 0.42 },
  shark: { src: sharkUrl, volume: 0.32 },
  rock: { src: rockUrl, volume: 0.32 },
  maniac: { src: maniacUrl, volume: 0.34 },
  trickster: { src: tricksterUrl, volume: 0.32 },
}

const STORAGE_KEY = 'chiptalk-sound'

function readPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { muted: false, volume: 0.7, ambient: false }
    const parsed = JSON.parse(raw)
    return {
      muted: Boolean(parsed.muted),
      volume: Number.isFinite(parsed.volume) ? Math.min(1, Math.max(0, parsed.volume)) : 0.7,
      ambient: Boolean(parsed.ambient),
    }
  } catch {
    return { muted: false, volume: 0.7, ambient: false }
  }
}

function writePrefs(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    /* ignore quota / private mode */
  }
}

function createBank() {
  const howls = {}
  for (const [id, spec] of Object.entries(SOURCES)) {
    howls[id] = new Howl({
      src: [spec.src],
      preload: true,
      loop: Boolean(spec.loop),
      volume: spec.volume,
    })
  }
  return howls
}

const prefs = readPrefs()
const howls = createBank()
Howler.volume(prefs.volume)
Howler.mute(prefs.muted)

let unlocked = false
let ambientWanted = prefs.ambient

export const soundManager = {
  prefs() {
    return { ...prefs, unlocked }
  },

  unlock() {
    unlocked = true
    const ctx = Howler.ctx
    if (ctx && ctx.state === 'suspended') ctx.resume()
    this.syncAmbient()
  },

  play(id) {
    if (!id || prefs.muted || !howls[id]) return
    if (!unlocked) return
    if (id === 'ambient') return
    howls[id].stop()
    howls[id].play()
  },

  cue(cue, context) {
    for (const id of soundsForCue(cue, context)) this.play(id)
  },

  setMuted(muted) {
    prefs.muted = Boolean(muted)
    Howler.mute(prefs.muted)
    writePrefs(prefs)
    this.syncAmbient()
  },

  setVolume(volume) {
    prefs.volume = Math.min(1, Math.max(0, volume))
    Howler.volume(prefs.volume)
    writePrefs(prefs)
  },

  setAmbient(on) {
    ambientWanted = Boolean(on)
    prefs.ambient = ambientWanted
    writePrefs(prefs)
    this.syncAmbient()
  },

  syncAmbient() {
    const loop = howls.ambient
    if (!loop) return
    const shouldPlay = unlocked && ambientWanted && !prefs.muted
    if (shouldPlay && !loop.playing()) loop.play()
    if (!shouldPlay && loop.playing()) loop.stop()
  },
}

export function preloadSounds() {
  return soundManager
}
