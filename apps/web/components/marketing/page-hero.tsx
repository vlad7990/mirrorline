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

import Image from 'next/image'
import * as React from 'react'

import { Section } from './primitives'

export interface PageHeroProps {
  title: React.ReactNode
  lead: React.ReactNode
  /**
   * Basename under /shots, without the theme suffix: the component asks for
   * `<name>-light.png` and `<name>-dark.png` itself.
   */
  shot: string
  /**
   * What the screenshot shows, for someone who cannot see it. Written as a
   * sentence about the product, not as "screenshot of the agents page".
   */
  shotAlt: string
  /** The line under the frame. Says it is sample data, every time. */
  shotCaption: string
  /** A CTA row, when the page has one. */
  action?: React.ReactNode
}

export function PageHero({ title, lead, shot, shotAlt, shotCaption, action }: PageHeroProps) {
  return (
    <Section size="lg">
      {/* Top-aligned, not centred: a short text column centred against a
          tall figure pushes the headline into the middle of the viewport. */}
      <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="flex flex-col gap-5 lg:col-span-7">
          <h1 className="reveal-lead m-0 text-balance font-heading text-hero text-text">{title}</h1>
          <p className="reveal m-0 max-w-[52ch] text-subtitle font-normal text-text-muted">{lead}</p>
          {action ? <div className="reveal flex flex-wrap gap-3">{action}</div> : null}
        </div>

        {/* Bleeds past the container on wide screens, so the frame reads as a
            crop of something larger rather than a card in a box. */}
        <figure className="reveal m-0 lg:col-span-5 lg:-mr-[6vw] xl:-mr-[10vw]">
          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_24px_60px_-28px_rgb(14_17_22_/_0.32)]">
            <Image
              src={`/shots/${shot}-light.png`}
              alt={shotAlt}
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
      </div>
    </Section>
  )
}
