/**
 * The small card that sits in the corner of a page hero.
 *
 * 19 §Shared rules asks the hero for "an inset preview card bottom-right
 * showing a looping sample relevant to that page". Two things fill it:
 *
 *   - `InsetCycle`, a cross-fade through three stills. This is the default,
 *     and it is a budget decision made into a design one (19 v2 §asset
 *     budget): nine generated loops would have cost 67.5 credits against the
 *     37 we had, so the loop is CSS over frames we already shipped. It costs
 *     nothing, decodes nothing, and never implies footage we do not have.
 *   - Anything absolutely positioned, passed as `children` — which is how
 *     `/product` puts the real `cut-01` loop in its hero. That page is the
 *     one-episode story, so one presenter in one room is the honest picture
 *     there and the wrong one anywhere a range is being claimed (D45).
 *
 * Server components, both of them: the cycle is a CSS animation and the card
 * is a box, so neither needs a byte of JavaScript.
 */

import { AiLabel } from '@mirrorline/ui'
import Image from 'next/image'
import * as React from 'react'

import type { SampleFrame } from './page-media'

/* -------------------------------------------------------------------------- */
/* InsetCycle                                                                  */
/* -------------------------------------------------------------------------- */

export interface InsetCycleProps {
  /**
   * The frames to cycle. Three is the number the CSS is cut for — the
   * keyframes hold each for a quarter of a 12s loop and the children are
   * delayed -4s apart.
   */
  readonly frames: readonly SampleFrame[]
}

/**
 * Three stills cross-fading in place.
 *
 * They are decorative — the caption under the card says what the card is —
 * so the alt is empty and they are hidden from assistive technology, which
 * also keeps a screen reader from announcing three images that are really one
 * picture taking turns.
 *
 * `next/image` with a real `sizes`, which is the convention in this app and
 * the reason it carries no `eslint-disable` anywhere. The card renders at
 * 152–176px, so `sizes` is what stops the browser fetching the full-width
 * file for it — the saving that rule exists for.
 *
 * **All three are lazy, including the first.** It was `eager`, on the
 * reasoning that the first frame is what shows before any animation runs and
 * deferring it would leave a hole at the top of the page. That was wrong in
 * both directions. On a phone the card sits below the headline and usually
 * below the fold, so eager meant fetching an off-screen image in direct
 * competition with the hero — the one request the page's largest paint is
 * actually waiting on. On a desktop the card is in view, and a lazy image in
 * view is fetched immediately anyway, so nothing was being bought. Lazy is
 * strictly better at both widths.
 */
export function InsetCycle({ frames }: InsetCycleProps) {
  return (
    <>
      {frames.map((frame, index) => (
        <Image
          key={frame.src}
          src={frame.src}
          alt=""
          aria-hidden="true"
          fill
          loading="lazy"
          sizes="176px"
          className="inset-cycle-frame object-cover"
          style={{ '--index': index } as React.CSSProperties}
        />
      ))}
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* HeroInset                                                                   */
/* -------------------------------------------------------------------------- */

export interface HeroInsetProps {
  /**
   * One line under the frame, saying what the reader is looking at.
   *
   * Required, and not optional-with-a-default: a picture in the corner of a
   * hero with nothing to say about itself is decoration, and this card is
   * supposed to be a preview of the page's own subject.
   */
  readonly caption: React.ReactNode
  /** The frames. `InsetCycle`, or a `ReelMedia` for the one page with a loop. */
  readonly children: React.ReactNode
}

/**
 * The card: a 9:16 frame, its AI label, and a caption under it.
 *
 * The label is unconditional and sits on the frame rather than in the
 * caption. Non-negotiable 4 is a rule about every surface, and a label that
 * depended on a prop being passed would go missing the first time a page
 * forgot one — the same reasoning `page-hero.tsx` gives for its own
 * backdrop label.
 */
export function HeroInset({ caption, children }: HeroInsetProps) {
  return (
    <figure className="m-0 w-[9.5rem] sm:w-[11rem]">
      <div className="relative aspect-[9/16] overflow-hidden rounded-thumb bg-viewer shadow-lg ring-1 ring-on-ink-faint/25">
        {children}

        {/* The scrim exists for the label, not for looks: a white-on-ink badge
            over an arbitrary generated frame is not legible the way it is
            over a fixed demo colour, and some of these frames have a bright
            window in the top third. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-viewer/80 to-transparent"
        />

        <span className="absolute left-2.5 top-2.5">
          <AiLabel>AI-generated sample</AiLabel>
        </span>
      </div>

      <figcaption className="mt-2.5 text-caption text-on-ink-faint">{caption}</figcaption>
    </figure>
  )
}
