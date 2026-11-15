/**
 * What changes on the dashboard when you change the goal.
 *
 * 19 v2 ★2 for /metrics: an interactive goal picker replacing the seven
 * static cards, where choosing a goal changes the KPI cards, the funnel and
 * the targets.
 *
 * **What changes is which KPIs lead, not what the numbers say.** That
 * distinction is the whole honesty of this section. One fictional account is
 * being previewed; picking "Audience growth" does not make it a different
 * account with different measurements, it decides which of its measurements
 * you are judged on. Generating a fresh set of flattering figures per goal
 * would be seven fictional accounts pretending to be one, and the section
 * says in plain words that this is what it is doing.
 *
 * **Every goal keeps a not-connected KPI and a projection** (15 §8). A demo
 * account that has not connected its booking tool has not connected it
 * whichever goal you preview, and a preview of nothing but healthy green
 * numbers would flatter us in the one direction non-negotiable 7 forbids. A
 * test asserts both are in all seven sets.
 */

import { GOALS } from '@/lib/audience/account-type'

export interface GoalView {
  /**
   * The four KPI keys this goal leads with, in order.
   *
   * Keys into `SAMPLE_KPIS`, so a goal cannot name a KPI the sample account
   * does not have — a test checks every one of them resolves.
   */
  readonly kpiKeys: readonly string[]
  /** Where this goal's targets come from. Always a proposal (15 §1). */
  readonly targetBasis: string
  /**
   * The funnel step this goal is judged at.
   *
   * The funnel is the same five steps whatever the goal; what moves is where
   * the line is drawn, because awareness is judged at the top of it and
   * bookings at the bottom.
   */
  readonly funnelStep: string
}

/**
 * The not-connected card, in every set.
 *
 * `bookings` has no source wired in the fixture, so it reads "Not connected"
 * and offers a button rather than printing a zero somebody could mistake for
 * a measurement.
 */
export const NOT_CONNECTED_KEY = 'bookings'

/** The projection — dashed and labelled — in every set. */
export const PROJECTED_KEY = 'cost_per_lead'

export const GOAL_VIEWS: Readonly<Record<string, GoalView>> = {
  leads: {
    kpiKeys: ['leads', 'three_second_hold', NOT_CONNECTED_KEY, PROJECTED_KEY],
    targetBasis: 'your 14-day baseline, then your niche’s benchmark for enquiries',
    funnelStep: 'Leads',
  },
  bookings: {
    kpiKeys: ['leads', 'posts_published', NOT_CONNECTED_KEY, PROJECTED_KEY],
    targetBasis: 'your 14-day baseline and the share of enquiries you usually convert',
    funnelStep: 'Bookings',
  },
  sales: {
    kpiKeys: ['leads', 'sends_per_1k', NOT_CONNECTED_KEY, PROJECTED_KEY],
    targetBasis: 'tracked-link revenue across your baseline fortnight',
    funnelStep: 'Bookings',
  },
  audience: {
    kpiKeys: ['net_followers', 'sends_per_1k', NOT_CONNECTED_KEY, PROJECTED_KEY],
    targetBasis: 'your own follower growth over fourteen days, not a niche average',
    funnelStep: 'Profile visits',
  },
  awareness: {
    kpiKeys: ['net_followers', 'three_second_hold', NOT_CONNECTED_KEY, PROJECTED_KEY],
    targetBasis: 'unique reach in your baseline fortnight',
    funnelStep: 'Views',
  },
  community: {
    kpiKeys: ['sends_per_1k', 'three_second_hold', NOT_CONNECTED_KEY, PROJECTED_KEY],
    targetBasis: 'sends and saves per 1,000 reach in your baseline fortnight',
    funnelStep: 'Profile visits',
  },
  launch: {
    kpiKeys: ['posts_published', 'net_followers', NOT_CONNECTED_KEY, PROJECTED_KEY],
    targetBasis: 'what accounts starting from zero in your niche reached in 90 days',
    funnelStep: 'Views',
  },
}

/** The goal keys, in the order 13 §1 lists them. */
export const GOAL_KEYS: readonly string[] = GOALS.map((goal) => goal.key)
