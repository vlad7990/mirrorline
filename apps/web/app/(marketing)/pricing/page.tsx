/**
 * /pricing — the four tiers, exactly as docs/plan/30_DAY_PLAN.md writes them.
 *
 * docs/design/STITCH_REVIEW.md item 5: Stitch's $650 / $3,200 figures and its
 * "Save 20%" annual toggle do not ship. There is one price per tier, no annual
 * discount, and no comparison column against anybody else.
 */

import { cn } from '@mirrorline/ui'
import { Check } from 'lucide-react'
import type { Metadata } from 'next'

import { PageHero } from '@/components/marketing/page-hero'
import { ComingSoonLabel, Section, SectionHeading } from '@/components/marketing/primitives'
import { SiteCta } from '@/components/marketing/site-cta'
import { PRICING_NOTE, PRICING_TIERS, perDayUsd } from '@/components/marketing/pricing-tiers'
import { actionCopy, checkoutMode } from '@/lib/billing/checkout'

/**
 * Resolved once, on the server. Never `test` unless a `sk_test_` key is in
 * the environment, which nothing in this repo sets — so the buttons say what
 * will happen rather than implying a charge.
 */
const CHECKOUT_MODE = checkoutMode()

import { LeadDialogButton } from '../components/lead-form'

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Pilot $750 for two weeks, Growth $1,500 a month, Scale $3,000 a month. Self-serve Studio is coming later. Introductory prices, set per engagement.',
}

/** True of every tier, so it is said once rather than repeated in each card. */
const ALWAYS_INCLUDED: readonly string[] = [
  'Your own footage, and nothing else',
  'Every video through the compliance gate before it can be scheduled',
  'AI scenes labelled, in the studio and on the platform',
  'Posting through the official platform APIs, to accounts you connect and can disconnect',
  'You can approve every post, or turn auto-approve on yourself',
  'Your numbers reported as they are, including the bad weeks',
]

export default function PricingPage() {
  return (
    <>
      <PageHero
        title="One flat price a month"
        lead="Start with a two-week pilot. If it is worth continuing, pick a month. No setup fee, no annual contract and no discount for paying a year ahead."
        shot="results-16x10"
        shotAlt="The results screen: views, link clicks and calls booked for the week, with the posts that earned them."
        shotCaption="The weekly report you get, on sample data from a fictional demo client."
        index={PRICING_TIERS.map((tier, position) => ({
          number: String(position + 1).padStart(2, '0'),
          title: tier.name,
        }))}
        marginNote="introductory prices · set per engagement, in writing"
      />

      <Section className="band-snow" size="md" aria-labelledby="tiers-heading">
        <h2 id="tiers-heading" className="sr-only">
          Tiers
        </h2>
        {/* One bordered band, one row per tier, not four equal columns. A price
            list reads down: the mono figures line up against each other, which
            is the whole point of comparing them. DESIGN.md "Typography": a
            price is a figure, so it is set in the machine's voice. */}
        <ul className="flex list-none flex-col divide-y divide-border rounded-lg border border-border bg-surface p-0">
          {PRICING_TIERS.map((tier) => {
            const isComingLater = tier.comingLaterLabel !== null
            const perDay = perDayUsd(tier)

            return (
              <li
                key={tier.id}
                className={cn(
                  'grid gap-4 p-5 sm:p-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_minmax(0,13rem)] lg:items-start lg:gap-8',
                  // Gold, not the studio's coral tint. The band remap (D25)
                  // made this page's text light, and light text on a pale
                  // coral wash is a serious contrast failure — axe caught it.
                  tier.isSuggested ? 'bg-gold/10' : null,
                )}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="m-0 font-heading text-title text-text">{tier.name}</h3>
                    {tier.isSuggested ? (
                      <span className="rounded-full bg-gold-gradient px-3 py-1 text-caption font-semibold text-ink-900">
                        Suggested
                      </span>
                    ) : null}
                    {isComingLater ? (
                      <ComingSoonLabel>{tier.comingLaterLabel}</ComingSoonLabel>
                    ) : null}
                  </div>
                  {/* repurpose.io leads with the daily figure and puts the
                      billed amount underneath
                      (docs/design/COMPETITOR_REFERENCES.md §2.5). On a
                      retainer that is the more useful number: $1,500 a month
                      is a decision, $50 a day is a comparison with the hour
                      of editing it replaces. Derived, never typed — see
                      `perDayUsd`. */}
                  {perDay === null ? (
                    <p className="m-0 flex flex-wrap items-baseline gap-x-2">
                      <span className="machine text-metric font-semibold text-text">
                        {tier.price}
                      </span>
                      <span className="text-meta text-text-muted">{tier.period}</span>
                    </p>
                  ) : (
                    <p className="m-0 flex flex-col gap-0.5">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="machine text-metric font-semibold text-text">
                          ${perDay}
                        </span>
                        <span className="text-meta text-text-muted">a day</span>
                      </span>
                      <span className="text-meta text-text-muted">
                        <span className="machine">{tier.price}</span> {tier.period}
                      </span>
                    </p>
                  )}
                </div>

                <div className="flex min-w-0 flex-col gap-3">
                  <p className="m-0 max-w-[62ch] text-body text-text-muted">{tier.summary}</p>
                  {/* "Best for" per plan, which 09 §11 requires. It names an
                      account type, never a trade — a test asserts that. */}
                  <p className="m-0 max-w-[62ch] text-meta text-gold-text">
                    Best for: {tier.bestFor}
                  </p>
                  <ul className="m-0 flex list-none flex-col gap-2 p-0 sm:flex-row sm:flex-wrap sm:gap-x-5">
                    {tier.includes.map((line) => (
                      <li key={line} className="flex items-start gap-2 text-meta text-text">
                        <span className="mt-0.5 text-on-success-soft">
                          <Check aria-hidden="true" className="size-4" strokeWidth={2.2} />
                        </span>
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* One action per plan, from the checkout adapter: Pilot and
                    Creator can be bought, Growth and Scale are set up on a
                    call, Studio takes a waitlist and nothing else. Stripe is
                    not configured here, so the note under the button says so
                    rather than the button pretending to take money. */}
                <div className="flex flex-col gap-2 lg:items-stretch">
                  <LeadDialogButton
                    intent={tier.id === 'pilot' || tier.id === 'creator' ? 'pilot' : 'demo'}
                    // Gold, not the studio's coral primary: this is the
                    // public site, and one gold action per row is what
                    // marks the suggested tier (D25).
                    variant={tier.isSuggested ? 'gold' : 'secondary'}
                    size="lg"
                    fullWidth
                  >
                    {actionCopy(tier.id, CHECKOUT_MODE).label}
                  </LeadDialogButton>
                  <p className="m-0 text-caption text-text-muted">
                    {actionCopy(tier.id, CHECKOUT_MODE).note}
                  </p>
                  {isComingLater ? (
                    <p className="m-0 text-caption text-text-muted">
                      Opens in month 2. Nothing is charged for joining.
                    </p>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>

        <p className="mt-6 mb-0 max-w-[68ch] text-meta text-text-muted">{PRICING_NOTE}</p>
      </Section>

      <Section className="band-ink-alt" aria-labelledby="included-heading">
        <SectionHeading
          headingClassName="text-site-h2 font-serif"
          id="included-heading"
          eyebrow="Every tier"
          title="The limits do not change with the price"
          lead={
            <>
              These are not add-ons, and they are not a premium plan. They are how the studio is
              built, so they are in the <span className="machine">$750</span> pilot on the same
              terms as the <span className="machine">$3,000</span> month.
            </>
          }
        />
        <ul className="mt-8 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2">
          {ALWAYS_INCLUDED.map((line) => (
            <li key={line} className="flex items-start gap-2.5 text-body text-text-muted">
              <span className="mt-1 text-on-success-soft">
                <Check aria-hidden="true" className="size-[18px]" strokeWidth={2.2} />
              </span>
              {line}
            </li>
          ))}
        </ul>
      </Section>

      <SiteCta next={{ href: '/', label: 'Home' }} />
    </>
  )
}
