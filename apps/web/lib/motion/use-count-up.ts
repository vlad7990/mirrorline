'use client'

/**
 * The counting figure's mechanics, with no opinion about formatting.
 *
 * Extracted from `components/marketing/count-up.tsx` when the studio needed
 * the same behaviour for a KPI (17 §2: "numbers tick to new values on tab
 * switch"). The two callers format very differently — one prints `2.1` plus a
 * suffix, the other runs the running value through `formatKpiValue`, which
 * thousands-separates, rounds per unit and prefixes a currency symbol — so
 * what is shared is the interpolation, not the markup.
 *
 * Three properties are deliberate, and are why this is a hook rather than a
 * copy in each place.
 *
 * **The caller renders the final value first.** `shown` starts at `value`, so
 * a server render, a crawler, a failed hydration and reduced motion all see
 * the real figure. A number that starts at zero in the markup is a number
 * that reads as zero to anything which never runs the effect.
 *
 * **It counts once per mount.** The observer disconnects on the first hit, so
 * scrolling a figure back past does not re-run it. In the studio that is the
 * whole distinction: arriving on a Results tab is a navigation, so the
 * numbers tick; scrolling up and down the tab you are already on does not
 * make them tick again. A dashboard someone works in all day should confirm
 * an arrival, not fidget.
 *
 * **It interpolates against real timestamps**, not a `setInterval` of fixed
 * steps. An interval drifts under load and lands on the wrong number;
 * elapsed-time interpolation always ends exactly on target.
 */

import * as React from 'react'

/** From docs/design/handoff-v4 §"Website motion system". */
const DURATION_MS = 1600

/** The handoff's curve: fast first, settling at the end. */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export interface CountUpResult<T extends HTMLElement> {
  /** Attach to the element whose arrival starts the count. */
  readonly ref: React.RefObject<T | null>
  /** The running value. Equal to `value` before the count and after it. */
  readonly shown: number
}

/**
 * @param value The real figure. Rendered as-is until the count starts.
 * @param enabled Opt-in. False pins `shown` to `value` and attaches no
 *   observer at all — the default on every studio surface but the Results
 *   tabs.
 */
export function useCountUp<T extends HTMLElement>(value: number, enabled = true): CountUpResult<T> {
  const ref = React.useRef<T>(null)
  const [shown, setShown] = React.useState(value)

  React.useEffect(() => {
    if (!enabled) return undefined

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
  }, [value, enabled])

  return { ref, shown }
}
