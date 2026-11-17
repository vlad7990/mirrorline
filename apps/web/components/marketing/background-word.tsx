/**
 * 17 §1 M10 · One oversized word behind a band, drifting slower than the
 * content that passes over it (Arigo).
 *
 * **One band, deliberately.** The spec says "two or three bands" and then
 * "trial on one band first", and the second instruction is the one worth
 * following: this is a device that either reads as scale or reads as a
 * mistake, and three shipped at once is three to undo. The band chosen is
 * "Nothing reaches your calendar unchecked" — PROVEN — because it is the one
 * argument section carrying no other motion. The hero, the Output sequence
 * and the metrics band each already have something moving, and a second slow
 * layer behind any of those is two parallaxes disagreeing about depth.
 *
 * **It is decoration and says so.** `aria-hidden`, and the claim it makes is
 * always also made in the real heading it sits behind — nothing is conveyed
 * by this alone, which 17's accessibility rule requires.
 *
 * **It is a `backdrop`, not a sibling.** `Section` already owns that slot,
 * and with it the `relative isolate overflow-clip` that stops the word
 * spilling into the bands above and below. The `clip`-not-`hidden` note on
 * that prop matters here too: `hidden` makes the band a scrollport, and a
 * `view()` timeline measured against the band it cannot move within freezes
 * at a constant progress.
 */

import { cn } from '@mirrorline/ui'

export interface BackgroundWordProps {
  /** Pass it as a word; the upper case is the CSS's business, not the DOM's. */
  readonly children: string
  readonly className?: string
}

export function BackgroundWord({ children, className }: BackgroundWordProps) {
  return (
    <span aria-hidden="true" className={cn('band-word', className)}>
      {children}
    </span>
  )
}
