'use client'

/**
 * Keep Milo off the button somebody came to press.
 *
 * Milo is fixed to the bottom-right corner. Most of the time nothing is there
 * — but every page ends in a CTA band, and on a 390px screen those buttons are
 * full-width, so scrolling to the foot of any page parks a 72px mascot on top
 * of "Book a pilot". The brief is explicit: *must not cover the primary CTA
 * buttons on any page at 390px — move up if it would.*
 *
 * So this measures rather than guessing at a safe offset. Anything marked
 * `data-primary-cta` is checked against where Milo is resting; if they meet,
 * the dock lifts just past the top of the highest offender, and drops again
 * when the overlap passes.
 *
 * ## Why an attribute rather than a list of class names
 *
 * "Primary CTA" is a fact about intent, not about styling: `variant="gold"`
 * is also on a hero link nothing ever covers, and a utility class can be
 * renamed by anybody. One attribute, on the components that own the real
 * conversion buttons, says what it means and greps cleanly.
 *
 * ## Why it reads on scroll rather than observing
 *
 * An `IntersectionObserver` answers "does this overlap the viewport", not
 * "does this overlap that" — the collision would still have to be measured by
 * hand on every change. Reading both rectangles inside a
 * `requestAnimationFrame` is the simpler version of the same work, and it is
 * two `getBoundingClientRect()` calls on a frame that was going to paint.
 */

import * as React from 'react'

/** Marks a button Milo must never sit on. Real CTAs only. */
export const PRIMARY_CTA_ATTRIBUTE = 'data-primary-cta'

/** Clear air between Milo and a button he is avoiding. */
const CLEARANCE_GAP = 12

/**
 * As far as he will ever move.
 *
 * A guard rather than a design: if a page ever marks something enormous, Milo
 * climbing the whole screen would be worse than a small overlap, and this
 * turns that bug into a visible nudge rather than a disappearance.
 */
const MAX_LIFT = 260

export function useCtaClearance(dockRef: React.RefObject<HTMLElement | null>): void {
  React.useEffect(() => {
    const dock = dockRef.current
    if (!dock) return undefined

    let frame = 0
    let applied = 0

    const measure = () => {
      frame = 0

      // Where Milo would sit with no lift at all. Measuring the lifted element
      // and adding back what we applied keeps this from chasing its own tail:
      // otherwise each lift moves him off the button, which removes the reason
      // for the lift, which drops him back onto it.
      const rect = dock.getBoundingClientRect()
      const restingTop = rect.top + applied
      const restingBottom = rect.bottom + applied

      let needed = 0
      for (const element of document.querySelectorAll<HTMLElement>(`[${PRIMARY_CTA_ATTRIBUTE}]`)) {
        const cta = element.getBoundingClientRect()
        if (cta.width === 0 && cta.height === 0) continue

        const meetsAcross = cta.left < rect.right && cta.right > rect.left
        const meetsDown = cta.top < restingBottom && cta.bottom > restingTop
        if (!meetsAcross || !meetsDown) continue

        needed = Math.max(needed, restingBottom - cta.top + CLEARANCE_GAP)
      }

      const lift = Math.min(Math.round(needed), MAX_LIFT)
      if (lift === applied) return

      applied = lift
      dock.style.setProperty('--milo-cta-lift', `${lift}px`)
    }

    const schedule = () => {
      if (frame !== 0) return
      frame = window.requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)

    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [dockRef])
}
