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
 */

import { cn } from '@mirrorline/ui'
import Image from 'next/image'
import * as React from 'react'

import { HeroIndex, type HeroIndexItem } from '../hero-parts'
import { Section } from '../primitives'
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
    <Section
      size="lg"
      className="band-ink pt-10 sm:pt-16"
      backdrop={
        <div className="absolute inset-0 -z-10">
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
              className="object-cover"
            />
          </div>

          {/* Two scrims, doing two different jobs.

              Left-to-right first, so the text column sits on near-black
              whatever the picture is doing behind it — the device
              `hero-parts.tsx` uses, kept because it is what holds the
              headline's contrast on eight unlike photographs rather than on
              one known one.

              Then bottom-up, because the numbered index and the inset card
              sit along the base and several of these images are brightest
              exactly there. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/45"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent"
          />
        </div>
      }
    >
      <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-12">
        <div className={cn('flex flex-col gap-5', inset ? 'lg:col-span-8' : 'lg:col-span-9')}>
          {eyebrow ? <span className="site-eyebrow reveal-lead">{eyebrow}</span> : null}
          <h1 className="reveal-lead m-0 text-balance text-site-h2 text-on-ink-900">{title}</h1>
          <p className="reveal m-0 max-w-[52ch] text-subtitle font-normal text-on-ink-muted">
            {lead}
          </p>
          {action ? <div className="reveal mt-2 flex flex-wrap gap-3">{action}</div> : null}
        </div>

        {/* Bottom-right, as the spec asks, but only where there is a right
            margin to be in: below `lg` it follows the text in the flow rather
            than floating over a headline on a 390px screen. */}
        {inset ? (
          <div className="reveal flex justify-start lg:col-span-4 lg:justify-end lg:self-end">
            {inset}
          </div>
        ) : null}
      </div>

      {index ? (
        <div className="mt-12">
          <HeroIndex items={index} />
        </div>
      ) : null}

      {/* Non-negotiable 4, and unconditional for the same reason the backdrop
          is: a label that depended on some other prop being passed would go
          missing the first time a page forgot one. */}
      <p className="m-0 mt-8 text-caption text-on-ink-faint">
        The room behind this is an AI-generated image, not a photograph of a client or an office of
        ours.
      </p>
    </Section>
  )
}
