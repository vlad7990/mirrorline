/**
 * The four tiers, transcribed from docs/plan/30_DAY_PLAN.md "Offer and test
 * prices" (the same table appears in docs/specs/01_PRODUCT_BRIEF.md).
 *
 * One source for the landing-page teaser and the pricing page, so the two can
 * never drift. docs/design/STITCH_REVIEW.md item 5 rules out Stitch's figures
 * ($650 / $3,200) and its "Save 20%" annual toggle: there is no annual price.
 */

export interface PricingTier {
  readonly id: string
  readonly name: string
  /** The price exactly as the plan writes it. */
  readonly price: string
  /** What the price buys, e.g. "for 2 weeks" or "a month". */
  readonly period: string
  /** One line on who the tier is for. */
  readonly summary: string
  readonly includes: readonly string[]
  /** Growth is the suggested tier. */
  readonly isSuggested: boolean
  /** Studio is not built yet, so it carries a label and no action. */
  readonly comingLaterLabel: string | null
}

export const PRICING_TIERS: readonly PricingTier[] = [
  {
    id: 'pilot',
    name: 'Pilot',
    price: '$750',
    period: 'for 2 weeks',
    summary: 'A short, paid trial. You see real videos before you commit to a month.',
    includes: ['12 videos', 'Scheduling', 'One report'],
    isSuggested: false,
    comingLaterLabel: null,
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '$1,500',
    period: 'a month',
    summary: 'Daily posting on three platforms, with two remakes a week.',
    includes: [
      '90 posts a month (3 a day)',
      '2 viral remakes a week',
      '3 platforms',
      'Weekly report',
    ],
    isSuggested: true,
    comingLaterLabel: null,
  },
  {
    id: 'scale',
    name: 'Scale',
    price: '$3,000',
    period: 'a month',
    summary: 'Twice the volume, daily remakes and a monthly call on what to do next.',
    includes: [
      '180 posts a month (6 a day)',
      'Daily viral remakes',
      'AI product scenes',
      'A/B hooks',
      'Monthly strategy call',
    ],
    isSuggested: false,
    comingLaterLabel: null,
  },
  {
    id: 'studio',
    name: 'Studio (self-serve)',
    price: '$49–$149',
    period: 'a month',
    summary: 'The same engine, run by you. Not built yet, so there is nothing to buy.',
    includes: ['Same engine', 'You approve each post'],
    isSuggested: false,
    comingLaterLabel: 'Coming later',
  },
]

/** The three tiers we actually sell today. */
export const SELLABLE_TIERS: readonly PricingTier[] = PRICING_TIERS.filter(
  (tier) => tier.comingLaterLabel === null,
)

/**
 * 30_DAY_PLAN.md calls these "test prices" and its figures "planning
 * estimates, not results", so the page says so rather than implying a rate card.
 */
export const PRICING_NOTE =
  'These are introductory prices while we work with our first clients. We set the final price per engagement, in writing, before any work starts.'
