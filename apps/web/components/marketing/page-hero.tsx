/**
 * The hero every public page except the landing page uses.
 *
 * All three were the same block copied three times: a 52rem text column on
 * the left and half a viewport of nothing on the right. One component now,
 * with the same 7/5 split the landing page uses, so the pages read as one
 * site rather than three drafts.
 *
 * The right-hand column is a real screenshot of the studio. The brand
 * register calls a text-only page the failure mode, and for a product like
 * this the product itself is the photography. Each page gets the screen that
 * supports its own argument, never the same one twice.
 */

import { cn } from '@mirrorline/ui'
import Image from 'next/image'
import * as React from 'react'

import { HeroBackdrop, HeroIndex, HeroMarginNote, type HeroIndexItem } from './hero-parts'
import { Section } from './primitives'

export interface PageHeroProps {
  /** Small gold kicker above the title. The handoff gives every page one. */
  eyebrow?: string
  title: React.ReactNode
  lead: React.ReactNode
  /**
   * Basename under /shots, without the theme suffix: the component asks for
   * `<name>-light.png` and `<name>-dark.png` itself.
   *
   * **Optional, and left out on purpose where there is nothing honest to
   * show.** `/compare`, `/businesses` and `/individuals` are arguments rather
   * than product tours, and the only alternative to omitting the frame would
   * be putting an unrelated screen beside a headline it does not illustrate.
   * Without it the text column runs the full width rather than leaving a hole.
   */
  shot?: string
  /**
   * What the screenshot shows, for someone who cannot see it. Written as a
   * sentence about the product, not as "screenshot of the agents page".
   */
  shotAlt?: string
  /** The line under the frame. Says it is sample data, every time. */
  shotCaption?: string
  /** A CTA row, when the page has one. */
  action?: React.ReactNode
  /**
   * The numbered row along the hero's base — the home hero's device, carried
   * here so all five heroes speak with one voice (D37). Each page passes its
   * own real contents; nothing is invented to fill the shape.
   */
  index?: readonly HeroIndexItem[]
  /** The vertical note in the right margin. A real figure, not decoration. */
  marginNote?: React.ReactNode
}

export function PageHero({
  eyebrow,
  title,
  lead,
  shot,
  shotAlt,
  shotCaption,
  action,
  index,
  marginNote,
}: PageHeroProps) {
  return (
    // Ink, and taller than the studio's rhythm: this is the top of a page on
    // a brand surface, which the handoff gives far more air than a product
    // screen would get (D25).
    <Section
      size="lg"
      className="band-ink pt-10 sm:pt-16"
      /* `deep`, not the landing page's scrim: a sub-page puts a bright
         screenshot on top of this, and the standard wash that reads as
         atmosphere behind a headline reads as noise behind a screenshot. */
      backdrop={<HeroBackdrop strength="deep" />}
    >
      {/* Top-aligned, not centred: a short text column centred against a
          tall figure pushes the headline into the middle of the viewport. */}
      <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-12">
        <div className={cn('flex flex-col gap-5', shot ? 'lg:col-span-7' : 'lg:col-span-9')}>
          {eyebrow ? <span className="site-eyebrow reveal-lead">{eyebrow}</span> : null}
          {/* Serif, and the display size rather than the hero one: a sub-page
              title is a statement, and the landing page keeps the larger of
              the two so the hierarchy between them stays readable. */}
          <h1 className="reveal-lead m-0 text-balance text-site-h2 text-on-ink-900">{title}</h1>
          <p className="reveal m-0 max-w-[52ch] text-subtitle font-normal text-on-ink-muted">
            {lead}
          </p>
          {action ? <div className="reveal flex flex-wrap gap-3">{action}</div> : null}
        </div>

        {/* Bleeds past the container on wide screens, so the frame reads as a
            crop of something larger rather than a card in a box. */}
        {shot ? (
        <figure className="reveal m-0 lg:col-span-5 lg:-mr-[6vw] xl:-mr-[10vw]">
          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_24px_60px_-28px_rgb(14_17_22_/_0.32)]">
            <Image
              src={`/shots/${shot}-light.png`}
              alt={shotAlt ?? ''}
              width={1440}
              height={900}
              priority
              sizes="(min-width: 1024px) 42vw, 100vw"
              className="block h-auto w-full dark:hidden"
            />
            {/* The dark twin is decorative: the light one above already
                carries the description for assistive technology. */}
            <Image
              src={`/shots/${shot}-dark.png`}
              alt=""
              aria-hidden="true"
              width={1440}
              height={900}
              sizes="(min-width: 1024px) 42vw, 100vw"
              className="hidden h-auto w-full dark:block"
            />
          </div>
          <figcaption className="mt-3 text-meta text-text-muted">{shotCaption}</figcaption>
        </figure>
        ) : null}
      </div>

      {/* Non-negotiable 4. Unconditional, because the backdrop is: a label
          that depended on some other prop being passed would go missing the
          first time a page forgot one. */}
      <p className="mt-8 m-0 text-caption text-on-ink-faint">
        The room behind this is an AI-generated image, not a photograph of a client.
      </p>

      {/* In the margin, not under the content. Placed in the flow it landed
          below the screenshot in open space and read as a stray line; the
          reference runs this type down the page edge, which is also the only
          place it does not compete with anything. */}
      {marginNote ? (
        <div className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 lg:block">
          <HeroMarginNote>{marginNote}</HeroMarginNote>
        </div>
      ) : null}

      {index && index.length > 0 ? (
        <div className="mt-6">
          <HeroIndex items={index} />
        </div>
      ) : null}
    </Section>
  )
}
