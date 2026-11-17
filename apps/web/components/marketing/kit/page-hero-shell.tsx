/**
 * Everything a page hero is except the picture behind it.
 *
 * `page-hero-image.tsx` was the whole hero in one file while there was only
 * one kind: a generated room, full-bleed, with the headline on it. F6 needs a
 * second kind — a wall of sample frames, for the eleven pages that have no
 * room of their own and no credits left to generate one (19 v3, D69) — and the
 * two kinds differ in exactly one thing: what sits in the backdrop.
 *
 * So the backdrop is the prop and the rest is here. The scrims, the headline
 * grid, the inset's corner, the numbered index and the AI label are shared,
 * which matters most for the label: non-negotiable 4 is a rule about every
 * surface, and a second hero variant that rendered its own copy of the label
 * would be a second place for it to go missing.
 */

import { cn } from '@mirrorline/ui'
import * as React from 'react'

import { HeroIndex, type HeroIndexItem } from '../hero-parts'
import { Section } from '../primitives'

export interface PageHeroShellProps {
  /** Small gold kicker above the title. */
  readonly eyebrow?: string
  readonly title: React.ReactNode
  readonly lead: React.ReactNode
  /** A CTA row, when the page has one. */
  readonly action?: React.ReactNode
  /**
   * The numbered row along the hero's base — the home hero's device (D37).
   * Each page passes its own real contents; nothing is invented to fill it.
   */
  readonly index?: readonly HeroIndexItem[]
  /** The corner card. A `HeroInset`, or nothing on a page with no sample to show. */
  readonly inset?: React.ReactNode
  /** The images, already positioned. Rendered behind both scrims. */
  readonly backdrop: React.ReactNode
  /**
   * What the label under the hero says the backdrop is.
   *
   * Required rather than defaulted, because the two variants are honest about
   * different things: a room is "not a photograph of a client", a wall of
   * frames is "sample output, not a client's". A default would have put the
   * first sentence under the second picture.
   */
  readonly backdropLabel: string
}

export function PageHeroShell({
  eyebrow,
  title,
  lead,
  action,
  index,
  inset,
  backdrop,
  backdropLabel,
}: PageHeroShellProps) {
  return (
    <Section
      size="lg"
      className="band-ink pt-10 sm:pt-16"
      backdrop={
        <div className="absolute inset-0 -z-10">
          {backdrop}

          {/* Two scrims, doing two different jobs.

              Left-to-right first, so the text column sits on near-black
              whatever the picture is doing behind it — the device
              `hero-parts.tsx` uses, kept because it is what holds the
              headline's contrast on unlike photographs rather than on one
              known one.

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
      <p className="m-0 mt-8 text-caption text-on-ink-faint">{backdropLabel}</p>
    </Section>
  )
}
