import { motion } from 'framer-motion'
import { useId } from 'react'
import { FACE_RANKS, PIP_LAYOUTS } from '../cards/pipLayout.js'
import { FaceArt } from '../cards/FaceArt.jsx'
import { SUIT_META, SuitMark } from '../cards/suits.jsx'
import { formatCardName } from '../game/cardName.js'

const SIZES = {
  sm: { w: 38, h: 53 },
  md: { w: 68, h: 95 },
  lg: { w: 138, h: 193 },
}

function CardBack() {
  const uid = useId().replace(/:/g, '')
  const lattice = `ct-lattice-${uid}`
  return (
    <g>
      <defs>
        <pattern id={lattice} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(0)">
          <path d="M7 0 L14 7 L7 14 L0 7 Z" fill="none" stroke="#f0d36a" strokeWidth="0.55" opacity="0.45" />
        </pattern>
      </defs>
      <rect x="4" y="4" width="132" height="188" rx="10" fill="#0c2f1c" />
      <rect x="10" y="10" width="120" height="176" rx="8" fill="#134a2b" stroke="#f0d36a" strokeWidth="2" />
      <rect x="16" y="16" width="108" height="164" rx="6" fill={`url(#${lattice})`} />
      <rect x="16" y="16" width="108" height="164" rx="6" fill="none" stroke="#f0d36a" strokeWidth="0.7" opacity="0.65" />
      <circle cx="70" cy="98" r="18" fill="#0c2f1c" stroke="#f0d36a" strokeWidth="1.4" />
      <text
        x="70"
        y="104"
        textAnchor="middle"
        fill="#f0d36a"
        fontFamily="Georgia, serif"
        fontSize="14"
        fontWeight="700"
      >
        CT
      </text>
    </g>
  )
}

function Corner({ rank, suit, x, y, flip }) {
  const fill = SUIT_META[suit]?.fill ?? '#12151c'
  return (
    <g transform={flip ? `translate(${x} ${y}) rotate(180)` : `translate(${x} ${y})`} fill={fill}>
      <text
        x="0"
        y="0"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize={rank === '10' ? 16 : 22}
        fontWeight="700"
      >
        {rank}
      </text>
      <SuitMark suit={suit} x={0} y={22} size={17} />
    </g>
  )
}

function FaceCard({ rank, suit }) {
  const fill = SUIT_META[suit]?.fill ?? '#12151c'
  return (
    <g>
      <rect x="3" y="3" width="134" height="190" rx="10" fill="#fffef8" stroke="#cfc6b4" strokeWidth="1" />
      <Corner rank={rank} suit={suit} x={16} y={22} />
      <Corner rank={rank} suit={suit} x={124} y={174} flip />
      <FaceArt rank={rank} suit={suit} />
      <rect x="32" y="38" width="76" height="120" rx="6" fill="none" stroke={fill} strokeWidth="1.2" />
    </g>
  )
}

function NumberCard({ rank, suit }) {
  const pips = PIP_LAYOUTS[rank] ?? []

  return (
    <g>
      <rect x="3" y="3" width="134" height="190" rx="10" fill="#fffef8" stroke="#cfc6b4" strokeWidth="1" />
      <Corner rank={rank} suit={suit} x={16} y={22} />
      <Corner rank={rank} suit={suit} x={124} y={174} flip />
      {rank === 'A' ? (
        <SuitMark suit={suit} x={70} y={100} size={72} />
      ) : (
        pips.map((pip, index) => (
          <SuitMark
            key={`${rank}-${index}`}
            suit={suit}
            x={pip.x}
            y={pip.y}
            size={rank === '10' || rank === '9' ? 20 : rank === '8' ? 22 : 26}
            flip={pip.flip}
          />
        ))
      )}
    </g>
  )
}

export function Card({ rank, suit, faceUp, size = 'md', className = '' }) {
  const dim = SIZES[size] ?? SIZES.md
  const label = formatCardName(rank, suit, faceUp)

  return (
    <svg
      className={`playing-card card-${size} ${className}`.trim()}
      width={dim.w}
      height={dim.h}
      viewBox="0 0 140 196"
      role="img"
      aria-label={label}
    >
      {!faceUp && <CardBack />}
      {faceUp && FACE_RANKS.has(rank) && <FaceCard rank={rank} suit={suit} />}
      {faceUp && !FACE_RANKS.has(rank) && <NumberCard rank={rank} suit={suit} />}
    </svg>
  )
}

/** Short flip used for community reveals and the user's dealt hole cards. */
export function RevealedCard({ rank, suit, size = 'md', reducedMotion = false, className = '' }) {
  if (reducedMotion) {
    return <Card rank={rank} suit={suit} faceUp size={size} className={className} />
  }
  return (
    <motion.div
      className={`card-flip-scene ${className}`.trim()}
      initial={{ rotateY: 180, scale: 0.9 }}
      animate={{ rotateY: 0, scale: [0.9, 1.08, 1] }}
      transition={{ duration: 0.3, times: [0, 0.7, 1], ease: 'easeOut' }}
    >
      <div className="card-flip-face card-flip-back" aria-hidden="true">
        <Card rank="?" suit="?" faceUp={false} size={size} />
      </div>
      <div className="card-flip-face card-flip-front">
        <Card rank={rank} suit={suit} faceUp size={size} />
      </div>
    </motion.div>
  )
}
