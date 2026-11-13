/**
 * The home hero, rebuilt on the Aura "Motion 01" structure Vlad supplied
 * (`docs/design/MOTION_STUDY.md`, D34).
 *
 * What was taken from it: a full-bleed cinematic backdrop, a left-set display
 * headline over it instead of a centred stack, a numbered index along the
 * base, and vertical type on the right margin.
 *
 * What was not: its imagery, its copy, and its dense body column set over the
 * busiest part of the photograph. That column is the one part of the reference
 * that would have cost us — a landing page whose job is "are these people
 * legitimate" cannot open with fourteen lines of small text laid over a
 * picture.
 *
 * **The upload is no longer here, and that is a real change.** D22 made the
 * hero *be* the first step of the product. It now lives in its own band
 * directly below and the hero's action points at it. D34 records why, and
 * what it costs.
 *
 * The backdrop is generated, so non-negotiable 4 applies: it carries its own
 * label rather than borrowing a disclosure from further down the page. It is
 * also a room, not a result — no people, no figures, nothing that could be
 * read as a customer or an outcome.
 */

import { Button } from '@mirrorline/ui'
import { ArrowDown } from 'lucide-react'
import * as React from 'react'

import { HeroBackdrop, HeroIndex, HeroMarginNote } from './hero-parts'
import { FEATURE_TABS } from './home-content'
import { TypedPhrase } from './typed-phrase'

/** The id of the upload band below, which the hero's one action points at. */
export const UPLOAD_ANCHOR_ID = 'start'

export interface HeroCinematicProps {
  /** The cycling half of the headline. */
  readonly phrases: readonly string[]
}

export function HeroCinematic({ phrases }: HeroCinematicProps) {
  return (
    <section
      aria-labelledby="hero-heading"
      /* `overflow-clip`, not `hidden`: hidden would make this a scroll
         container and freeze every view timeline inside it, which is the trap
         D32 was written about. */
      className="band-ink relative isolate flex min-h-[86vh] flex-col justify-end overflow-clip"
    >
      <HeroBackdrop />

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-5 pb-7 pt-28 sm:px-8 sm:pt-32">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <div className="flex flex-col items-start gap-6">
            <p className="reveal-lead m-0 inline-flex items-center gap-2.5 rounded-full border border-ink-line bg-ink-800/70 px-4 py-2 backdrop-blur-sm">
              <span
                aria-hidden="true"
                className="animate-dot-pulse size-1.5 rounded-full bg-gold-bright"
              />
              <span className="site-eyebrow">
                An AI content studio for coaches and local businesses
              </span>
            </p>

            {/* Left-set, which is the reference's arrangement. Two lines by
                construction: the fixed phrase, then the cycling one on its own
                line, so the headline does not reflow on every keystroke. */}
            <h1
              id="hero-heading"
              className="reveal-lead m-0 max-w-[18ch] text-balance text-site-hero text-on-ink-900"
            >
              Turn one long video into
              <span className="block">
                <TypedPhrase phrases={phrases} className="gold-phrase" />
              </span>
            </h1>

            <p className="reveal m-0 max-w-[52ch] text-subtitle font-normal text-on-ink-muted">
              Seven agents cut your videos, remake the formats rising in your niche, and publish to
              your own accounts several times a day. You record once a week and approve from your
              phone.
            </p>

            {/* The hero's one action, and it is a pointer now rather than the
                control itself. A plain in-page anchor, so it works with
                JavaScript off and follows the document's own scroll
                behaviour. */}
            <Button asChild size="lg" variant="gold" className="press">
              <a href={`#${UPLOAD_ANCHOR_ID}`}>
                Start with your own footage
                <ArrowDown aria-hidden="true" className="size-4" strokeWidth={1.8} />
              </a>
            </Button>
          </div>

          <HeroMarginNote>one episode 52:14 · twelve cuts · three minutes</HeroMarginNote>
        </div>

        {/* Non-negotiable 4, placed above the index rather than under it.
            Measured first: below the index the hero ran 916px against a
            900px viewport, which put the label just off the bottom of the
            screen — a label for a generated image that you have to scroll to
            find is not a label. The room is generated; nothing in it is a
            customer, a result or a claim. */}
        <p className="m-0 text-right text-caption text-on-ink-faint">
          The room behind this is an AI-generated image, not a photograph of a client.
        </p>

        {/* The reference runs 01–04 with a caption each; we already have
            exactly four steps carrying exactly those fields, so nothing here
            is invented to fill the shape. */}
        <HeroIndex items={FEATURE_TABS} />
      </div>
    </section>
  )
}
