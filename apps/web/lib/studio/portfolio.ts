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
 */

import { type GoalKey } from '@/lib/audience/account-type'

export interface PortfolioBrand {
  readonly id: string
  readonly name: string
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
    id: 'brand-coaching',
    name: 'Maya Torres Coaching',
    goalKey: 'leads',
    outcome: 'Get more customers from short video',
    headlineKpiName: 'Leads per week',
    current: 52,
    target: 120,
    unitLabel: 'leads',
    accountCount: 3,
    postsThisWeek: 21,
    periodElapsed: 6 / 13,
  },
  {
    id: 'brand-show',
    name: 'Lead Without Burnout (the show)',
    goalKey: 'audience',
    outcome: 'Grow the show’s audience',
    headlineKpiName: 'Net new followers per week',
    current: 1_410,
    target: 5_000,
    unitLabel: 'followers',
    accountCount: 2,
    postsThisWeek: 14,
    periodElapsed: 6 / 13,
  },
  {
    // Inside its baseline: no target, so no progress bar and no pace note.
    id: 'brand-workshops',
    name: 'Manager Workshops',
    goalKey: 'bookings',
    outcome: 'Fill the Thursday workshops',
    headlineKpiName: 'Bookings per week',
    current: 4,
    target: 0,
    unitLabel: 'bookings',
    accountCount: 1,
    postsThisWeek: 7,
    periodElapsed: null,
  },
]

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
