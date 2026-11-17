'use client'

/**
 * A measured KPI that counts to its value when the card arrives (17 §2).
 *
 * Rendered by `KpiCard` only when counting is switched on; otherwise the card
 * prints a plain `<span>` on the server and ships no JavaScript for it. That
 * matters more than it looks: `KpiCard` is on seven studio surfaces, and
 * making every figure a client component in order to animate the Results tabs
 * would put hydration on screens that asked for none.
 *
 * **The count is never the accessible value.** The running figure is
 * `aria-hidden` and the real one sits beside it in an `sr-only` span, so a
 * screen reader reading mid-count gets 1,240 rather than 613. 15 §8 is about
 * not stating numbers nobody measured, and a half-counted figure is exactly
 * that — it is an artefact of the animation, not a reading. The visual reader
 * sees the end state 1.6s later; the non-visual reader should not have to
 * wait for it, or risk catching it early.
 */

import { cn } from '@mirrorline/ui'

import { useCountUp } from '@/lib/motion/use-count-up'

import { type KpiUnit, formatKpiValue } from './kpi-types'

export interface KpiFigureProps {
  readonly value: number
  readonly unit: KpiUnit
  readonly className?: string
}

export function KpiFigure({ value, unit, className }: KpiFigureProps) {
  const { ref, shown } = useCountUp<HTMLSpanElement>(value)

  return (
    // `count-figure` carries no style. It is the handle the e2e suite uses to
    // find a counting figure and to tell `/app/results` apart from
    // `/app/home`, in the same way `.bar-grow` and `.nav-indicator` are used.
    <span className={cn('count-figure', className)}>
      {/* The ref is on the visible span because that is the box whose arrival
          the observer watches — the sr-only one is clipped to a pixel. */}
      <span ref={ref} aria-hidden="true">
        {formatKpiValue(shown, unit)}
      </span>
      <span className="sr-only">{formatKpiValue(value, unit)}</span>
    </span>
  )
}
