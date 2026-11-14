/**
 * The closing call to action, on every public page.
 *
 * From docs/design/handoff-v4 §"Global layout": a radial gold glow, a
 * display headline with one accent phrase, and two actions. The handoff also
 * puts a "Next" link here, carrying the reader around the site in order —
 * Home → Product → Agents → Trust → Pricing → Home.
 *
 * One component rather than the same block pasted into five files, which is
 * what the landing page, how-it-works, pricing and trust each had before.
 *
 * The offer is stated in full rather than teased: a price, a count and a
 * stopping point. "If it is not worth the next month, stop there" is the
 * part a retainer page usually leaves out, and it is what makes the rest of
 * the sentence believable.
 */

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { LeadDialogButton } from '@/app/(marketing)/components/lead-form'

import { Section } from './primitives'

export interface SiteCtaProps {
  /** Where "Next" points. Omit on a page that ends the tour. */
  readonly next?: { readonly href: string; readonly label: string }
}

export function SiteCta({ next }: SiteCtaProps) {
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
          Record once. <span className="gold-phrase">Show up everywhere.</span>
        </h2>

        <p className="m-0 max-w-[56ch] text-subtitle font-normal text-on-ink-muted">
          Start with two weeks. A <span className="machine">$750</span> pilot:{' '}
          <span className="machine">12</span> videos from your own footage, a posting schedule and
          one report. If it is not worth the next month, stop there.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <LeadDialogButton intent="pilot" variant="gold" size="lg" />
          <LeadDialogButton intent="demo" variant="secondary" size="lg" />
        </div>

        {next ? (
          <Link
            href={next.href}
            className="arrow-cta inline-flex items-center gap-2 text-label font-medium text-on-ink-muted underline-offset-4 transition-colors hover:text-gold-bright hover:underline"
          >
            Next: {next.label}
            <ArrowRight aria-hidden="true" className="size-4" strokeWidth={2} />
          </Link>
        ) : null}
      </div>
    </Section>
  )
}
