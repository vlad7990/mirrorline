/**
 * A band containing an FAQ accordion.
 *
 * The accordion itself already existed and is not rebuilt here: `faq.tsx` is
 * a Radix `type="single" collapsible` list with the keyboard behaviour and
 * the heading/button/region wiring that come with it, and a second
 * implementation would be a second set of bugs. What was missing is the
 * section around it — the band, the numbered rail, the serif heading with one
 * gold phrase — which the home page and `/faq` each wrote out by hand.
 *
 * 19 v2 puts an FAQ on `/pricing` and `/resources`. Two more hand-written
 * copies is how four slightly different FAQ sections happen, so the band is a
 * component before the second page needs it rather than after the fourth.
 */

import * as React from 'react'

import { Faq, type FaqItem } from '../faq'
import { Section, SectionHeading } from '../primitives'

export interface FaqSectionProps {
  /** Used for the heading's id and the section's `aria-labelledby`. */
  readonly id: string
  readonly eyebrow: string
  /** The headline's first half. */
  readonly title: string
  /** The gold phrase that closes it. */
  readonly accent: string
  readonly lead?: React.ReactNode
  readonly items: readonly FaqItem[]
  /**
   * Which band this sits on.
   *
   * Defaults to `snow`, because an accordion is a reading surface and the
   * ink bands are for the cinematic sections. A page whose neighbouring
   * section is already snow passes something else rather than running two
   * identical bands together.
   */
  readonly band?: 'snow' | 'white' | 'ink-alt'
}

export function FaqSection({
  id,
  eyebrow,
  title,
  accent,
  lead,
  items,
  band = 'snow',
}: FaqSectionProps) {
  const headingId = `${id}-heading`

  return (
    <Section className={`band-${band}`} aria-labelledby={headingId}>
      <SectionHeading
        id={headingId}
        eyebrow={eyebrow}
        rail
        title={
          <>
            {title} <span className="gold-phrase">{accent}</span>
          </>
        }
        headingClassName="text-site-h2"
        lead={lead}
      />
      <div className="reveal mt-10 max-w-[64rem]">
        <Faq items={items} />
      </div>
    </Section>
  )
}
