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
import Link from 'next/link'
import * as React from 'react'

import { NICHE_SCAN } from '@/lib/site-map'

import { HeroDepth } from './hero-depth'
import { HeroBackdrop, HeroIndex, HeroMarginNote } from './hero-parts'
import { FEATURE_TABS } from './home-content'
import { SplitReveal } from './split-reveal'
import { TypedPhrase } from './typed-phrase'

/** The id of the upload band, further down, where "You send" begins. */
export const UPLOAD_ANCHOR_ID = 'start'

/**
 * The band directly below the hero, holding the Business/Individual ×
 * New/Existing picker. The hero's primary action points here rather than at
 * `/niche-scan`, which does not exist until PR6 — a hero button that 404s is
 * worse than one that scrolls.
 */
export const CHOICE_ANCHOR_ID = 'choose'

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
      <HeroDepth />

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-5 pb-7 pt-28 sm:px-8 sm:pt-32">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <div className="flex flex-col items-start gap-6">
            <p className="reveal-lead m-0 inline-flex items-center gap-2.5 rounded-full border border-ink-line bg-ink-800/70 px-4 py-2 backdrop-blur-sm">
              <span
                aria-hidden="true"
                className="animate-dot-pulse size-1.5 rounded-full bg-gold-bright"
              />
              {/* Industry-agnostic (16 §1). This read "for coaches and local
                  businesses" until D38 retired that positioning. */}
              <span className="site-eyebrow">
                Short-video growth for any business or individual
              </span>
            </p>

            {/* Left-set, which is the reference's arrangement. Two lines by
                construction: the fixed phrase, then the cycling one on its own
                line, so the headline does not reflow on every keystroke. */}
            <h1
              id="hero-heading"
              className="reveal-lead m-0 max-w-[18ch] text-balance text-site-hero text-on-ink-900"
            >
              {/* **Only the fixed half is split, and that is the design.**
                  SplitText rewrites the DOM it is given; `TypedPhrase`
                  rewrites its own text on a timer. Handed the whole headline,
                  the split would freeze the cycling line into whatever it
                  happened to say at that instant — and `aria: 'auto'` would
                  copy that half-typed string onto the element as a permanent
                  `aria-label`, so the page's one `h1` would be named after a
                  phrase no longer on screen.

                  Split the fixed line; leave the cycling one to the component
                  that owns it. */}
              <SplitReveal as="span" type="lines" className="block">
                <span className="block">Original short video,</span>
              </SplitReveal>
              <span className="block">
                <TypedPhrase phrases={phrases} className="gold-phrase" />
              </span>
            </h1>

            {/* 16 §3 row 1: the sub names *both* inputs. The old version named
                only the client's own footage, which described half the
                product and excluded every account starting from nothing. */}
            <p className="reveal m-0 max-w-[54ch] text-subtitle font-normal text-on-ink-muted">
              Send us your videos, or we create originals from the formats growing in your niche.
              Seven agents cut, check, post and prove it — several times a day, to accounts you own.
            </p>

            {/* Two actions, both links. D34 moved every interactive *control*
                out of the hero and that still holds: there is no field here,
                only somewhere to go. */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" variant="gold" className="press">
                <a href={`#${CHOICE_ANCHOR_ID}`}>
                  {NICHE_SCAN.label}
                  <ArrowDown aria-hidden="true" className="size-4" strokeWidth={1.8} />
                </a>
              </Button>
              <Button asChild size="lg" variant="secondary" className="press">
                <Link href="/pricing">See plans</Link>
              </Button>
            </div>
          </div>

          <HeroMarginNote>one episode 52:14 · twelve cuts · three minutes</HeroMarginNote>
        </div>

        {/* Non-negotiable 4, placed above the index rather than under it.
            Measured first: below the index the hero ran 916px against a
            900px viewport, which put the label just off the bottom of the
            screen — a label for a generated image that you have to scroll to
            find is not a label. The room is generated; nothing in it is a
            customer, a result or a claim. */}
        {/* Extended when the floating cuts and the inset preview arrived
            (17 §1 M1). It used to name only the room, which was true of the
            hero as it then was — a backdrop and a headline. The hero now also
            shows generated frames of a presenter who does not exist, and a
            disclosure that covers the wallpaper but not the faces is the gap
            non-negotiable 4 exists to close. The preview carries its own "AI
            scene" and "Sample" labels as well; this is the sentence for the
            decorative cards, which are hidden from assistive technology and
            so cannot carry one. */}
        {/* The right padding keeps it out of the inset preview's column. The
            inset is positioned and this is in flow, so it paints over this
            sentence — and the label ran underneath the card it was labelling,
            which is the same failure as not having one. Measured at 1440: the
            inset is 190px wide with a 3rem gutter. */}
        <p className="m-0 text-right text-caption text-on-ink-faint lg:pr-[240px]">
          The room and every cut shown here are AI-generated sample frames, not photographs of a
          client or a customer result.
        </p>

        {/* The reference runs 01–04 with a caption each; we already have
            exactly four steps carrying exactly those fields, so nothing here
            is invented to fill the shape. */}
        <HeroIndex items={FEATURE_TABS} />
      </div>
    </section>
  )
}
