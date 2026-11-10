import { SuitPath, SUIT_META } from './suits.jsx'

/** Stylised court figures so J/Q/K are not just a giant letter. */
export function FaceArt({ rank, suit }) {
  const fill = SUIT_META[suit]?.fill ?? '#161616'
  const robe = rank === 'K' ? '#2b2158' : rank === 'Q' ? '#7a1e4a' : '#1d4f73'
  const accent = rank === 'K' ? '#e4c36a' : rank === 'Q' ? '#efc4d6' : '#7ec8e3'

  return (
    <g>
      <rect x="32" y="38" width="76" height="120" rx="6" fill="#f7f1e3" stroke={fill} strokeWidth="1.4" />
      <rect x="36" y="42" width="68" height="112" rx="4" fill={robe} />

      <ellipse cx="70" cy="86" rx="18" ry="22" fill="#f3d2b3" />
      <ellipse cx="70" cy="88" rx="12" ry="8" fill="#e8b894" />
      <circle cx="64" cy="82" r="1.6" fill="#2a1a12" />
      <circle cx="76" cy="82" r="1.6" fill="#2a1a12" />
      <path d="M64 92 Q70 96 76 92" fill="none" stroke="#8a4b32" strokeWidth="1.2" />

      {rank === 'J' && (
        <path d="M52 68 Q70 48 88 68 L84 74 Q70 62 56 74 Z" fill={accent} />
      )}
      {rank === 'Q' && (
        <>
          <path d="M50 70 L56 52 L64 64 L70 46 L76 64 L84 52 L90 70 Z" fill={accent} />
          <path d="M58 118 Q70 138 82 118" fill={accent} />
        </>
      )}
      {rank === 'K' && (
        <>
          <path d="M50 70 L55 50 L63 62 L70 44 L77 62 L85 50 L90 70 Z" fill={accent} />
          <rect x="62" y="94" width="16" height="6" rx="1" fill="#5a3a22" />
        </>
      )}

      <path d="M48 108 Q70 124 92 108 L88 150 H52 Z" fill={accent} opacity="0.9" />
      <g transform="translate(70 140) scale(0.22) translate(-50 -50)" fill={fill}>
        <SuitPath suit={suit} />
      </g>
      <text
        x="70"
        y="58"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontSize="13"
        fontWeight="700"
        fill={accent}
      >
        {rank}
      </text>
    </g>
  )
}
