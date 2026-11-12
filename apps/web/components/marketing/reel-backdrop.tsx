/**
 * A drifting wall of frames behind a band — the "images behind a scrolling
 * section" device from `docs/design/MOTION_STUDY.md` §3.
 *
 * Arigo does this with GSAP ScrollTrigger. We cannot use GSAP (its licence is
 * not on non-negotiable 10's allowlist), so the layer rides a view timeline
 * instead: pure CSS, run off the main thread, and absent entirely under
 * `prefers-reduced-motion`, because `.parallax-layer` lives inside that query.
 *
 * **Where this may be used is a constraint, not a matter of taste.** Every
 * frame here is AI-generated, and non-negotiable 4 says generated material is
 * always labelled. So it belongs only in a section that already carries that
 * disclosure — today that is the proof band on the home page, which says in
 * plain words that the presenter is not a real person. Putting it behind a
 * band with no label would be exactly the quiet dishonesty D28 set out to
 * avoid.
 *
 * It is decorative: `aria-hidden`, empty alt, and it only repeats imagery the
 * reader is about to see properly a few hundred pixels further down.
 */

import Image from 'next/image'
import * as React from 'react'

import { REEL_MANIFEST } from './reel-assets'

/**
 * Enough to fill a wide band without becoming a second cut wall.
 *
 * Taken from the front of the manifest rather than sampled, so the backdrop
 * is deterministic — `Math.random()` here would differ between the server
 * render and the client and trip hydration, the same trap as D29's stagger.
 */
const BACKDROP_FRAMES = 8

export function ReelBackdrop() {
  const frames = Object.values(REEL_MANIFEST).slice(0, BACKDROP_FRAMES)
  if (frames.length === 0) return null

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      {/* Oversized first, then moved within that slack: a layer translated
          inside its own box shows its edge at the extremes of the travel. */}
      <div className="parallax-layer absolute inset-x-0 -top-[12%] h-[124%]">
        <div className="flex h-full items-center justify-center gap-4 px-4">
          {frames.map((frame) => (
            /* `next/image` rather than a bare tag, which is the convention
               here (`page-hero.tsx`) and the reason apps/web has no
               eslint-disable anywhere. A backdrop frame renders at ~18% of
               the band, so `sizes` is what stops the browser fetching the
               full 640px file for a sliver — the saving this rule exists
               for. The source is already WebP, so there is nothing to
               re-encode, only to resize. */
            <Image
              key={frame.posterSrc}
              src={frame.posterSrc}
              alt=""
              width={640}
              height={1138}
              loading="lazy"
              sizes="(min-width: 1024px) 18vw, 30vw"
              className="h-full w-[18%] shrink-0 rounded-thumb object-cover"
            />
          ))}
        </div>
      </div>

      {/* The scrim is not styling, it is what keeps the band legible. The
          frames under it are arbitrary photography and the section's heading
          and body sit on top at contrasts the tests pin. Flat cover first,
          then a vertical fade so the band still joins the ones above and
          below instead of appearing as a pasted-in panel. */}
      <div className="absolute inset-0 bg-background/80" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
    </div>
  )
}
