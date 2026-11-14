'use client'

/**
 * 17 §2: "on submit the button morphs into a spinner, then a drawn
 * checkmark." For the two public forms — Niche Scan and the contact/lead
 * dialog — which are the ones the spec names.
 *
 * **Why it is here and not in `packages/ui`.** `Button` already has
 * `loading`, which puts a spinner *beside* the label. That is a different
 * thing: the label stays, the box stays, and nothing is said about the
 * result. Teaching `Button` three phases would be a new feature in a package
 * CLAUDE.md keeps closed to anything but bug fixes, so this composes onto the
 * existing button instead.
 *
 * **The collapse animates `max-width`, and that is a scoped exception** to
 * 17's transform/opacity/filter/clip-path budget, taken deliberately. That
 * budget protects scroll-driven animation, which runs for as long as the
 * reader keeps scrolling; this is one element, once, for 420 ms, after a
 * person pressed a button. The alternative inside the letter of the rule is
 * `scaleX` with a counter-scaled child, which needs JavaScript to measure the
 * button on every resize to know which scale lands on 48 px — measuring
 * layout in order to avoid laying out is the wrong trade. It cannot affect
 * CLS either: that is sampled without interaction, and ignores the 500 ms
 * after an input in any case.
 *
 * **The checkmark is drawn with `clip-path`, not `stroke-dashoffset`**, for
 * the reason already written on `.draw-line`: the same wipe, and the one of
 * the two that composites.
 *
 * **The phase is the caller's; the hand-off timing is ours.** The form knows
 * when the request settled, and only this component knows how long the mark
 * takes to draw — so it owns the pause and calls `onSettled` when the mark
 * has landed. Immediately, under reduced motion, where nothing is drawn.
 */

import { Button, cn } from '@mirrorline/ui'
import { Loader2 } from 'lucide-react'
import * as React from 'react'

/**
 * idle → sending → done.
 *
 * There is no failure phase. A failed submit returns to `idle` and the form
 * shows its own `role="alert"`, which is louder and says what went wrong; a
 * red button says neither.
 */
export type SubmitPhase = 'idle' | 'sending' | 'done'

/**
 * How long the mark stays before the caller takes over: the draw in
 * theme.css, plus a beat to read it.
 */
const DONE_HOLD_MS = 900

export interface SubmitMorphProps {
  readonly phase: SubmitPhase
  /** The resting label. */
  readonly children: React.ReactNode
  /** Announced while the request is in flight. */
  readonly sendingLabel: string
  /** Announced once it has succeeded. */
  readonly doneLabel: string
  /** `gold` is the public site's primary (D25). */
  readonly variant?: 'primary' | 'gold'
  readonly fullWidth?: boolean
  /** Fires when the checkmark has landed. Where the caller swaps the form. */
  readonly onSettled?: () => void
  readonly className?: string
}

export function SubmitMorph({
  phase,
  children,
  sendingLabel,
  doneLabel,
  variant = 'primary',
  fullWidth = true,
  onSettled,
  className,
}: SubmitMorphProps) {
  // Held in a ref so a caller passing a fresh closure every render cannot
  // restart the timer and leave the mark on screen indefinitely.
  const settled = React.useRef(onSettled)
  settled.current = onSettled

  React.useEffect(() => {
    if (phase !== 'done') return undefined

    const instant = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(() => settled.current?.(), instant ? 0 : DONE_HOLD_MS)
    return () => window.clearTimeout(timer)
  }, [phase])

  return (
    // Centres the button once it has collapsed. A full-width button that
    // shrinks inside a plain flex column shrinks towards its start edge, and
    // the circle ends up in the corner.
    <div className="flex w-full justify-center">
      <Button
        type="submit"
        variant={variant}
        // Explicit, not inherited. `Button` picks `lg` for `primary` and `md`
        // for everything else, so wrapping the gold Niche Scan button without
        // this quietly took it from DESIGN.md's 48 px primary height down to
        // 44 — found by measuring it on the preview, not by any test. It also
        // has to be 48 for the collapsed shape to be a circle rather than a
        // stadium: `max-width: 3rem` in theme.css is this height.
        size="lg"
        fullWidth={fullWidth}
        data-morph={phase}
        // Pressing twice would send twice. It also stops the morph being
        // interrupted half way through.
        disabled={phase !== 'idle'}
        aria-busy={phase === 'sending' || undefined}
        className={cn('morph-submit', className)}
      >
        <span className="morph-submit__label">{children}</span>

        {/* One cell, two marks, neither in the flow: the label keeps the
            button at its real width, so nothing moves when they appear. */}
        <span aria-hidden="true" className="morph-submit__marks">
          <Loader2 className="morph-submit__spinner size-5" strokeWidth={2} />
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="morph-submit__check size-5"
          >
            <path d="M5 12.5 10 17.5 19 7" />
          </svg>
        </span>
      </Button>

      {/*
        Outside the button on purpose. It is `disabled` from the first phase
        change onward, and a disabled control is dropped from the
        accessibility tree in several combinations — a label inside it would
        be announcing to nobody. SC 4.1.3: a status change the user did not
        request has to be announced without taking focus.
      */}
      <p role="status" className="sr-only">
        {phase === 'sending' ? sendingLabel : phase === 'done' ? doneLabel : ''}
      </p>
    </div>
  )
}
