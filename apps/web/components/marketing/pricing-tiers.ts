/**
 * The five plans, transcribed from `docs/specs/09_SERVICES.md` §11, which is
 * the one place a price is written down (D38).
 *
 * One source for the landing-page teaser and the pricing page, so the two can
 * never drift. docs/design/STITCH_REVIEW.md item 5 rules out Stitch's figures
 * ($650 / $3,200) and its "Save 20%" annual toggle: there is no annual price.
 *
 * **Changed in v4:** Creator ($499) did not exist at all, and Studio was
 * "$49 to $149" with no date. Those came from `01_PRODUCT_BRIEF.md`, which is
 * superseded on price. Studio is $79 now and, more importantly, a *waitlist*
 * rather than something that can be bought — 09 §11 is explicit that nothing
 * on the site may imply otherwise.
 */

export interface PricingTier {
  readonly id: string
  readonly name: string
  /** The price exactly as 09 §11 writes it. */
  readonly price: string
  /**
   * The same figure as a number, for the per-day line. `null` where there is
   * no single figure to divide. A test asserts the two never disagree.
   */
  readonly priceUsd: number | null
  /** How many days `price` covers. The denominator for the per-day line. */
  readonly days: number
  /** What the price buys, e.g. "for 2 weeks" or "a month". */
  readonly period: string
  /** One line on what the tier does. */
  readonly summary: string
  /**
   * Who it suits, from 13 §1 — an **account type**, never an industry.
   * 09 §11 requires a "best for" on every plan, and a test asserts no trade
   * is named in one.
   */
  readonly bestFor: string
  readonly includes: readonly string[]
  /**
   * How many posts the tier delivers across its `days`, for the month
   * preview on /pricing (19 v2 ★3).
   *
   * A typed number beside the prose rather than a number parsed out of it.
   * The volume is already written in `includes` — "90 posts a month (3 a
   * day)" — and reading it back out with a regular expression would make a
   * sentence load-bearing: rephrasing the line would silently change the
   * calendar. This is the same arrangement `priceUsd` has with `price`, and
   * it carries the same guarantee: **a test asserts the two never disagree.**
   *
   * `null` where there is no volume to draw. Studio is a waitlist, and
   * drawing a month of posts for a plan nobody can buy would be a picture of
   * something that does not happen.
   */
  readonly postsInPeriod: number | null
  /** Growth is the suggested tier. */
  readonly isSuggested: boolean
  /**
   * Set where a plan cannot be bought today. Studio takes a waitlist, and
   * this label is what the page shows instead of a buy action.
   */
  readonly comingLaterLabel: string | null
}

export const PRICING_TIERS: readonly PricingTier[] = [
  {
    id: 'pilot',
    name: 'Pilot',
    price: '$750',
    priceUsd: 750,
    days: 14,
    period: 'for 2 weeks',
    summary: 'A short, paid trial. You see real videos before you commit to a month.',
    bestFor: 'A business trying us out, on a new or an existing account.',
    includes: ['12 videos', 'The Niche Scan', 'Scheduling', 'One full report'],
    postsInPeriod: 12,
    isSuggested: false,
    comingLaterLabel: null,
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '$1,500',
    priceUsd: 1500,
    days: 30,
    period: 'a month',
    summary: 'Daily posting on three platforms, with two remakes a week.',
    bestFor: 'A business with an account that posts rarely or generically.',
    includes: ['90 posts a month (3 a day)', '2 remakes a week', '3 platforms', 'Weekly ledger'],
    postsInPeriod: 90,
    isSuggested: true,
    comingLaterLabel: null,
  },
  {
    id: 'scale',
    name: 'Scale',
    price: '$3,000',
    priceUsd: 3000,
    days: 30,
    period: 'a month',
    summary: 'Twice the volume, daily remakes and a monthly call on what to do next.',
    bestFor: 'A business running more than one brand, or pushing volume.',
    includes: [
      '180 posts a month (6 a day)',
      'Daily remakes',
      'A/B hooks',
      'Monthly strategy call',
      'Portfolio view across brands',
    ],
    postsInPeriod: 180,
    isSuggested: false,
    comingLaterLabel: null,
  },
  {
    id: 'creator',
    name: 'Creator',
    price: '$499',
    priceUsd: 499,
    days: 30,
    period: 'a month',
    summary: 'For one person posting on two platforms, built around your own long-form.',
    bestFor: 'An individual — creator, expert or personal brand — with an audience already.',
    includes: ['~40 posts a month', '1 remake a week', '2 platforms', 'Weekly ledger'],
    postsInPeriod: 40,
    isSuggested: false,
    comingLaterLabel: null,
  },
  {
    id: 'studio',
    name: 'Studio',
    price: '$79',
    // There *is* a figure, unlike the old range — but it still gets no
    // per-day line, because a per-day price invites a comparison with
    // something you can buy today and this cannot be bought at all.
    priceUsd: null,
    days: 30,
    period: 'a month',
    summary:
      'The same engine at the smallest size. Not open yet: joining the waitlist is the only action, and there is nothing to pay.',
    bestFor: 'An individual starting an account from zero.',
    includes: ['From month 2: 60 posts a month', '4 created videos a month', 'You approve each post'],
    postsInPeriod: null,
    isSuggested: false,
    comingLaterLabel: 'Waitlist',
  },
]

/**
 * What a tier costs per day, to the nearest dollar, or `null` where the price
 * is a range.
 *
 * repurpose.io leads with the daily figure and puts the billed amount
 * underneath (docs/design/COMPETITOR_REFERENCES.md §2.5), which suits a
 * retainer: $1,500 a month is a decision, $50 a day is a comparison with the
 * hour of editing it replaces.
 *
 * Derived rather than written down. A second price typed by hand is a second
 * price that drifts, and a pricing page disagreeing with itself is worse than
 * one that never had the framing.
 *
 * Whole dollars, not cents: at $50 a day the cents are noise, where
 * repurpose.io's $1.17 genuinely needs them.
 */
export function perDayUsd(tier: PricingTier): number | null {
  if (tier.priceUsd === null) return null
  return Math.round(tier.priceUsd / tier.days)
}

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
