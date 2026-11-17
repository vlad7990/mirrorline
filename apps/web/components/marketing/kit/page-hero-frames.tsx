/**
 * The second page hero: a wall of sample frames instead of a generated room.
 *
 * **Why there is a second one at all.** 19 §Shared rules asks every inner page
 * for a full-bleed AI image of its own, and 19 v2 §asset budget bought eight —
 * one each for the F2–F5 pages — out of 37 Higgsfield credits. Five credits
 * remain. The nine F6 pages that want a picture would cost eighteen, so the
 * choice was never "generate or not"; it was between reusing one page's room
 * on another page and finding a different picture (D69).
 *
 * Reuse is the failure `page-media.ts` already has a test against: "one
 * repeated room reads as a template rather than as a site", and a hero at this
 * size is where that reads loudest. So the backdrop here is three of the
 * twelve 9:16 sample stills, side by side, under the same two scrims.
 *
 * **It is not a consolation prize on two of these pages.** 19 §Page by page
 * asks /businesses and /individuals for a "hero with a reel collage relevant
 * to the page" in those words. For them this component is the spec rather
 * than a substitute for it.
 *
 * **The image budget still holds** (19 v2): the first frame is the page's one
 * `priority` image and the other two are lazy, so a frame wall costs the same
 * one blocking request a room does. They are small — a third of the viewport
 * wide, from files cut for a 176px card — which is why three of them weigh
 * less than the 1600×900 room they stand in for.
 */

import Image from 'next/image'
import * as React from 'react'

import type { HeroIndexItem } from '../hero-parts'
import { PageHeroShell } from './page-hero-shell'
import type { SampleFrame } from './page-media'

/** The wall is cut for three. Fewer leaves a gap; more is unreadable at 390px. */
export const HERO_WALL_FRAME_COUNT = 3

export interface PageHeroFramesProps {
  /** Small gold kicker above the title. */
  readonly eyebrow?: string
  readonly title: React.ReactNode
  readonly lead: React.ReactNode
  /**
   * The three frames behind the headline, from this page's own window of
   * `allocateFrames`. Three, because the CSS is cut for three.
   */
  readonly frames: readonly SampleFrame[]
  /** A CTA row, when the page has one. */
  readonly action?: React.ReactNode
  /** The numbered row along the hero's base (D37). */
  readonly index?: readonly HeroIndexItem[]
  /** The corner card. A `HeroInset`, or nothing on a page with no sample to show. */
  readonly inset?: React.ReactNode
}

export function PageHeroFrames({
  eyebrow,
  title,
  lead,
  frames,
  action,
  index,
  inset,
}: PageHeroFramesProps) {
  if (frames.length !== HERO_WALL_FRAME_COUNT) {
    // A build-time failure on a server component, which is what this should
    // be: a wall of two frames is a layout bug that renders fine and looks
    // like a design, so nobody reports it.
    throw new Error(
      `A frame-wall hero was given ${frames.length} frames and the wall is cut for ` +
        `${HERO_WALL_FRAME_COUNT}. Take a window of ${HERO_WALL_FRAME_COUNT} from allocateFrames.`,
    )
  }

  return (
    <PageHeroShell
      eyebrow={eyebrow}
      title={title}
      lead={lead}
      action={action}
      index={index}
      inset={inset}
      backdropLabel="The frames behind this are AI-generated samples of our own output, not a client’s videos and not footage of anyone real."
      backdrop={
        <div
          aria-hidden="true"
          /* Oversized and offset for the same reason the room is: a layer
             translated inside its own box shows its edge at the extremes of
             the travel. `.parallax-layer` only moves under
             `prefers-reduced-motion: no-preference`, so with motion off this
             is three stills sitting 12% high. */
          className="parallax-layer absolute inset-x-0 -top-[12%] flex h-[124%]"
        >
          {frames.map((frame, position) => (
            <div key={frame.src} className="relative h-full flex-1">
              <Image
                src={frame.src}
                alt=""
                fill
                /* One priority image per page (19 v2 §image budget). The
                   leftmost frame is the one under the headline, so it is the
                   one the largest paint is actually waiting on. */
                priority={position === 0}
                loading={position === 0 ? undefined : 'lazy'}
                sizes="(min-width: 640px) 34vw, 50vw"
                /* The same 60 the room is served at, and for the same reason:
                   two scrims sit on top of this, so what reaches the eye is a
                   darkened ground for white type. */
                quality={60}
                className="object-cover"
              />
            </div>
          ))}
        </div>
      }
    />
  )
}
