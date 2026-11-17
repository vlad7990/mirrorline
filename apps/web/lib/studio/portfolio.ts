/**
 * The portfolio view — 15 §4: "Scale-plan users with several brands get a
 * portfolio view across workspaces."
 *
 * One row per workspace, each with its own goal, because that is the point:
 * two brands on the same plan can be chasing different outcomes, and a
 * portfolio that forced them onto one KPI would be answering a question nobody
 * asked.
 *
 * **It rolls up, it does not average.** There is no single "portfolio health"
 * figure here and there will not be one. Averaging a leads goal against an
 * awareness goal produces a number that is not about anything.
 *
 * ## Why these three businesses are nothing like each other
 *
 * The first version of this list was three brands belonging to one coaching
 * business — the coach, her podcast and her workshops. Every figure was
 * correct and the screen still made the wrong argument: 16 §1 says the product
 * works for any business in any industry, and the one screen that shows more
 * than one business was showing three views of a single trade.
 *
 * **A demo client has to have an industry.** Businesses do, and a fictional
 * one with no trade would be the fake thing — `workspace.niche` exists because
 * Trend Scout researches a real niche. What was wrong was never that the demo
 * account is a coaching business; it is that it was the *only* one, so every
 * screenshot and every preview read as a coaching tool. The fix is plurality,
 * not neutrality by erasure.
 *
 * So: a coach chasing leads, a furniture maker chasing sales, and a plumber
 * chasing bookings. Three trades, three goals, three KPI sets. A test holds
 * the spread, because an edit that quietly made them one industry again would
 * pass every other check in the repo.
 *
 * The coaching brand is the signed-in workspace, named from the
 * `@mirrorline/mock` fixture rather than retyped, so the portfolio and every
 * other studio screen cannot disagree about which brand you are in.
 */

import { workspace } from '@mirrorline/mock'

import { type GoalKey } from '@/lib/audience/account-type'

export interface PortfolioBrand {
  readonly id: string
  readonly name: string
  /**
   * The brand's own trade, in its own words — the same free text onboarding
   * asks for (16 §1). On the card, so a reader can see at a glance that these
   * are unlike businesses and not just unlike names.
   */
  readonly niche: string
  readonly goalKey: GoalKey
  /** The goal in the user's own words, as it was typed in onboarding. */
  readonly outcome: string
  readonly headlineKpiName: string
  readonly current: number
  readonly target: number
  readonly unitLabel: string
  /** Connected social accounts for this brand. */
  readonly accountCount: number
  readonly postsThisWeek: number
  /**
   * Null while the brand is inside its 14-day baseline and has no target yet.
   * A brand measured against a target it has not been given would be measured
   * against nothing.
   */
  readonly periodElapsed: number | null
}

export const SAMPLE_PORTFOLIO: readonly PortfolioBrand[] = [
  {
    // The signed-in workspace. Named from the fixture, not retyped.
    id: 'brand-coaching',
    name: workspace.name,
    niche: workspace.niche,
    goalKey: 'leads',
    outcome: 'Get more customers from short video',
    headlineKpiName: 'Leads per week',
    current: 52,
    target: 120,
    unitLabel: 'leads',
    // The three the mock has connected. LinkedIn is not one of them.
    accountCount: 3,
    postsThisWeek: 21,
    periodElapsed: 6 / 13,
  },
  {
    // A product brand selling through a tracked link: the one goal the
    // coaching account cannot demonstrate, because it sells nothing online.
    id: 'brand-furniture',
    name: 'Rivet & Oak',
    niche: 'Handmade furniture',
    goalKey: 'sales',
    outcome: 'Sell more of the small pieces',
    headlineKpiName: 'Revenue from tracked links',
    current: 18_400,
    target: 45_000,
    unitLabel: 'dollars',
    accountCount: 2,
    postsThisWeek: 14,
    periodElapsed: 6 / 13,
  },
  {
    // A local service, and still inside its baseline: no target, so no
    // progress bar and no pace note.
    id: 'brand-plumbing',
    name: 'Brightwater Plumbing',
    niche: 'Plumbing and heating repairs',
    goalKey: 'bookings',
    outcome: 'Keep the diary full through winter',
    headlineKpiName: 'Bookings per week',
    current: 4,
    target: 0,
    unitLabel: 'bookings',
    accountCount: 1,
    postsThisWeek: 7,
    periodElapsed: null,
  },
]

/**
 * The brand the rest of the studio is showing.
 *
 * Matched on the fixture's own name rather than carried as a flag on the row:
 * a flag can be set on two rows, and then two screens disagree about where
 * you are. A test asserts the portfolio contains it.
 */
export function isCurrentBrand(brand: PortfolioBrand): boolean {
  return brand.name === workspace.name
}

/** 09 §Plans: the portfolio belongs to the Scale plan. */
export const PORTFOLIO_PLAN_NAME = 'Scale'

/**
 * True when this brand has finished its baseline and agreed a target.
 *
 * A guard rather than a `target > 0` check at each call site, so the rule —
 * no target, no progress bar — lives in one place and the screens cannot
 * disagree about it.
 */
export function hasAgreedTarget(brand: PortfolioBrand): boolean {
  return brand.periodElapsed !== null && brand.target > 0
}

/** Totals that are real sums rather than averages of unlike things. */
export const PORTFOLIO_TOTALS = {
  brands: SAMPLE_PORTFOLIO.length,
  accounts: SAMPLE_PORTFOLIO.reduce((sum, brand) => sum + brand.accountCount, 0),
  postsThisWeek: SAMPLE_PORTFOLIO.reduce((sum, brand) => sum + brand.postsThisWeek, 0),
} as const
