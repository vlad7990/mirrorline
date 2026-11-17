/**
 * The inner-page hero: one full-bleed generated image, the headline on it,
 * and a preview card in the corner.
 *
 * 19 §Shared rules calls this the Aura-style page hero — "full-bleed AI image
 * with depth parallax, editorial headline, and an inset preview card
 * bottom-right". It replaces `page-hero.tsx` on the pages F2–F5 rebuild, and
 * the difference between the two is worth stating because it reverses an
 * argument the older file makes.
 *
 * `hero-parts.tsx` says a hero backdrop is "a *room*, not an illustration of
 * a topic", and uses one studio shot everywhere. That was right while the
 * backdrop sat far behind a bright screenshot at a deep scrim — the image was
 * atmosphere, and five of them would have been five things to label for no
 * gain. Here the image *is* the hero: the headline sits directly on it at
 * near-full strength. At that size one repeated room reads as a template
 * rather than as a site, so each page gets its own (19 v2 §asset budget).
 *
 * **The vertical margin note does not come with it.** 19 says "remove
 * vertical labels that sit over images", and `HeroMarginNote` is exactly that
 * — rotated type in the right margin, which on a full-bleed image is no
 * longer a margin. D44 already removed the version drawn over the screenshot
 * on six pages; this finishes the job rather than finding somewhere new to
 * put it.
 *
 * **Only the backdrop lives here now.** F6 added a second hero variant, and
 * everything either of them draws above the picture — the scrims, the
 * headline grid, the inset's corner, the numbered index and the AI label —
 * moved to `PageHeroShell`.
 */

import Image from 'next/image'
import * as React from 'react'

import type { HeroIndexItem } from '../hero-parts'
import { PageHeroShell } from './page-hero-shell'
import type { PageHeroImage as PageHeroImageAsset } from './page-media'

export interface PageHeroImageProps {
  /** Small gold kicker above the title. */
  readonly eyebrow?: string
  readonly title: React.ReactNode
  readonly lead: React.ReactNode
  /** The page's own generated image, from `PAGE_HERO_IMAGES`. */
  readonly image: PageHeroImageAsset
  /** A CTA row, when the page has one. */
  readonly action?: React.ReactNode
  /**
   * The numbered row along the hero's base — the home hero's device (D37).
   * Each page passes its own real contents; nothing is invented to fill it.
   */
  readonly index?: readonly HeroIndexItem[]
  /** The corner card. A `HeroInset`, or nothing on a page with no sample to show. */
  readonly inset?: React.ReactNode
}

export function PageHeroImage({
  eyebrow,
  title,
  lead,
  image,
  action,
  index,
  inset,
}: PageHeroImageProps) {
  return (
    <PageHeroShell
      eyebrow={eyebrow}
      title={title}
      lead={lead}
      action={action}
      index={index}
      inset={inset}
      backdropLabel="The room behind this is an AI-generated image, not a photograph of a client or an office of ours."
      backdrop={
        <>
          {/* Oversized, then moved within that slack. A layer translated
              inside its own box shows its edge at the extremes of the travel
              — the trap `reel-backdrop.tsx` documents, and the reason this is
              124% tall rather than 100%. `.parallax-layer` lives inside
              `prefers-reduced-motion: no-preference`, so with motion off this
              is simply a still image sitting 12% high, which is why the
              overscan is vertical and symmetric. */}
          <div className="parallax-layer absolute inset-x-0 -top-[12%] h-[124%]">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority
              /* The one `priority` image on the page (19 v2 §image budget).
                 It is the LCP element on every page that uses this, and two
                 priority images is two images racing for the same slot. */
              sizes="100vw"
              /* Below the default 75, and the scrims are why it is safe.
                 Two of them sit on top of this image — a left-to-right ink
                 wash and a bottom-up fade — so what reaches the eye is a
                 darkened, low-contrast ground for white type, which is the
                 least demanding thing a photograph can be asked to do.

                 It is also the measurement that moved: this is the LCP
                 element on every page using this component, and on a
                 throttled mobile connection it queues behind ~184 KB of
                 webfonts. Fewer bytes in the one request the page is waiting
                 on is worth more here than detail nobody can see through a
                 scrim. */
              quality={60}
              className="object-cover"
            />
          </div>
        </>
      }
    />
  )
}
