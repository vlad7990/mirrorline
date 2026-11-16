/**
 * /pricing — the five plans, what a month on each looks like, and the
 * questions a price list usually leaves out.
 *
 * Rebuilt for 19_INNER_PAGES v2 (D51). The figures are unchanged: they come
 * from `pricing-tiers.ts`, which transcribes 09 §11, and nothing on this page
 * types a price of its own. docs/design/STITCH_REVIEW.md item 5 still rules
 * out Stitch's $650 / $3,200 and its "Save 20%" annual toggle.
 *
 * **The row list became a card grid, and that overturns a comment the old
 * page made.** It argued a price list reads down, because the mono figures
 * line up against each other. True of four rows; it stopped being true at
 * five, where the list ran most of a screen and the comparison it was
 * protecting had scrolled apart anyway. 19 v2 ★2 asks for cards, and three
 * columns put all five plans where they can actually be compared.
 *
 * **No long-form YouTube add-on card.** 19's own table asks for one and v2
 * removes it: PR D owns that work and the platform audit it depends on has
 * not started. A card for it would be an invented product.
 */

import { Check } from 'lucide-react'
import type { Metadata } from 'next'

import { FaqSection } from '@/components/marketing/kit/faq-section'
import { HeroInset, InsetCycle } from '@/components/marketing/kit/hero-inset'
import { PAGE_CTAS, PageCta } from '@/components/marketing/kit/page-cta'
import { PageHeroImage } from '@/components/marketing/kit/page-hero-image'
import { PAGE_HERO_IMAGES, allocateFrames } from '@/components/marketing/kit/page-media'
import { PlanPicker, type PlanAction } from '@/components/marketing/plan-picker'
import { BillingPromises, CostComparison } from '@/components/marketing/pricing-sections'
import { PRICING_FAQ } from '@/components/marketing/pricing-faq-content'
import { PRICING_NOTE, PRICING_TIERS } from '@/components/marketing/pricing-tiers'
import { Section, SectionHeading } from '@/components/marketing/primitives'
import { actionCopy, checkoutMode } from '@/lib/billing/checkout'

/**
 * Resolved once, on the server. Never `test` unless a `sk_test_` key is in
 * the environment, which nothing in this repo sets — so the buttons say what
 * will happen rather than implying a charge.
 */
const CHECKOUT_MODE = checkoutMode()

/**
 * The per-plan button copy, resolved here and handed to the client component.
 *
 * `checkoutMode()` reads the environment and a client component may not, so
 * the decision is made where the secret lives and only its answer crosses the
 * boundary.
 */
const PLAN_ACTIONS: Record<string, PlanAction> = Object.fromEntries(
  PRICING_TIERS.map((tier) => {
    const copy = actionCopy(tier.id, CHECKOUT_MODE)
    return [tier.id, { label: copy.label, note: copy.note }]
  }),
)

/** Offset 8 so this page does not open on a frame /product or /how-it-works used. */
const [INSET_FRAMES = []] = allocateFrames([3], 8)

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
      <PageHeroImage
        eyebrow="Pricing"
        title={
          <>
            One flat price, <span className="gold-phrase">a month at a time.</span>
          </>
        }
        lead="Start with a two-week pilot. If it is worth continuing, pick a month. No setup fee, no annual contract and no discount for paying a year ahead."
        image={PAGE_HERO_IMAGES.pricing}
        index={PRICING_TIERS.map((tier, position) => ({
          number: String(position + 1).padStart(2, '0'),
          title: tier.name,
        }))}
        inset={
          <HeroInset caption="A week of posts, on three unlike accounts.">
            <InsetCycle frames={INSET_FRAMES} />
          </HeroInset>
        }
      />

      {/* The plans -------------------------------------------------------- */}
      <Section className="band-snow" aria-labelledby="tiers-heading">
        <SectionHeading
          id="tiers-heading"
          eyebrow="The plans"
          rail
          title={
            <>
              Five plans, <span className="gold-phrase">and what each one posts.</span>
            </>
          }
          headingClassName="text-site-h2"
          lead="Pick one to see the month it buys. The calendar is drawn from the plan's own post count, not from an example we chose."
        />
        <div className="mt-10">
          <PlanPicker tiers={PRICING_TIERS} actions={PLAN_ACTIONS} />
        </div>

        <p className="mb-0 mt-8 max-w-[68ch] text-meta text-text-muted">{PRICING_NOTE}</p>
      </Section>

      {/* What the same job costs elsewhere, and what billing will not do --- */}
      <CostComparison />
      <BillingPromises />

      {/* What never changes ----------------------------------------------- */}
      <Section className="band-ink-alt" aria-labelledby="included-heading">
        <SectionHeading
          id="included-heading"
          eyebrow="Every tier"
          rail
          title={
            <>
              The limits do not change <span className="gold-phrase">with the price.</span>
            </>
          }
          headingClassName="text-site-h2"
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

      <FaqSection
        id="pricing-faq"
        eyebrow="Before you ask"
        title="The questions"
        accent="a price list usually skips."
        lead="Including the one about whether you should be buying this at all."
        items={PRICING_FAQ}
        band="white"
      />

      <PageCta cta={PAGE_CTAS.pricing} />
    </>
  )
}
