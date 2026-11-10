import { useEffect, useMemo, useState } from 'react'
import { formatChips } from '../config.js'
import { callSubtitle } from '../game/potOdds.js'
import { Chip } from './Chip.jsx'

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}

function typingInField() {
  const node = document.activeElement
  if (!node) return false
  const tag = node.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return Boolean(node.isContentEditable)
}

export function ActionBar({
  legal,
  isHeroTurn,
  heroStack = 0,
  pot = 0,
  disabled = false,
  onAction,
}) {
  const types = legal?.types ?? []
  const canFold = types.includes('fold')
  const canCheck = types.includes('check')
  const canCall = types.includes('call')
  const canBet = types.includes('bet')
  const canRaise = types.includes('raise')
  const canAllIn = types.includes('allIn')
  const sizing = canBet ? 'bet' : canRaise ? 'raise' : null

  const minAmount = sizing === 'bet' ? legal.minBet : legal?.minRaise ?? 0
  const maxAmount = sizing === 'bet' ? legal.maxBet : legal?.maxRaise ?? 0
  const sliderMax = Math.max(minAmount, maxAmount)
  const sliderMin = Math.min(minAmount, sliderMax)

  const [amount, setAmount] = useState(sliderMin)
  const enabled = isHeroTurn && !disabled

  useEffect(() => {
    setAmount(clamp(sliderMin, sliderMin, sliderMax))
  }, [sliderMin, sliderMax, legal?.playerId, sizing])

  const payableCall = Math.min(legal?.toCall ?? 0, heroStack)
  const amountLabel = sizing === 'bet' ? 'Bet to' : 'Raise to'
  const halfPot = clamp(Math.round(pot / 2), sliderMin, sliderMax)
  const potSize = clamp(pot, sliderMin, sliderMax)
  const ticks = [...new Set([sliderMin, halfPot, potSize, sliderMax].filter((value) => value > 0))]

  const callLabel = useMemo(() => {
    if (canCheck) return 'Check'
    if (canCall) return `Call ${formatChips(payableCall)}`
    return 'Call'
  }, [canCheck, canCall, payableCall])

  const oddsLine = callSubtitle(canCheck ? 0 : payableCall, pot)

  function setClamped(next) {
    setAmount(clamp(next, sliderMin, sliderMax))
  }

  function submit(type, extra = {}) {
    if (!enabled) return
    onAction({ type, ...extra })
  }

  const sizeLegal = (sizing === 'bet' && canBet) || (sizing === 'raise' && canRaise)
  const sizeIsAllInOnly = !sizeLegal && canAllIn
  const sizeButtonLabel = sizeIsAllInOnly
    ? 'All In'
    : enabled && sizeLegal
      ? `${amountLabel} ${formatChips(amount)}`
      : amountLabel === 'Bet to'
        ? 'Bet'
        : 'Raise'

  useEffect(() => {
    function onKey(event) {
      if (!enabled || typingInField() || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      const key = event.key.toLowerCase()
      if (key === 'f' && canFold) {
        event.preventDefault()
        submit('fold')
      } else if (key === 'c' && (canCheck || canCall)) {
        event.preventDefault()
        submit(canCheck ? 'check' : 'call')
      } else if (key === 'r' && (sizeLegal || canAllIn)) {
        event.preventDefault()
        if (sizeIsAllInOnly) submit('allIn')
        else submit(sizing, { amount })
      } else if (key === 'a' && canAllIn) {
        event.preventDefault()
        submit('allIn')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    enabled,
    canFold,
    canCheck,
    canCall,
    canAllIn,
    sizeLegal,
    sizeIsAllInOnly,
    sizing,
    amount,
    onAction,
  ])

  const range = Math.max(1, sliderMax - sliderMin)

  return (
    <section className="action-bar" aria-label="Betting controls">
      <div className="action-buttons">
        <button
          type="button"
          className="action-btn fold"
          disabled={!enabled || !canFold}
          aria-label="Fold"
          onClick={() => submit('fold')}
        >
          Fold
          <kbd className="key-hint">F</kbd>
        </button>
        <button
          type="button"
          className="action-btn call"
          disabled={!enabled || (!canCheck && !canCall)}
          aria-label={callLabel}
          onClick={() => submit(canCheck ? 'check' : 'call')}
        >
          <span className="action-btn-title">{callLabel}</span>
          <span className="action-btn-sub">{oddsLine}</span>
          <kbd className="key-hint">C</kbd>
        </button>
        <button
          type="button"
          className="action-btn raise"
          disabled={!enabled || (!sizeLegal && !canAllIn)}
          aria-label={sizeButtonLabel}
          onClick={() => {
            if (sizeIsAllInOnly) submit('allIn')
            else submit(sizing, { amount })
          }}
        >
          {sizeButtonLabel}
          <kbd className="key-hint">R</kbd>
        </button>
      </div>

      <div className="bet-slider-wrap">
        <label htmlFor="raise-slider" className="bet-slider-label">
          {amountLabel}
        </label>
        <div className="bet-slider-track">
          <input
            id="raise-slider"
            className="bet-slider"
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={1}
            value={amount}
            disabled={!enabled || !sizeLegal}
            aria-label={`${amountLabel} slider`}
            onChange={(event) => setClamped(Number(event.target.value))}
          />
          <div className="bet-ticks" aria-hidden="true">
            {ticks.map((tick) => (
              <span
                key={tick}
                className="bet-tick"
                style={{ left: `${((tick - sliderMin) / range) * 100}%` }}
              />
            ))}
          </div>
        </div>
        <div className="bet-amount-cluster">
          <Chip amount={amount} compact showAmount={false} />
          <input
            id="raise-amount"
            className="bet-amount-input"
            type="number"
            inputMode="numeric"
            min={sliderMin}
            max={sliderMax}
            step={1}
            value={amount}
            disabled={!enabled || !sizeLegal}
            aria-label={`${amountLabel} amount`}
            onChange={(event) => setClamped(Number(event.target.value))}
          />
        </div>
        <div className="bet-presets">
          <button
            type="button"
            className={amount === sliderMin ? 'is-selected' : ''}
            disabled={!enabled || !sizeLegal}
            onClick={() => setClamped(sliderMin)}
          >
            Min
          </button>
          <button
            type="button"
            className={amount === halfPot ? 'is-selected' : ''}
            disabled={!enabled || !sizeLegal}
            onClick={() => setClamped(halfPot)}
          >
            ½ Pot
          </button>
          <button
            type="button"
            className={amount === potSize ? 'is-selected' : ''}
            disabled={!enabled || !sizeLegal}
            onClick={() => setClamped(potSize)}
          >
            Pot
          </button>
          <button
            type="button"
            className="allin-preset"
            disabled={!enabled || !canAllIn}
            aria-label="All-in"
            onClick={() => submit('allIn')}
          >
            All-in
            <kbd className="key-hint">A</kbd>
          </button>
        </div>
      </div>
    </section>
  )
}
