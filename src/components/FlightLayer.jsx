import { AnimatePresence, motion } from 'framer-motion'
import { Card } from './Card.jsx'
import { Chip } from './Chip.jsx'

export function FlightLayer({ flights = [], reducedMotion = false }) {
  if (reducedMotion) return null
  return (
    <div className="flight-layer" aria-hidden="true">
      <AnimatePresence>
        {flights.map((flight) => {
          if (!flight.from || !flight.to) return null
          const duration = reducedMotion ? 0.08 : (flight.duration ?? 300) / 1000
          const animate = flight.mid
            ? {
                x: [flight.from.x, flight.mid.x, flight.to.x],
                y: [flight.from.y, flight.mid.y, flight.to.y],
                rotate: [flight.rotate ?? 0, (flight.rotate ?? 0) / 2, 0],
                opacity: 1,
              }
            : {
                x: flight.to.x,
                y: flight.to.y,
                rotate: 0,
                scale: flight.allIn ? 1.22 : 1,
                opacity: 1,
              }
          return (
            <motion.div
              key={flight.id}
              className={`flight-item is-${flight.kind} ${flight.allIn ? 'is-allin' : ''}`}
              initial={{
                x: flight.from.x,
                y: flight.from.y,
                opacity: 1,
                rotate: flight.rotate ?? 0,
                scale: flight.allIn ? 1.12 : 1,
              }}
              animate={animate}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration, ease: 'easeOut' }}
            >
              {flight.kind === 'card' ? (
                <Card rank="?" suit="?" faceUp={false} size="sm" />
              ) : (
                <Chip amount={Math.max(1, Math.round(flight.amount ?? 0))} compact />
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
