/** Small stroke icons for the table HUD. All decorative: pair with a visible or aria label. */
function Svg({ children, className = 'hud-icon' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

export function IconBulb() {
  return (
    <Svg>
      <path d="M9 18h6" />
      <path d="M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />
    </Svg>
  )
}

export function IconHistory() {
  return (
    <Svg>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 7v5l3 2" />
    </Svg>
  )
}

export function IconMenu() {
  return (
    <Svg>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </Svg>
  )
}

export function IconBook() {
  return (
    <Svg>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
    </Svg>
  )
}

export function IconExit() {
  return (
    <Svg>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 17l-5-5 5-5" />
      <path d="M5 12h11" />
    </Svg>
  )
}

export function IconSpeaker({ muted = false }) {
  return (
    <Svg>
      <path d="M4 9v6h4l5 4V5L8 9z" />
      {muted ? (
        <>
          <path d="M17 9l4 6" />
          <path d="M21 9l-4 6" />
        </>
      ) : (
        <path d="M16.5 8.5a5 5 0 0 1 0 7" />
      )}
    </Svg>
  )
}

export function IconClose() {
  return (
    <Svg>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </Svg>
  )
}
