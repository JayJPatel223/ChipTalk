const BOT_LOOKS = [
  { ring: '#3a7bd5', shirt: '#245a9c' },
  { ring: '#2aa87a', shirt: '#1c7a56' },
  { ring: '#d4a017', shirt: '#a67c0e' },
  { ring: '#c45c7a', shirt: '#8f3d58' },
]

function Face({ skin = '#f0c7a0' }) {
  return (
    <>
      <circle cx="40" cy="42" r="22" fill={skin} />
      <circle cx="33" cy="40" r="2.2" fill="#1b120c" />
      <circle cx="47" cy="40" r="2.2" fill="#1b120c" />
      <path d="M34 50 Q40 54 46 50" fill="none" stroke="#8a4b32" strokeWidth="1.6" />
    </>
  )
}

export function Avatar({ name, isHero = false, botNumber = null }) {
  const look = BOT_LOOKS[(botNumber ?? 1) - 1] ?? BOT_LOOKS[0]

  return (
    <svg className="seat-avatar" viewBox="0 0 80 80" role="img" aria-label={`${name} avatar`}>
      {isHero ? (
        <>
          <circle cx="40" cy="40" r="38" fill="#1d4a2a" />
          <circle cx="40" cy="40" r="34" fill="none" stroke="#f0d36a" strokeWidth="3" />
          <Face />
          <path d="M24 24 H56 V30 H24 Z" fill="#1a1a1a" />
        </>
      ) : (
        <>
          <circle cx="40" cy="40" r="38" fill={look.ring} />
          <circle cx="40" cy="40" r="32" fill="#14301c" />
          <path d="M22 62 Q40 48 58 62" fill={look.shirt} />
          <Face />
        </>
      )}
    </svg>
  )
}
