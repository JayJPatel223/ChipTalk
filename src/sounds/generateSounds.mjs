import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RATE = 44100
const outDir = join(dirname(fileURLToPath(import.meta.url)), 'files')
mkdirSync(outDir, { recursive: true })

function clamp(value) {
  return Math.max(-1, Math.min(1, value))
}

function writeWav(name, samples) {
  const dataSize = samples.length * 2
  const buffer = Buffer.alloc(44 + dataSize)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(RATE, 24)
  buffer.writeUInt32LE(RATE * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)
  for (let i = 0; i < samples.length; i += 1) {
    buffer.writeInt16LE(Math.round(clamp(samples[i]) * 32767), 44 + i * 2)
  }
  writeFileSync(join(outDir, name), buffer)
}

function render(seconds, fn) {
  const n = Math.floor(RATE * seconds)
  const samples = new Float64Array(n)
  for (let i = 0; i < n; i += 1) samples[i] = fn(i / RATE, i)
  return samples
}

function env(t, attack, decay) {
  if (t < attack) return t / attack
  return Math.exp(-(t - attack) / decay)
}

function noise(i) {
  const x = Math.sin(i * 12.9898) * 43758.5453
  return (x - Math.floor(x)) * 2 - 1
}

writeWav(
  'deal.wav',
  render(0.28, (t, i) => {
    const whoosh = noise(i) * env(t, 0.01, 0.12) * 0.22
    const snap = Math.sin(2 * Math.PI * 1800 * t) * env(Math.max(0, t - 0.14), 0.004, 0.04) * 0.35
    return whoosh + snap
  }),
)

writeWav(
  'flip.wav',
  render(0.22, (t) => {
    const tick = Math.sin(2 * Math.PI * 2400 * t) * env(t, 0.003, 0.05) * 0.28
    const body = Math.sin(2 * Math.PI * 420 * t) * env(t, 0.01, 0.08) * 0.18
    return tick + body
  }),
)

writeWav(
  'clink.wav',
  render(0.2, (t) => Math.sin(2 * Math.PI * 2650 * t) * env(t, 0.002, 0.07) * 0.42),
)

writeWav(
  'raise.wav',
  render(0.42, (t) => {
    const a = Math.sin(2 * Math.PI * 2400 * t) * env(t, 0.002, 0.06) * 0.28
    const b = Math.sin(2 * Math.PI * 2800 * t) * env(Math.max(0, t - 0.09), 0.002, 0.06) * 0.26
    const c = Math.sin(2 * Math.PI * 3200 * t) * env(Math.max(0, t - 0.18), 0.002, 0.07) * 0.24
    return a + b + c
  }),
)

writeWav(
  'allin.wav',
  render(0.5, (t, i) => {
    const boom = Math.sin(2 * Math.PI * 72 * t) * env(t, 0.01, 0.22) * 0.55
    const slam = noise(i) * env(t, 0.004, 0.08) * 0.28
    return boom + slam
  }),
)

writeWav(
  'win.wav',
  render(0.7, (t) => {
    const a = Math.sin(2 * Math.PI * 523 * t) * env(t, 0.01, 0.25) * 0.22
    const b = Math.sin(2 * Math.PI * 659 * t) * env(Math.max(0, t - 0.12), 0.01, 0.25) * 0.2
    const c = Math.sin(2 * Math.PI * 784 * t) * env(Math.max(0, t - 0.24), 0.01, 0.28) * 0.2
    return a + b + c
  }),
)

writeWav(
  'fold.wav',
  render(0.38, (t) => {
    const freq = 420 - t * 280
    return Math.sin(2 * Math.PI * freq * t) * env(t, 0.02, 0.16) * 0.28
  }),
)

writeWav(
  'ambient.wav',
  render(4, (t, i) => {
    const pad = Math.sin(2 * Math.PI * 110 * t) * 0.04 + Math.sin(2 * Math.PI * 165 * t) * 0.03
    const air = noise(i) * 0.015
    const swell = 0.55 + 0.45 * Math.sin(2 * Math.PI * t * 0.25)
    return (pad + air) * swell
  }),
)

writeWav(
  'shark.wav',
  render(0.22, (t) => Math.sin(2 * Math.PI * 880 * t) * env(t, 0.01, 0.1) * 0.22),
)
writeWav(
  'rock.wav',
  render(0.24, (t) => Math.sin(2 * Math.PI * 196 * t) * env(t, 0.02, 0.12) * 0.24),
)
writeWav(
  'maniac.wav',
  render(0.2, (t) => {
    const a = Math.sin(2 * Math.PI * 990 * t) * env(t, 0.004, 0.08) * 0.2
    const b = Math.sin(2 * Math.PI * 1480 * t) * env(t, 0.004, 0.06) * 0.16
    return a + b
  }),
)
writeWav(
  'trickster.wav',
  render(0.26, (t) => {
    const freq = 520 + Math.sin(2 * Math.PI * 12 * t) * 80
    return Math.sin(2 * Math.PI * freq * t) * env(t, 0.01, 0.12) * 0.2
  }),
)

console.log('wrote sound files to', outDir)
