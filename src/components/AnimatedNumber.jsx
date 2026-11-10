import { animate } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { formatChips } from '../config.js'

export function AnimatedNumber({ value, reducedMotion = false }) {
  const [shown, setShown] = useState(value)
  const shownRef = useRef(value)

  useEffect(() => {
    if (reducedMotion || shownRef.current === value) {
      shownRef.current = value
      setShown(value)
      return undefined
    }
    const rising = value > shownRef.current
    const control = animate(shownRef.current, value, {
      duration: rising ? 0.85 : 0.28,
      ease: 'easeOut',
      onUpdate: (next) => {
        const rounded = Math.round(next)
        shownRef.current = rounded
        setShown(rounded)
      },
    })
    return () => control.stop()
  }, [value, reducedMotion])

  return formatChips(shown)
}
