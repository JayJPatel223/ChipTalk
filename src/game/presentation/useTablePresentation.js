import { useEffect, useMemo, useRef, useState } from 'react'
import { eventsFromTransition, snapshotEngine } from './events.js'
import { overlayView } from './overlay.js'
import { isUsablePoint, relativeCenter, waitForDealLayout, waitForFrame } from './layout.js'
import { durationFor, prefersReducedMotion, TIMING, waitMs } from './timing.js'

function emptyDisplay(reducedMotion, handNumber = null) {
  return {
    handNumber,
    revealedCommunity: 0,
    bets: {},
    stacks: {},
    potBehind: 0,
    holeCounts: {},
    holesReady: false,
    heroFlip: {},
    folding: {},
    flights: [],
    dealCards: [],
    reducedMotion,
    allInPulse: null,
    showdownOn: false,
    settledPot: false,
    actionLabels: {},
  }
}

function displayFromSnap(snap, reducedMotion) {
  if (!snap) return emptyDisplay(reducedMotion)
  const bets = {}
  const stacks = {}
  const holeCounts = {}
  const heroFlip = {}
  for (const player of snap.players) {
    bets[player.id] = snap.settled ? 0 : player.roundBet
    stacks[player.id] = player.stack
    holeCounts[player.id] = player.holeCount
    heroFlip[player.id] = 2
  }
  const streetBets = snap.players.reduce((sum, player) => sum + player.roundBet, 0)
  const committed = snap.players.reduce((sum, player) => sum + player.committed, 0)
  return {
    handNumber: snap.handNumber,
    revealedCommunity: snap.community.length,
    bets,
    stacks,
    potBehind: snap.settled ? 0 : Math.max(0, committed - streetBets),
    holeCounts,
    holesReady: true,
    heroFlip,
    folding: {},
    flights: [],
    dealCards: [],
    reducedMotion,
    allInPulse: null,
    showdownOn: Boolean(snap.settled && snap.results?.reason === 'showdown'),
    settledPot: Boolean(snap.settled),
    actionLabels: {},
  }
}

function centerOf(el, root) {
  return relativeCenter(el, root)
}

export function useTablePresentation({ engine, screen, view, intentRef, onCue }) {
  const [display, setDisplay] = useState(() => emptyDisplay(prefersReducedMotion()))
  const [blocking, setBlocking] = useState(false)
  const registry = useRef({
    felt: null,
    deck: null,
    pot: null,
    holes: {},
    bets: {},
    stacks: {},
    seats: {},
  })
  const abortRef = useRef(null)
  const completedRef = useRef(new Set())
  const snapRef = useRef(null)
  const onCueRef = useRef(onCue)
  onCueRef.current = onCue

  const cue = (payload) => {
    try {
      onCueRef.current?.(payload)
    } catch {
      /* sound must never block or break presentation */
    }
  }

  const setReg = useMemo(
    () => ({
      felt: (el) => {
        registry.current.felt = el
      },
      deck: (el) => {
        registry.current.deck = el
      },
      pot: (el) => {
        registry.current.pot = el
      },
      hole: (id) => (el) => {
        if (el) registry.current.holes[id] = el
      },
      bet: (id) => (el) => {
        if (el) registry.current.bets[id] = el
      },
      stack: (id) => (el) => {
        if (el) registry.current.stacks[id] = el
      },
      seat: (id) => (el) => {
        if (el) registry.current.seats[id] = el
      },
    }),
    [],
  )

  useEffect(() => {
    if (screen !== 'table' || !engine) {
      abortRef.current?.abort()
      completedRef.current.clear()
      snapRef.current = null
      setDisplay(emptyDisplay(prefersReducedMotion()))
      setBlocking(false)
      return undefined
    }

    const reducedMotion = prefersReducedMotion()
    const nextSnap = snapshotEngine(engine)
    const intent = intentRef?.current ?? null
    const prevSnap = intent?.prevSnap ?? snapRef.current
    const events = eventsFromTransition(prevSnap, nextSnap, intent)
    const seq = intent?.seq ?? `h${nextSnap.handNumber}:auto`
    snapRef.current = nextSnap

    if (events.length === 0) {
      setDisplay(displayFromSnap(nextSnap, reducedMotion))
      setBlocking(false)
      return undefined
    }

    if (completedRef.current.has(seq)) {
      setDisplay(displayFromSnap(nextSnap, reducedMotion))
      setBlocking(false)
      return undefined
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setBlocking(true)

    const point = (kind, id) => {
      const root = registry.current.felt
      const el =
        kind === 'deck'
          ? registry.current.deck
          : kind === 'pot'
            ? registry.current.pot
            : registry.current[kind]?.[id]
      const measured = centerOf(el, root)
      return isUsablePoint(measured) ? measured : null
    }

    const dealPoint = (playerId) => {
      const from = point('deck')
      const to = point('holes', playerId) ?? point('seats', playerId)
      if (!isUsablePoint(from) || !isUsablePoint(to)) return null
      return {
        from,
        to,
        mid: {
          x: (from.x + to.x) / 2 + (to.x < from.x ? -24 : 24),
          y: Math.min(from.y, to.y) - 36,
        },
      }
    }

    const snapDealtHoles = (event, patch) => {
      const holeCounts = Object.fromEntries(event.players.map((player) => [player.id, 2]))
      const heroFlip = Object.fromEntries(event.players.map((player) => [player.id, 2]))
      patch((now) => ({
        ...now,
        holeCounts,
        heroFlip,
        holesReady: true,
        dealCards: [],
        flights: (now.flights ?? []).filter((flight) => flight.kind !== 'card'),
      }))
    }

    let flightN = 0
    const run = async () => {
      let local
      if (!prevSnap || prevSnap.handNumber !== nextSnap.handNumber) {
        const stacks = {}
        const bets = {}
        const holeCounts = {}
        for (const player of nextSnap.players) {
          stacks[player.id] = player.stack + player.roundBet
          bets[player.id] = 0
          holeCounts[player.id] = 0
        }
        local = {
          ...emptyDisplay(reducedMotion, nextSnap.handNumber),
          stacks,
          bets,
          holeCounts,
        }
      } else {
        local = displayFromSnap(prevSnap, reducedMotion)
      }
      setDisplay({ ...local, reducedMotion })

      const patch = (updater) => {
        if (controller.signal.aborted) return
        local = updater(local)
        setDisplay({ ...local, reducedMotion })
      }

      const addFlight = (flight) => {
        flightN += 1
        const item = { id: `${seq}-f${flightN}`, ...flight }
        patch((now) => ({ ...now, flights: [...(now.flights ?? []), item] }))
        return item.id
      }
      const dropFlight = (id) => {
        patch((now) => ({ ...now, flights: (now.flights ?? []).filter((row) => row.id !== id) }))
      }

      for (const event of events) {
        if (controller.signal.aborted) return

        if (event.type === 'deal') {
          if (reducedMotion) {
            snapDealtHoles(event, patch)
            cue({ type: 'dealCard' })
            await waitMs(TIMING.reducedFade, controller.signal)
            continue
          }
          await waitForFrame(controller.signal)
          await waitForFrame(controller.signal)
          const playerIds = event.players.map((player) => player.id)
          const ready = await waitForDealLayout(registry.current, playerIds, controller.signal)
          if (!ready) {
            snapDealtHoles(event, patch)
            continue
          }
          for (let index = 0; index < event.cards.length; index += 1) {
            if (controller.signal.aborted) return
            const card = event.cards[index]
            if (index > 0) await waitMs(TIMING.dealStagger, controller.signal)
            const path = dealPoint(card.playerId)
            if (!path) {
              snapDealtHoles(event, patch)
              break
            }
            const flightId = addFlight({
              kind: 'card',
              from: path.from,
              mid: path.mid,
              to: path.to,
              rotate: path.to.x >= path.from.x ? 18 : -18,
              duration: TIMING.dealTravel,
              isHero: card.isHero,
            })
            cue({ type: 'dealCard' })
            await waitMs(TIMING.dealTravel, controller.signal)
            dropFlight(flightId)
            patch((now) => {
              const holeCounts = { ...now.holeCounts, [card.playerId]: (now.holeCounts[card.playerId] ?? 0) + 1 }
              const heroFlip = { ...now.heroFlip }
              if (!card.isHero) heroFlip[card.playerId] = holeCounts[card.playerId]
              return { ...now, holeCounts, heroFlip }
            })
            if (card.isHero) {
              await waitMs(40, controller.signal)
              patch((now) => ({
                ...now,
                heroFlip: { ...now.heroFlip, [card.playerId]: (now.holeCounts[card.playerId] ?? 0) },
              }))
              cue({ type: 'heroFlip' })
              await waitMs(TIMING.dealFlip, controller.signal)
            }
          }
          patch((now) => ({ ...now, dealCards: [], holesReady: true }))
        }

        if (event.type === 'blinds' || event.type === 'bet') {
          const posts = event.type === 'blinds' ? event.posts : [{ ...event, amount: event.to }]
          for (const post of posts) {
            const playerId = post.playerId
            const amount = post.amount ?? post.to
            const fromAmt = post.from ?? 0
            const delta = post.delta ?? amount - fromAmt
            const allIn = Boolean(post.allIn)
            const travel = durationFor(reducedMotion, allIn ? TIMING.allInTravel : TIMING.chipTravel)
            const chipFrom = point('stacks', playerId)
            const chipTo = point('bets', playerId)
            const flightId =
              chipFrom && chipTo
                ? addFlight({
                    kind: 'chip',
                    from: chipFrom,
                    to: chipTo,
                    amount: Math.max(1, delta || amount),
                    allIn,
                    duration: travel,
                  })
                : null
            cue({
              type: event.type === 'blinds' ? 'blinds' : 'bet',
              playerId,
              allIn,
              from: fromAmt,
              to: amount,
              actionType: intent?.action?.type,
            })
            if (allIn) patch((now) => ({ ...now, allInPulse: playerId }))
            patch((now) => ({
              ...now,
              bets: { ...now.bets, [playerId]: amount },
              stacks: { ...now.stacks, [playerId]: post.stackAfter ?? now.stacks[playerId] },
            }))
            await waitMs(travel, controller.signal)
            if (flightId) dropFlight(flightId)
            if (allIn) {
              await waitMs(reducedMotion ? 0 : 380, controller.signal)
              patch((now) => ({ ...now, allInPulse: null }))
            }
          }
        }

        if (event.type === 'acted') {
          patch((now) => ({
            ...now,
            actionLabels: { ...(now.actionLabels ?? {}), [event.playerId]: { text: event.text, stamp: event.id } },
          }))
        }

        if (event.type === 'fold') {
          cue({ ...event, actionType: intent?.action?.type })
          patch((now) => ({ ...now, folding: { ...now.folding, [event.playerId]: true } }))
          await waitMs(durationFor(reducedMotion, TIMING.foldTravel), controller.signal)
          patch((now) => {
            const folding = { ...now.folding }
            delete folding[event.playerId]
            return { ...now, folding }
          })
        }

        if (event.type === 'gather') {
          const travel = durationFor(reducedMotion, TIMING.gatherTravel)
          const ids = []
          for (const bet of event.bets) {
            const from = point('bets', bet.playerId)
            const to = point('pot')
            if (from && to) {
              ids.push(
                addFlight({
                  kind: 'chip',
                  from,
                  to,
                  amount: bet.amount,
                  duration: travel,
                }),
              )
            }
          }
          await waitMs(travel, controller.signal)
          ids.forEach(dropFlight)
          const gathered = event.bets.reduce((sum, bet) => sum + bet.amount, 0)
          patch((now) => {
            const bets = { ...now.bets }
            for (const bet of event.bets) bets[bet.playerId] = 0
            return { ...now, bets, potBehind: (now.potBehind ?? 0) + gathered }
          })
        }

        if (event.type === 'flop') {
          for (let i = 0; i < event.cards.length; i += 1) {
            if (i > 0) await waitMs(durationFor(reducedMotion, TIMING.flopStagger), controller.signal)
            cue({ type: 'flop' })
            patch((now) => ({ ...now, revealedCommunity: Math.max(now.revealedCommunity, i + 1) }))
            await waitMs(durationFor(reducedMotion, TIMING.boardFlip), controller.signal)
          }
        }

        if (event.type === 'boardCard') {
          cue({ type: 'boardCard' })
          patch((now) => ({ ...now, revealedCommunity: Math.max(now.revealedCommunity, event.index + 1) }))
          await waitMs(durationFor(reducedMotion, TIMING.boardFlip), controller.signal)
        }

        if (event.type === 'showdown') {
          patch((now) => ({ ...now, showdownOn: true, holesReady: true }))
          await waitMs(durationFor(reducedMotion, TIMING.showdownFlip), controller.signal)
        }

        if (event.type === 'payout') {
          cue(event)
          const travel = durationFor(reducedMotion, TIMING.payoutTravel)
          const ids = []
          for (const pot of event.payouts) {
            const winners = pot.winnerIds ?? []
            const share = winners.length ? pot.amount / winners.length : pot.amount
            for (const winnerId of winners) {
              const from = point('pot')
              const to = point('stacks', winnerId) ?? point('seats', winnerId)
              if (from && to) {
                ids.push(
                  addFlight({
                    kind: 'chip',
                    from,
                    to,
                    amount: share,
                    duration: travel,
                  }),
                )
              }
            }
          }
          await waitMs(travel, controller.signal)
          ids.forEach(dropFlight)
          patch((now) => ({
            ...now,
            bets: Object.fromEntries(Object.keys(now.bets).map((id) => [id, 0])),
            potBehind: 0,
            settledPot: true,
            stacks: { ...now.stacks, ...event.stacksAfter },
            flights: [],
          }))
        }
      }

      if (!controller.signal.aborted) {
        completedRef.current.add(seq)
        setDisplay({
          ...displayFromSnap(nextSnap, reducedMotion),
          actionLabels: local.actionLabels ?? {},
        })
        setBlocking(false)
      }
    }

    const safety = setTimeout(() => {
      if (controller.signal.aborted) return
      completedRef.current.add(seq)
      setDisplay(displayFromSnap(nextSnap, prefersReducedMotion()))
      setBlocking(false)
    }, 12000)

    run()
    return () => {
      controller.abort()
      clearTimeout(safety)
    }
  }, [engine, screen, intentRef])

  const hold = Boolean(screen === 'table' && engine && (blocking || display.handNumber !== engine.handNumber || !display.holesReady))
  const presented = useMemo(() => overlayView(view, display, hold), [view, display, hold])

  return {
    view: presented,
    blocking: hold,
    registry: setReg,
    reducedMotion: display.reducedMotion,
  }
}
