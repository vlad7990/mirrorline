/**
 * The closing call to action, written once per page instead of once per site.
 *
 * The words live in `page-cta-content.ts`; this is the shape they go in. The
 * reasoning for splitting them is written there, and the short version is
 * that the offer is appended here rather than repeated there — so a page can
 * differ in how it arrives at the pilot and cannot differ in what the pilot
 * is.
 */

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { LeadDialogButton } from '@/app/(marketing)/components/lead-form'

import { Section } from '../primitives'
import type { PageCtaContent } from './page-cta-content'

export type { PageCtaContent, PageCtaKey } from './page-cta-content'
export { PAGE_CTAS } from './page-cta-content'

/**
 * The offer, in the same words everywhere it appears.
 *
 * Exported because `/pricing` states the same terms beside its plan cards,
 * and two hand-written copies of a price is how two prices happen. The
 * figures are in the machine's voice: DESIGN.md puts costs and counts in mono
 * alongside timings.
 */
export function PilotTerms() {
  return (
    <>
      A <span className="machine">$750</span> pilot: <span className="machine">12</span> videos from
      your own footage, a posting schedule and one report. If it is not worth the next month, stop
      there.
    </>
  )
}

export interface PageCtaProps {
  readonly cta: PageCtaContent
}

export function PageCta({ cta }: PageCtaProps) {
  return (
    <Section className="band-ink relative overflow-hidden" aria-labelledby="cta-heading">
      {/* The handoff's radial glow. Decorative, so it is hidden from
          assistive technology and sits behind on a negative z-index. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(245,184,61,0.12)_0%,transparent_70%)]"
      />

      <div className="mx-auto flex max-w-[52rem] flex-col items-center gap-6 text-center">
        <h2 id="cta-heading" className="m-0 text-balance text-site-hero text-on-ink-900">
          {cta.title} <span className="gold-phrase">{cta.accent}</span>
        </h2>

        {/* The page's framing, then the terms. One paragraph rather than two,
            because the lead is written to run into them. */}
        <p className="m-0 max-w-[56ch] text-subtitle font-normal text-on-ink-muted">
          {cta.lead} <PilotTerms />
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          {/* 17 §1 M12: a gold light crosses the primary button as the CTA
              arrives, then rests. The band is a *sibling* of the button
              rather than a wrapper with `overflow: hidden`, because clipping
              an ancestor would crop the button's focus ring — and 17
              §Accessibility says focus states are never animated away. The
              span adds no layout of its own: `inline-flex` around a single
              child is that child's own box. */}
          <span className="relative inline-flex">
            <LeadDialogButton intent="pilot" variant="gold" size="lg" />
            <span
              aria-hidden="true"
              className="cta-sweep-band pointer-events-none absolute inset-0 overflow-hidden"
            />
          </span>
          <LeadDialogButton intent="demo" variant="secondary" size="lg" />
        </div>

        {cta.next ? (
          <Link
            href={cta.next.href}
            className="arrow-cta inline-flex items-center gap-2 text-label font-medium text-on-ink-muted underline-offset-4 transition-colors hover:text-gold-bright hover:underline"
          >
            Next: {cta.next.label}
            <ArrowRight aria-hidden="true" className="size-4" strokeWidth={2} />
          </Link>
        ) : null}
      </div>
    </Section>
  )
}
