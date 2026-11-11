'use client'

/**
 * A figure that counts up once, when it first comes into view.
 *
 * From docs/design/handoff-v4 §"Website motion system": 1600ms, ease-out
 * cubic, decimals respected.
 *
 * Three decisions worth stating.
 *
 * **It renders the final value on the server.** The animation only replaces
 * it after hydration, and only if it is allowed to run. A number that starts
 * at zero in the markup is a number that reads as zero to anything which
 * never runs the effect — a crawler, a failed hydration, reduced motion.
 *
 * **It counts once.** The observer disconnects on the first hit.
 * Re-counting every time a card scrolls back past is a fidget, not a reveal.
 *
 * **It interpolates against real timestamps**, not a `setInterval` of fixed
 * steps. An interval drifts under load and lands on the wrong number;
 * elapsed-time interpolation always ends exactly on target.
 */

import * as React from 'react'

const DURATION_MS = 1600

/** Ease-out cubic — fast first, settling at the end. The handoff's curve. */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export interface CountUpProps {
  readonly value: number
  /** 2.1 must not render as 2, so this is explicit rather than inferred. */
  readonly decimals?: number
  readonly suffix?: string
  readonly className?: string
}

export function CountUp({ value, decimals = 0, suffix = '', className }: CountUpProps) {
  const ref = React.useRef<HTMLSpanElement>(null)
  // Starts at the real value: see the note above.
  const [shown, setShown] = React.useState(value)

  React.useEffect(() => {
    const node = ref.current
    if (!node) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    let frame = 0
    let start = 0

    const step = (now: number) => {
      if (start === 0) start = now
      const progress = Math.min(1, (now - start) / DURATION_MS)
      setShown(value * easeOutCubic(progress))
      if (progress < 1) frame = requestAnimationFrame(step)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          // Once only.
          observer.disconnect()
          setShown(0)
          frame = requestAnimationFrame(step)
        }
      },
      { threshold: 0.4 },
    )

    observer.observe(node)
    return () => {
      observer.disconnect()
      if (frame !== 0) cancelAnimationFrame(frame)
    }
  }, [value])

  return (
    <span ref={ref} className={className}>
      {shown.toFixed(decimals)}
      {suffix}
    </span>
  )
}
