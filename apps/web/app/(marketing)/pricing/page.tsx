/**
 * /pricing — the four tiers, exactly as docs/plan/30_DAY_PLAN.md writes them.
 *
 * docs/design/STITCH_REVIEW.md item 5: Stitch's $650 / $3,200 figures and its
 * "Save 20%" annual toggle do not ship. There is one price per tier, no annual
 * discount, and no comparison column against anybody else.
 */

import { Card } from '@mirrorline/ui'
import { Check } from 'lucide-react'
import type { Metadata } from 'next'

import { ComingSoonLabel, Section, SectionHeading } from '@/components/marketing/primitives'
import { PRICING_NOTE, PRICING_TIERS } from '@/components/marketing/pricing-tiers'

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
      <Section size="lg">
        <div className="flex max-w-[52rem] flex-col gap-5">
          <span className="eyebrow">Pricing</span>
          <h1 className="m-0 font-heading text-headline text-text sm:text-display">
            One flat price a month
          </h1>
          <p className="m-0 max-w-[62ch] text-body text-text-muted">
            Start with a two-week pilot. If it is worth continuing, pick a month. No setup fee, no
            annual contract and no discount for paying a year ahead — we would rather you could
            leave whenever you like.
          </p>
        </div>
      </Section>

      <Section tone="subtle" size="md" aria-labelledby="tiers-heading">
        <h2 id="tiers-heading" className="sr-only">
          Tiers
        </h2>
        <ul className="grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 xl:grid-cols-4">
          {PRICING_TIERS.map((tier) => {
            const isComingLater = tier.comingLaterLabel !== null

            return (
              <Card
                as="li"
                key={tier.id}
                padding="lg"
                selected={tier.isSuggested}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="m-0 font-heading text-title text-text">{tier.name}</h3>
                  {tier.isSuggested ? (
                    <span className="rounded-full bg-accent-soft px-3 py-1 text-caption font-semibold text-on-accent-soft">
                      Suggested
                    </span>
                  ) : null}
                  {isComingLater ? (
                    <ComingSoonLabel>{tier.comingLaterLabel}</ComingSoonLabel>
                  ) : null}
                </div>

                <p className="m-0">
                  <span className="tabular font-heading text-headline text-text">{tier.price}</span>{' '}
                  <span className="text-meta text-text-muted">{tier.period}</span>
                </p>

                <p className="m-0 text-meta text-text-muted">{tier.summary}</p>

                <ul className="m-0 flex flex-1 list-none flex-col gap-2 p-0">
                  {tier.includes.map((line) => (
                    <li key={line} className="flex items-start gap-2 text-meta text-text">
                      <span className="mt-0.5 text-on-success-soft">
                        <Check aria-hidden="true" className="size-4" strokeWidth={2.2} />
                      </span>
                      {line}
                    </li>
                  ))}
                </ul>

                {isComingLater ? (
                  <p className="m-0 text-meta text-text-muted">
                    Not built yet, so there is nothing to buy and no waiting list to join.
                  </p>
                ) : (
                  <LeadDialogButton
                    intent={tier.id === 'pilot' ? 'pilot' : 'demo'}
                    variant={tier.isSuggested ? 'primary' : 'secondary'}
                    size="lg"
                    fullWidth
                  >
                    {tier.id === 'pilot' ? 'Start a pilot' : `Talk about ${tier.name}`}
                  </LeadDialogButton>
                )}
              </Card>
            )
          })}
        </ul>

        <p className="mt-6 mb-0 max-w-[68ch] text-meta text-text-muted">{PRICING_NOTE}</p>
      </Section>

      <Section aria-labelledby="included-heading">
        <SectionHeading
          id="included-heading"
          eyebrow="Every tier"
          title="What you get at any price"
          lead="These are not add-ons. They are how the studio works, so they are in the pilot too."
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

      <Section tone="subtle" size="md" aria-labelledby="pricing-cta-heading">
        <Card tone="ink" padding="lg" className="flex flex-col gap-5">
          <div className="flex max-w-[52ch] flex-col gap-3">
            <h2 id="pricing-cta-heading" className="m-0 font-heading text-headline text-on-ink">
              Not sure which one fits
            </h2>
            <p className="m-0 text-body text-on-ink">
              Tell us how much video you already have and how often you want to post. We will say
              which tier makes sense, including when the answer is none of them yet.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <LeadDialogButton intent="demo" />
            <LeadDialogButton intent="pilot" variant="secondary" size="lg" />
          </div>
        </Card>
      </Section>
    </>
  )
}
